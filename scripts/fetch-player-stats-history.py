"""
Sprint 11 — Import historique stats joueurs via nba_api

Stratégie hybride :
  • 1980-81 à 1995-96 → LeagueLeaders (top ~160-200 joueurs/saison, toutes les stars)
  • 1996-97 à 2014-15 → LeagueDashPlayerStats (tous les ~440 joueurs/saison)

Les saisons 2015-16+ sont déjà en DB via d'autres scripts.

Output : scripts/data/player-stats-history.json

Format de sortie par entrée :
  {
    "nba_player_id": 893,
    "first_name": "Michael",
    "last_name": "Jordan",
    "season": "1984-85",
    "team_abbr": "CHI",
    "games_played": 82,
    "minutes_per_game": 38.3,
    "points_per_game": 28.2,
    "rebounds_per_game": 6.5,
    "assists_per_game": 5.9,
    "steals_per_game": 2.4,
    "blocks_per_game": 1.0,
    "fg_pct": 0.515,
    "three_pt_pct": null,
    "ft_pct": 0.845
  }

Run: python3 scripts/fetch-player-stats-history.py
     python3 scripts/fetch-player-stats-history.py --from 1996-97 --to 2000-01
"""

import argparse
import json
import time
from pathlib import Path

try:
    from nba_api.stats.endpoints import leaguedashplayerstats, leagueleaders
except ImportError:
    print("❌  nba_api non installé. Lance: pip install nba_api")
    raise SystemExit(1)

# Saisons à fetcher (du plus ancien au plus récent)
DEFAULT_FROM = "1980-81"
DEFAULT_TO = "2014-15"

# LeagueDashPlayerStats disponible à partir de cette saison
DASH_START_SEASON = "1996-97"

OUTPUT_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "player-stats-history.json"

SLEEP = 2.0  # délai entre chaque requête API

# ---------------------------------------------------------------------------
# Mapping abréviations nba_api → abbr DB
# Couvre les deux endpoints (LeagueLeaders + LeagueDashPlayerStats)
# ---------------------------------------------------------------------------
NBA_API_TO_DB: dict[str, str | None] = {
    # Golden State Warriors
    "GOS": "GSW",
    # San Antonio Spurs
    "SAN": "SAS",
    # Utah Jazz
    "UTH": "UTA",
    # Philadelphia 76ers
    "PHL": "PHI",
    # Kansas City Kings → Sacramento Kings (1985)
    "KCK": "SAC",
    # San Diego Clippers → Los Angeles Clippers (1984)
    "SDC": "LAC",
    # New Jersey Nets → Brooklyn Nets
    "NJN": "BKN",
    "NJ": "BKN",
    # New Orleans Hornets → Pelicans
    "NOH": "NOP",
    # New Orleans/OKC Hornets (saison Katrina)
    "NOK": "NOP",
    # Charlotte Hornets (original 1988)
    "CHH": "CHA",
    # Charlotte Bobcats
    "CHB": "CHA",
    # Washington Bullets (ancienne abbr nba_api)
    "WSB": "WAS",
    # Abréviations courtes parfois retournées
    "NO": "NOP",
    "GS": "GSW",
    "SA": "SAS",
    "NY": "NYK",
    "UTAH": "UTA",
    # Vancouver Grizzlies → disparus (Memphis Grizzlies = MEM)
    "VAN": None,
    # Seattle SuperSonics → OKC Thunder (mais franchise diff → skip stats pré-OKC)
    "SEA": None,
}

# Équipes dont on ignore les entrées (franchises véritablement disparues)
# KCK (→ SAC) et SDC (→ LAC) sont gérées via NBA_API_TO_DB, pas skipées
SKIP_ABBRS: set[str] = {"VAN", "SEA"}


def season_range(from_season: str, to_season: str) -> list[str]:
    """Génère la liste des saisons entre from et to inclus."""
    def year(s: str) -> int:
        return int(s.split("-")[0])

    seasons = []
    for start_year in range(year(from_season), year(to_season) + 1):
        end_yy = str(start_year + 1)[-2:]
        seasons.append(f"{start_year}-{end_yy}")
    return seasons


def season_gte(a: str, b: str) -> bool:
    """True si saison a >= saison b (ex: '1996-97' >= '1996-97')."""
    return int(a.split("-")[0]) >= int(b.split("-")[0])


