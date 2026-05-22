"""
Sprint 2.4 (rev) — Standings équipes via nba_api (remplace balldontlie standings)

Output : scripts/data/standings.json

Prérequis:
  pip install nba_api

Run: python3 scripts/fetch-standings.py
"""

import json
import time
from pathlib import Path

try:
    from nba_api.stats.endpoints import leaguestandingsv3
except ImportError:
    print("❌  nba_api non installé. Lance: pip install nba_api")
    raise SystemExit(1)

SEASONS = [
    "2015-16", "2016-17", "2017-18", "2018-19", "2019-20",
    "2020-21", "2021-22", "2022-23", "2023-24", "2024-25",
]

OUTPUT_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "standings.json"

SLEEP = 2.0

# TeamName (nba_api) → abbr 3 lettres (notre DB)
TEAM_NAME_TO_ABBR: dict[str, str] = {
    "Celtics": "BOS", "Nets": "BKN", "Knicks": "NYK", "76ers": "PHI", "Raptors": "TOR",
    "Bulls": "CHI", "Cavaliers": "CLE", "Pistons": "DET", "Pacers": "IND", "Bucks": "MIL",
    "Hawks": "ATL", "Hornets": "CHA", "Heat": "MIA", "Magic": "ORL", "Wizards": "WAS",
    "Nuggets": "DEN", "Timberwolves": "MIN", "Thunder": "OKC", "Trail Blazers": "POR", "Jazz": "UTA",
    "Warriors": "GSW", "Clippers": "LAC", "Lakers": "LAL", "Suns": "PHX", "Kings": "SAC",
    "Mavericks": "DAL", "Rockets": "HOU", "Grizzlies": "MEM", "Pelicans": "NOP", "Spurs": "SAS",
}


def safe_int(val, default=0) -> int:
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def safe_float(val) -> float | None:
    try:
        f = float(val)
        return None if f != f else round(f, 4)
    except (TypeError, ValueError):
        return None


def fetch_season_standings(season: str) -> list[dict]:
    print(f"  {season}… ", end="", flush=True)

    response = leaguestandingsv3.LeagueStandingsV3(
        season=season,
        season_type="Regular Season",
        timeout=90,
    )
    df = response.get_data_frames()[0]
    time.sleep(SLEEP)

    rows = []
    for _, row in df.iterrows():
        team_name = str(row.get("TeamName", ""))
        abbr = TEAM_NAME_TO_ABBR.get(team_name)
        if not abbr:
            print(f"\n  ⚠️  TeamName inconnu: {repr(team_name)}")
            continue

        # conference_rank depuis PlayoffRank (rang conférence)
        conf_rank = safe_int(row.get("PlayoffRank", 0))

        # Playoff result (peut être vide en saison en cours)
        playoff_result = str(row.get("ClinchIndicator", "")) or None
        if playoff_result in ("None", "", "nan", " "):
            playoff_result = None

        rows.append({
            "team_abbr": abbr,
            "season": season,
            "wins": safe_int(row.get("WINS")),
            "losses": safe_int(row.get("LOSSES")),
            "conference_rank": conf_rank,
            "playoff_result": playoff_result,
        })

    print(f"{len(rows)} équipes")
    return rows


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    all_rows: list[dict] = []
    failed: list[str] = []

    print("🏆 Fetch standings équipes (nba_api)…\n")

    for season in SEASONS:
        try:
            rows = fetch_season_standings(season)
            all_rows.extend(rows)
        except Exception as e:
            print(f"ERREUR: {e}")
            failed.append(season)
            time.sleep(5)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, ensure_ascii=False, indent=2)

    print(f"\n✅ {len(all_rows)} lignes sauvegardées dans {OUTPUT_FILE}")
    if failed:
        print(f"⚠️  Saisons échouées : {', '.join(failed)}")


if __name__ == "__main__":
    main()
