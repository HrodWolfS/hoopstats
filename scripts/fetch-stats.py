"""
Sprint 2.2 (rev) — Stats joueurs via nba_api (remplace balldontlie season_averages)

Fetche base stats + advanced stats pour chaque saison, merge les deux, output JSON.
Output : scripts/data/player-stats.json

Prérequis:
  pip install nba_api

Run: python3 scripts/fetch-stats.py

Durée estimée: ~20 min (2 req/sec, soyons polis avec stats.nba.com)
"""

import json
import time
from pathlib import Path

try:
    from nba_api.stats.endpoints import leaguedashplayerstats
except ImportError:
    print("❌  nba_api non installé. Lance: pip install nba_api")
    raise SystemExit(1)

SEASONS = [
    "2015-16", "2016-17", "2017-18", "2018-19", "2019-20",
    "2020-21", "2021-22", "2022-23", "2023-24", "2024-25",
]

OUTPUT_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "player-stats.json"

SLEEP = 2.0  # secondes entre chaque requête


def safe_float(val) -> float | None:
    try:
        f = float(val)
        return None if f != f else round(f, 4)  # NaN check
    except (TypeError, ValueError):
        return None


def safe_int(val) -> int:
    try:
        return int(val)
    except (TypeError, ValueError):
        return 0


def fetch_season(season: str) -> list[dict]:
    """Fetche base + advanced, merge sur (PLAYER_ID, TEAM_ID)."""
    print(f"  {season}… ", end="", flush=True)

    # ── Base stats ──────────────────────────────────────────────────────────
    base_response = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star="Regular Season",
        measure_type_detailed_defense="Base",
        per_mode_simple="PerGame",
        timeout=90,
    )
    base_df = base_response.get_data_frames()[0]
    time.sleep(SLEEP)

    # ── Advanced stats ───────────────────────────────────────────────────────
    adv_response = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star="Regular Season",
        measure_type_detailed_defense="Advanced",
        per_mode_simple="PerGame",
        timeout=90,
    )
    adv_df = adv_response.get_data_frames()[0]
    time.sleep(SLEEP)

    # ── Merge sur (PLAYER_ID, TEAM_ID) ──────────────────────────────────────
    adv_map: dict[tuple, dict] = {}
    for _, row in adv_df.iterrows():
        key = (int(row["PLAYER_ID"]), str(row.get("TEAM_ABBREVIATION", "")))
        adv_map[key] = row.to_dict()

    rows = []
    for _, row in base_df.iterrows():
        player_id = int(row["PLAYER_ID"])
        team_abbr = str(row.get("TEAM_ABBREVIATION", ""))
        key = (player_id, team_abbr)
        adv = adv_map.get(key, {})

        # MIN peut être "32:15" (mm:ss) ou float selon l'endpoint
        raw_min = row.get("MIN", 0)
        if isinstance(raw_min, str) and ":" in raw_min:
            parts = raw_min.split(":")
            min_val = int(parts[0]) + int(parts[1]) / 60
        else:
            min_val = safe_float(raw_min) or 0.0

        rows.append({
            "player_name": str(row.get("PLAYER_NAME", "")),
            "team_abbr": team_abbr,
            "season": season,
            # Base stats
            "gp": safe_int(row.get("GP")),
            "min": round(min_val, 2),
            "pts": safe_float(row.get("PTS")),
            "reb": safe_float(row.get("REB")),
            "ast": safe_float(row.get("AST")),
            "stl": safe_float(row.get("STL")),
            "blk": safe_float(row.get("BLK")),
            "fg_pct": safe_float(row.get("FG_PCT")),
            "fg3_pct": safe_float(row.get("FG3_PCT")),
            "ft_pct": safe_float(row.get("FT_PCT")),
            # Advanced stats (peuvent être absents sur certaines saisons)
            "ts_pct": safe_float(adv.get("TS_PCT")),
            "usg_pct": safe_float(adv.get("USG_PCT")),
            "per": safe_float(adv.get("PIE")),       # PIE ≈ proxy PER
            "off_rating": safe_float(adv.get("OFF_RATING")),
            "def_rating": safe_float(adv.get("DEF_RATING")),
            "net_rating": safe_float(adv.get("NET_RATING")),
        })

    print(f"{len(rows)} joueurs")
    return rows


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    all_rows: list[dict] = []
    failed: list[str] = []

    print("🏀 Fetch stats joueurs NBA (nba_api)…\n")

    for season in SEASONS:
        try:
            rows = fetch_season(season)
            all_rows.extend(rows)
        except Exception as e:
            print(f"ERREUR: {e}")
            failed.append(season)
            time.sleep(5)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, ensure_ascii=False, indent=2)

    total = len(all_rows)
    print(f"\n✅ {total} lignes sauvegardées dans {OUTPUT_FILE}")
    if failed:
        print(f"⚠️  Saisons échouées : {', '.join(failed)}")

    # Résumé
    by_season: dict[str, int] = {}
    for r in all_rows:
        s = r["season"]
        by_season[s] = by_season.get(s, 0) + 1
    print("\n  Saison         Joueurs")
    for s, n in sorted(by_season.items()):
        print(f"  {s}    {n}")


if __name__ == "__main__":
    main()
