"""
Sprint 11 — Import historique playoffs (séries) 1980-81 → 2014-15

Sources :
  • nba_api CommonPlayoffSeries → paires d'équipes + round
  • ESPN scoreboard              → wins, completed, summary
  • nba_api static teams         → ID → abbreviation DB

Logique de round :
  • 2001-02+ : SERIES_ID[-2] = round (1=First Round, 2=Semis, 3=Conf Finals, 4=Finals)
  • Pré-2001  : ancien format (SERIES_ID[-2] = 0 toujours) → reconstitution par paires
                depuis les lignes de jeux, triées par premier GAME_ID.
                Bracket 16 équipes (1983-84+) : 8+4+2+1 = 15 séries
                Bracket 12 équipes (1980-81→1982-83) : 4+4+2+1 = 11 séries

Output : scripts/data/playoff-history.json

Run: python3 scripts/fetch-playoff-history.py
     python3 scripts/fetch-playoff-history.py --from 1984-85 --to 1990-91
"""

import argparse
import json
import re
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

try:
    from nba_api.stats.endpoints import commonplayoffseries
    from nba_api.stats.static import teams as nba_teams_static
except ImportError:
    print("❌  nba_api non installé. Lance: pip install nba_api")
    raise SystemExit(1)

DEFAULT_FROM = "1980-81"
DEFAULT_TO   = "2014-15"

OUTPUT_DIR  = Path(__file__).parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "playoff-history.json"

SLEEP_NBA = 2.0   # délai entre appels nba_api
SLEEP_ESPN = 1.0  # délai entre appels ESPN

# Saison à partir de laquelle le nouveau format SERIES_ID fonctionne
NEW_FORMAT_FROM = "2001-02"

# ---------------------------------------------------------------------------
# Mapping équipes
# ---------------------------------------------------------------------------

# nba_api team ID → abbr DB (franchise actuelle)
NBA_ID_TO_DB: dict[int, str] = {
    t["id"]: t["abbreviation"]
    for t in nba_teams_static.get_teams()
}

# ESPN team ID → abbr DB pour les équipes sans abbreviation dans les vieilles données ESPN
ESPN_ID_TO_DB: dict[str, str] = {
    "1":  "ATL",  # Atlanta Hawks
    "23": "SAC",  # Kansas City Kings / Sacramento Kings
    "26": "UTA",  # Utah Jazz (New Orleans puis Utah)
    "27": "WAS",  # Washington Bullets / Wizards
}

# Corrections pour franchises qui ont bougé (ESPN utilise les abbrs historiques)
ESPN_TO_DB: dict[str, str] = {
    "SA":   "SAS",
    "GS":   "GSW",
    "NY":   "NYK",
    "UTAH": "UTA",
    "NO":   "NOP",
    "NOH":  "NOP",
    "NOK":  "NOP",
    "WSH":  "WAS",
    "NJ":   "BKN",
    "NJN":  "BKN",
    "BKN":  "BKN",
    "CHA":  "CHA",
    "CHH":  "CHA",
    "CHB":  "CHA",
    # Franchises disparues → même franchise pour l'historique
    "SEA":  "OKC",   # SuperSonics → Thunder
    "VAN":  None,    # Vancouver Grizzlies (MEM = franchise différente) → skip
}

def normalize_espn(abbr: str) -> str | None:
    """Normalise une abréviation ESPN vers l'abbr DB. None = ignorer."""
    if abbr in ESPN_TO_DB:
        return ESPN_TO_DB[abbr]
    return abbr

# Conférences actuelles (stables depuis 1980)
WEST: set[str] = {"GSW", "HOU", "SAS", "PHX", "DEN", "UTA", "DAL", "MEM",
                   "POR", "OKC", "MIN", "NOP", "SAC", "LAC", "LAL"}
EAST: set[str] = {"BOS", "MIA", "CHI", "CLE", "NYK", "MIL", "IND", "ATL",
                   "PHI", "DET", "ORL", "WAS", "BKN", "TOR", "CHA"}

