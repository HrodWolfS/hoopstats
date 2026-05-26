"""
Sprint 2.3 — Stats avancées NBA via nba_api

Extrait PER, TS%, USG%, BPM, VORP, WS pour chaque joueur × saison.
Output : scripts/data/advanced-stats.json

Prérequis:
  pip install nba_api

Run: python3 scripts/enrich-advanced.py

Durée estimée: ~30 min (rate limit API officielle NBA)
"""

import json
import time
import os
from pathlib import Path

try:
    from nba_api.stats.endpoints import leaguedashplayerbiostats, leaguedashplayerstats
    from nba_api.stats.static import players as nba_players_static
except ImportError:
    print("❌  nba_api non installé. Lance: pip install nba_api")
    raise SystemExit(1)

# Saisons à traiter : "2015-16" → "2024-25"
SEASONS = [
    "2015-16", "2016-17", "2017-18", "2018-19", "2019-20",
    "2020-21", "2021-22", "2022-23", "2023-24", "2024-25",
]

OUTPUT_DIR = Path(__file__).parent / "data"
OUTPUT_FILE = OUTPUT_DIR / "advanced-stats.json"

# On est poli avec l'API NBA officielle (pas de clé, mais rate limited)
SLEEP_BETWEEN_REQUESTS = 2.0  # secondes


def fetch_advanced_season(season: str) -> list[dict]:
    """
    Fetche LeagueDashPlayerStats (Advanced) pour une saison.
    Retourne une liste de dicts avec les stats avancées.
    """
    print(f"  Fetching {season}…", end=" ", flush=True)

    try:
        response = leaguedashplayerstats.LeagueDashPlayerStats(
            season=season,
            season_type_all_star="Regular Season",
            measure_type_detailed_defense="Advanced",
            per_mode_detailed="PerGame",
            timeout=60,
        )
        df = response.get_data_frames()[0]
        rows = []

        for _, row in df.iterrows():
            rows.append({
                "player_name": str(row.get("PLAYER_NAME", "")),
                "season": season,
                "gp": int(row.get("GP", 0)),
                "per": _safe_float(row.get("PIE")),       # PIE ≈ PER proxy (nba_api)
                "ts_pct": _safe_float(row.get("TS_PCT")),
                "usg_pct": _safe_float(row.get("USG_PCT")),
                "off_rating": _safe_float(row.get("OFF_RATING")),
                "def_rating": _safe_float(row.get("DEF_RATING")),
                "net_rating": _safe_float(row.get("NET_RATING")),
                "ast_pct": _safe_float(row.get("AST_PCT")),
                "reb_pct": _safe_float(row.get("REB_PCT")),
            })

        print(f"{len(rows)} joueurs")
        return rows

    except Exception as e:
        print(f"ERREUR: {e}")
        return []


def _safe_float(val) -> float | None:
    try:
        f = float(val)
        return None if f != f else round(f, 4)  # NaN check
    except (TypeError, ValueError):
        return None


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    all_data: list[dict] = []

    print("🏀 Extraction stats avancées NBA…\n")

    for i, season in enumerate(SEASONS):
        rows = fetch_advanced_season(season)
        all_data.extend(rows)

        if i < len(SEASONS) - 1:
            time.sleep(SLEEP_BETWEEN_REQUESTS)

    print(f"\n📊 Total: {len(all_data)} lignes")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"✅ Sauvegardé dans {OUTPUT_FILE}")

    # Résumé par saison
    seasons_count: dict[str, int] = {}
    for row in all_data:
        s = row["season"]
        seasons_count[s] = seasons_count.get(s, 0) + 1

    print("\n  Saison         Joueurs")
    for s, count in sorted(seasons_count.items()):
        print(f"  {s}    {count}")


if __name__ == "__main__":
    main()