def split_name(full_name: str) -> tuple[str, str]:
    parts = full_name.strip().split(" ", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return parts[0], ""


def safe_float(val) -> float | None:
    try:
        f = float(val)
        return None if f != f else round(f, 4)
    except (TypeError, ValueError):
        return None


def normalize_abbr(raw: str) -> str | None:
    """Normalise une abréviation nba_api vers l'abbr DB. Retourne None si à ignorer."""
    if raw in SKIP_ABBRS:
        return None
    mapped = NBA_API_TO_DB.get(raw)
    if mapped is None and raw in NBA_API_TO_DB:
        # Explicitly mapped to None → ignore
        return None
    return mapped if mapped is not None else raw


def fetch_season_dash(season: str) -> list[dict]:
    """
    LeagueDashPlayerStats — disponible depuis 1996-97.
    Retourne tous les joueurs (~440/saison).
    """
    response = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        per_mode_detailed="PerGame",
        season_type_all_star="Regular Season",
        timeout=90,
    )
    df = response.get_data_frames()[0]
    time.sleep(SLEEP)

    rows = []
    for _, row in df.iterrows():
        team_abbr_raw = str(row.get("TEAM_ABBREVIATION", ""))
        team_abbr = normalize_abbr(team_abbr_raw)
        if team_abbr is None:
            continue

        player_id = int(row.get("PLAYER_ID", 0))
        player_name = str(row.get("PLAYER_NAME", ""))
        first_name, last_name = split_name(player_name)

        gp = int(row.get("GP", 0) or 0)
        if gp == 0:
            continue

        rows.append({
            "nba_player_id": player_id,
            "first_name": first_name,
            "last_name": last_name,
            "season": season,
            "team_abbr": team_abbr,
            "games_played": gp,
            "minutes_per_game": safe_float(row.get("MIN")),
            "points_per_game": safe_float(row.get("PTS")),
            "rebounds_per_game": safe_float(row.get("REB")),
            "assists_per_game": safe_float(row.get("AST")),
            "steals_per_game": safe_float(row.get("STL")),
            "blocks_per_game": safe_float(row.get("BLK")),
            "fg_pct": safe_float(row.get("FG_PCT")),
            "three_pt_pct": safe_float(row.get("FG3_PCT")),
            "ft_pct": safe_float(row.get("FT_PCT")),
        })

    return rows


def fetch_season_leaders(season: str) -> list[dict]:
    """
    LeagueLeaders — remonte jusqu'à 1980-81.
    Retourne les top ~160-200 joueurs (toutes les stars incluses).
    """
    response = leagueleaders.LeagueLeaders(
        season=season,
        per_mode48="PerGame",
        season_type_all_star="Regular Season",
        timeout=90,
    )
    df = response.get_data_frames()[0]
    time.sleep(SLEEP)

    rows = []
    for _, row in df.iterrows():
        team_abbr_raw = str(row.get("TEAM", ""))
        team_abbr = normalize_abbr(team_abbr_raw)
        if team_abbr is None:
            continue

        player_id = int(row.get("PLAYER_ID", 0))
        player_name = str(row.get("PLAYER", ""))
        first_name, last_name = split_name(player_name)

        gp = int(row.get("GP", 0) or 0)
        if gp == 0:
            continue

        rows.append({
            "nba_player_id": player_id,
            "first_name": first_name,
            "last_name": last_name,
            "season": season,
            "team_abbr": team_abbr,
            "games_played": gp,
            "minutes_per_game": safe_float(row.get("MIN")),
            "points_per_game": safe_float(row.get("PTS")),
            "rebounds_per_game": safe_float(row.get("REB")),
            "assists_per_game": safe_float(row.get("AST")),
            "steals_per_game": safe_float(row.get("STL")),
            "blocks_per_game": safe_float(row.get("BLK")),
            "fg_pct": safe_float(row.get("FG_PCT")),
            "three_pt_pct": safe_float(row.get("FG3_PCT")),
            "ft_pct": safe_float(row.get("FT_PCT")),
        })

    return rows


def fetch_season(season: str) -> list[dict]:
    """Dispatche vers le bon endpoint selon la saison."""
    print(f"  {season}… ", end="", flush=True)

    if season_gte(season, DASH_START_SEASON):
        rows = fetch_season_dash(season)
        src = "dash"
    else:
        rows = fetch_season_leaders(season)
        src = "leaders"

    print(f"{len(rows)} joueurs [{src}]")
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from", dest="from_season", default=DEFAULT_FROM)
    parser.add_argument("--to", dest="to_season", default=DEFAULT_TO)
    args = parser.parse_args()

    seasons = season_range(args.from_season, args.to_season)
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Charger le fichier existant si présent (pour append idempotent)
    existing: list[dict] = []
    if OUTPUT_FILE.exists():
        existing = json.loads(OUTPUT_FILE.read_text())
        print(f"📄 {len(existing)} entrées existantes dans {OUTPUT_FILE.name}")

    existing_keys = {(r["nba_player_id"], r["season"], r["team_abbr"]) for r in existing}

    all_rows = list(existing)
    failed: list[str] = []

    print(f"\n🏀 Fetch stats joueurs {args.from_season} → {args.to_season} ({len(seasons)} saisons)\n")

    for season in seasons:
        try:
            rows = fetch_season(season)
            new_rows = [
                r for r in rows
                if (r["nba_player_id"], r["season"], r["team_abbr"]) not in existing_keys
            ]
            all_rows.extend(new_rows)
            for r in new_rows:
                existing_keys.add((r["nba_player_id"], r["season"], r["team_abbr"]))
        except Exception as e:
            print(f"ERREUR {season}: {e}")
            failed.append(season)
            time.sleep(5)

    OUTPUT_FILE.write_text(json.dumps(all_rows, ensure_ascii=False, indent=2))

    print(f"\n✅ {len(all_rows)} entrées totales dans {OUTPUT_FILE.name}")
    if failed:
        print(f"⚠️  Saisons échouées : {', '.join(failed)}")
        print(f"   Relance: python3 {__file__} --from {failed[0]} --to {failed[-1]}")


if __name__ == "__main__":
    main()
