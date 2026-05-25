"""
Patch ciblé — fetch uniquement les saisons avec Bullets (WAS) et Bobcats (CHA)
manquantes du run précédent car les mappings n'existaient pas encore.

Appende les résultats à data/standings.json existant.

Run: python3 scripts/fetch-standings-patch.py
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
    # Bullets era (1980-81 → 1996-97)
    "1980-81", "1981-82", "1982-83", "1983-84", "1984-85",
    "1985-86", "1986-87", "1987-88", "1988-89", "1989-90",
    "1990-91", "1991-92", "1992-93", "1993-94", "1994-95",
    "1995-96", "1996-97",
    # Bobcats era (2004-05 → 2013-14)
    "2004-05", "2005-06", "2006-07", "2007-08",
    "2008-09", "2009-10", "2010-11", "2011-12", "2012-13", "2013-14",
]

OUTPUT_FILE = Path(__file__).parent / "data" / "standings.json"
SLEEP = 1.5

TEAM_NAME_TO_ABBR = {
    "Bullets": "WAS",
    "Bobcats": "CHA",
}


def fetch_patch_rows(season: str) -> list[dict]:
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
            continue  # on ne s'intéresse qu'aux équipes manquantes

        wins = int(row.get("WINS", 0) or 0)
        losses = int(row.get("LOSSES", 0) or 0)
        conf_rank = int(row.get("PlayoffRank", 0) or 0)
        rows.append({
            "team_abbr": abbr,
            "season": season,
            "wins": wins,
            "losses": losses,
            "conference_rank": conf_rank,
            "playoff_result": None,
        })

    print(f"{len(rows)} ligne(s)")
    return rows


def main():
    # Charger le fichier existant
    existing: list[dict] = []
    if OUTPUT_FILE.exists():
        existing = json.loads(OUTPUT_FILE.read_text())
    print(f"📄 {len(existing)} lignes existantes dans standings.json\n")

    patch_rows: list[dict] = []
    for season in SEASONS:
        try:
            rows = fetch_patch_rows(season)
            patch_rows.extend(rows)
        except Exception as e:
            print(f"ERREUR {season}: {e}")

    # Dédupliquer : supprimer les anciennes entrées pour team/saison patchées
    patch_keys = {(r["team_abbr"], r["season"]) for r in patch_rows}
    cleaned = [r for r in existing if (r["team_abbr"], r["season"]) not in patch_keys]
    merged = cleaned + patch_rows

    OUTPUT_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=2))
    print(f"\n✅ {len(patch_rows)} lignes patchées → {len(merged)} total dans standings.json")


if __name__ == "__main__":
    main()