def get_conference(a1: str, a2: str) -> str:
    if a1 in WEST and a2 in WEST:
        return "WEST"
    if a1 in EAST and a2 in EAST:
        return "EAST"
    return "FINALS"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def season_range(from_s: str, to_s: str) -> list[str]:
    def year(s: str) -> int:
        return int(s.split("-")[0])
    seasons = []
    for y in range(year(from_s), year(to_s) + 1):
        seasons.append(f"{y}-{str(y + 1)[-2:]}")
    return seasons


def season_gte(s: str, ref: str) -> bool:
    return int(s.split("-")[0]) >= int(ref.split("-")[0])


def espn_date_range(season: str, end_year: int) -> str:
    if season == "2019-20":
        return f"{end_year}0801-{end_year}1015"
    if season == "2020-21":
        return f"{end_year}0419-{end_year}0731"
    return f"{end_year}0401-{end_year}0720"  # large fenêtre pour couvrir tous les formats


def fetch_espn(season: str, end_year: int) -> list[dict]:
    """Récupère tous les matchs playoff ESPN pour une saison."""
    start_year = end_year - 1
    dates = espn_date_range(season, end_year)
    url = (
        f"https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
        f"?seasontype=3&season={start_year}&dates={dates}&limit=500"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read())
    return data.get("events", [])


def parse_series_summary(summary: str) -> tuple[str | None, int, int]:
    """
    Parse 'BOS wins series 4-2' ou 'LAL lead series 3-0'
    → (winner_espn_abbr_or_None, winner_wins, loser_wins)
    """
    m = re.match(r"^\s*(\w+)\s+(?:wins?|leads?)\s+series\s+(\d+)-(\d+)", summary, re.I)
    if m:
        return m.group(1), int(m.group(2)), int(m.group(3))
    return None, 0, 0


def is_series_done(w_winner: int, w_loser: int) -> bool:
    """
    Retourne True si une série est terminée.
    Best-of-7 : 4 victoires. Best-of-5 (premier tour pré-2003) : 3 victoires.
    Best-of-3 (pré-1984) : 2 victoires.
    """
    if w_winner >= 4:
        return True
    if w_winner >= 3 and w_loser <= 2:
        return True  # best-of-5
    if w_winner >= 2 and w_loser <= 1:
        return True  # best-of-3
    return False


def assign_rounds_old_format(series_with_min_gid: list[tuple[int, frozenset]]) -> dict[frozenset, int]:
    """
    Pour le vieux format pré-2001 : assigne les rounds par ordre de premier GAME_ID.
    series_with_min_gid : liste de (min_game_id, pair_frozenset)
    Retourne : dict pair → round
    """
    sorted_series = sorted(series_with_min_gid, key=lambda x: x[0])
    total = len(sorted_series)

    # Bracket 12 équipes (1980-81 → 1982-83) : 4+4+2+1 = 11 séries
    # Bracket 16 équipes (1983-84+)           : 8+4+2+1 = 15 séries
    if total <= 11:
        cuts = [4, 8, 10, 11]  # fin de chaque round
    else:
        cuts = [8, 12, 14, 15]

    result: dict[frozenset, int] = {}
    for i, (_, pair) in enumerate(sorted_series):
        if i < cuts[0]:
            rnd = 1
        elif i < cuts[1]:
            rnd = 2
        elif i < cuts[2]:
            rnd = 3
        else:
            rnd = 4
        result[pair] = rnd
    return result


# ---------------------------------------------------------------------------
# Fetch une saison
# ---------------------------------------------------------------------------

def fetch_season(season: str) -> list[dict]:
    start_year = int(season.split("-")[0])
    end_year = start_year + 1
    print(f"  {season}…", end=" ", flush=True)

    # ── 1. nba_api : paires d'équipes + rounds ──────────────────────────────
    try:
        r = commonplayoffseries.CommonPlayoffSeries(
            season=season,
            timeout=60,
        )
        df = r.get_data_frames()[0]
        time.sleep(SLEEP_NBA)
    except Exception as e:
        print(f"nba_api ERREUR: {e}")
        return []

    # Choisir la stratégie de décodage selon l'ère
    nba_series: dict[frozenset, int] = {}  # frozenset({id1, id2}) → round

    if season_gte(season, NEW_FORMAT_FROM):
        # Nouveau format : SERIES_ID[-2] = round
        for _, row in df.iterrows():
            sid = str(row["SERIES_ID"])
            rnd = int(sid[-2])
            if rnd == 0:
                continue
            home_id = int(row["HOME_TEAM_ID"])
            visit_id = int(row["VISITOR_TEAM_ID"])
            pair = frozenset({home_id, visit_id})
            nba_series[pair] = rnd
    else:
        # Ancien format : reconstruire les séries depuis les lignes de jeux
        # Chaque ligne = un match ; grouper par paire d'équipes (frozenset)
        games_by_pair: dict[frozenset, list[int]] = defaultdict(list)
        for _, row in df.iterrows():
            home_id = int(row["HOME_TEAM_ID"])
            visit_id = int(row["VISITOR_TEAM_ID"])
            game_id = int(row["GAME_ID"])
            pair = frozenset({home_id, visit_id})
            games_by_pair[pair].append(game_id)

        # Assigner les rounds par ordre chronologique (premier GAME_ID)
        series_with_min = [(min(gids), pair) for pair, gids in games_by_pair.items()]
        nba_series = assign_rounds_old_format(series_with_min)

    # ── 2. ESPN : wins, completed, summary ──────────────────────────────────
    try:
        events = fetch_espn(season, end_year)
        time.sleep(SLEEP_ESPN)
    except Exception as e:
        print(f"ESPN ERREUR: {e}")
        return []

    # Grouper les events par paire d'équipes ESPN (abbr normalisés)
    # On garde le dernier event par paire (plus récent = état final de la série)
    espn_series: dict[tuple, dict] = {}
    for event in events:
        if "competitions" not in event:
            continue
        comp = event["competitions"][0]
        competitors = comp.get("competitors", [])
        if len(competitors) != 2:
            continue
        abbrs = []
        for c in competitors:
            team = c.get("team", {})
            raw = team.get("abbreviation", "")
            if not raw:
                # Fallback pour les vieilles données ESPN sans abbreviation
                raw = ESPN_ID_TO_DB.get(team.get("id", ""), "")
            if not raw:
                break
            db = normalize_espn(raw)
            if db is None:  # franchise disparue → skip
                break
            abbrs.append(db)
        if len(abbrs) != 2:
            continue
        key = tuple(sorted(abbrs))

        series_obj = comp.get("series", {})
        espn_series[key] = {
            "summary": series_obj.get("summary", ""),
            "completed": series_obj.get("completed", False),
            "espn_series_competitors": {
                sc["id"]: sc["wins"]
                for sc in series_obj.get("competitors", [])
            },
            "espn_competitor_ids": {
                normalize_espn(
                    c["team"].get("abbreviation", "")
                    or ESPN_ID_TO_DB.get(c["team"].get("id", ""), "")
                ): c["id"]
                for c in competitors
                if normalize_espn(
                    c["team"].get("abbreviation", "")
                    or ESPN_ID_TO_DB.get(c["team"].get("id", ""), "")
                ) is not None
                and (
                    c["team"].get("abbreviation", "")
                    or ESPN_ID_TO_DB.get(c["team"].get("id", ""), "")
                )
            },
        }

    # ── 3. Cross-reference nba_api ↔ ESPN → construire les séries ──────────
    results = []
    seen_espn_keys: set[tuple] = set()

    for nba_pair, rnd in nba_series.items():
        ids = list(nba_pair)
        abbr_a = NBA_ID_TO_DB.get(ids[0])
        abbr_b = NBA_ID_TO_DB.get(ids[1])
        if not abbr_a or not abbr_b:
            continue

        espn_key = tuple(sorted([abbr_a, abbr_b]))
        if espn_key in seen_espn_keys:
            continue
        seen_espn_keys.add(espn_key)

        espn = espn_series.get(espn_key, {})
        summary = espn.get("summary", "")
        completed = espn.get("completed", False)
        espn_wins = espn.get("espn_series_competitors", {})
        espn_ids = espn.get("espn_competitor_ids", {})

        # Récupérer les wins depuis ESPN (via IDs ESPN)
        id_a = espn_ids.get(abbr_a)
        id_b = espn_ids.get(abbr_b)
        wins_a = espn_wins.get(id_a, 0) if id_a else 0
        wins_b = espn_wins.get(id_b, 0) if id_b else 0

        # Fallback : parser depuis le summary
        if wins_a == 0 and wins_b == 0 and summary:
            winner_espn, w1, w2 = parse_series_summary(summary)
            if winner_espn:
                winner_db = normalize_espn(winner_espn)
                if winner_db == abbr_a:
                    wins_a, wins_b = w1, w2
                elif winner_db == abbr_b:
                    wins_b, wins_a = w1, w2
                else:
                    wins_a, wins_b = w1, w2

        # Inférer complétion depuis le score si ESPN ne le sait pas
        max_wins = max(wins_a, wins_b)
        if not completed and is_series_done(max_wins, min(wins_a, wins_b)):
            completed = True

        conference = get_conference(abbr_a, abbr_b)

        # team1 = vainqueur (plus de victoires)
        if wins_b > wins_a:
            abbr_a, abbr_b = abbr_b, abbr_a
            wins_a, wins_b = wins_b, wins_a

        results.append({
            "season": season,
            "conference": conference,
            "round": rnd,
            "team1_abbr": abbr_a,
            "team2_abbr": abbr_b,
            "team1_wins": wins_a,
            "team2_wins": wins_b,
            "completed": completed,
            "summary": summary or None,
        })

    print(f"{len(results)} séries")
    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from", dest="from_season", default=DEFAULT_FROM)
    parser.add_argument("--to", dest="to_season", default=DEFAULT_TO)
    args = parser.parse_args()

    seasons = season_range(args.from_season, args.to_season)
    OUTPUT_DIR.mkdir(exist_ok=True)

    existing: list[dict] = []
    if OUTPUT_FILE.exists():
        existing = json.loads(OUTPUT_FILE.read_text())
        print(f"📄 {len(existing)} entrées existantes dans {OUTPUT_FILE.name}")

    existing_keys = {
        (r["season"], r["conference"], r["round"], r["team1_abbr"], r["team2_abbr"])
        for r in existing
    }

    all_rows = list(existing)
    failed: list[str] = []

    print(f"\n🏀 Fetch playoffs {args.from_season} → {args.to_season} ({len(seasons)} saisons)\n")

    for season in seasons:
        try:
            rows = fetch_season(season)
            new = [
                r for r in rows
                if (r["season"], r["conference"], r["round"], r["team1_abbr"], r["team2_abbr"])
                not in existing_keys
            ]
            all_rows.extend(new)
            for r in new:
                existing_keys.add((r["season"], r["conference"], r["round"], r["team1_abbr"], r["team2_abbr"]))
        except Exception as e:
            print(f"ERREUR {season}: {e}")
            failed.append(season)
            time.sleep(5)

    OUTPUT_FILE.write_text(json.dumps(all_rows, ensure_ascii=False, indent=2))
    print(f"\n✅ {len(all_rows)} séries totales dans {OUTPUT_FILE.name}")
    if failed:
        print(f"⚠️  Saisons échouées : {', '.join(failed)}")
        print(f"   Relance: python3 {__file__} --from {failed[0]} --to {failed[-1]}")


if __name__ == "__main__":
    main()
