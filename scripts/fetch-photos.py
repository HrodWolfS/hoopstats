"""
Sprint 5 — Fetch photos joueurs NBA via Wikipedia API

Pour chaque joueur actif (saison 2025-26), cherche sa page Wikipedia
et récupère l'image principale + attribution.

Output : scripts/data/photos.json
  [{ "slug": "lebron-james", "photoUrl": "...", "photoAttribution": "..." }, ...]

Run: python3 scripts/fetch-photos.py
Durée estimée: ~30 min (1 req/sec, 580 joueurs)
"""

import json
import time
import re
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌  requests non installé. Lance: pip install requests")
    raise SystemExit(1)

# Joueurs actifs uniquement (saison courante)
STATS_FILE = Path(__file__).parent / "data" / "player-stats.json"
OUTPUT_FILE = Path(__file__).parent / "data" / "photos.json"
CURRENT_SEASON = "2025-26"
SLEEP = 1.2  # poli avec Wikipedia

HEADERS = {
    "User-Agent": "hoopstats/1.0 (https://github.com/HrodWolfS/hoopstats; educational NBA stats site)"
}


def to_slug(name: str) -> str:
    name = name.lower()
    # Normalisation basique (pas de unidecode dispo partout)
    replacements = {
        "é": "e", "è": "e", "ê": "e", "ë": "e",
        "à": "a", "â": "a", "ä": "a",
        "ù": "u", "û": "u", "ü": "u",
        "ô": "o", "ö": "o",
        "î": "i", "ï": "i",
        "ç": "c", "ñ": "n",
        "ć": "c", "č": "c", "š": "s", "ž": "z",
        "ū": "u", "ō": "o", "ā": "a",
        "ý": "y", "ř": "r", "ě": "e",
        # NB: apostrophes et points sont intentionnellement absents ici —
        # le regex [^a-z0-9]+ les convertit en "-", ce qui correspond
        # aux slugs en DB (de-aaron-fox, t-j-mcconnell, etc.)
    }
    for k, v in replacements.items():
        name = name.replace(k, v)
    return re.sub(r"[^a-z0-9]+", "-", name).strip("-")


NBA_KEYWORDS = ["basketball", "nba", "national basketball association"]


def is_basketball_page(data: dict) -> bool:
    """Vérifie que la page Wikipedia parle bien d'un basketteur NBA."""
    text = (
        (data.get("extract") or "")
        + " "
        + (data.get("description") or "")
    ).lower()
    return any(kw in text for kw in NBA_KEYWORDS)


def title_matches_player(data: dict, last_name: str) -> bool:
    """Vérifie que le titre de la page correspond bien au joueur (pas une page de draft, etc.)."""
    title = (data.get("title") or "").lower()
    return last_name.lower() in title


def fetch_summary(url: str) -> dict | None:
    """Fetch une page Wikipedia REST summary, retourne le dict ou None."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


def get_wiki_photo(first_name: str, last_name: str) -> tuple[str | None, str | None]:
    """
    Retourne (photoUrl, attribution) ou (None, None).
    Stratégie :
      1. Page de désambiguïsation _(basketball) sur en.wikipedia
      2. Page directe en/fr.wikipedia — UNIQUEMENT si le texte mentionne basketball/NBA
      3. Recherche Wikipedia avec "NBA basketball" — vérifie aussi le résultat
    """
    full_name = f"{first_name} {last_name}"
    name_encoded = full_name.replace(" ", "_")

    # ── Stratégie 1 : titre désambiguïsé _(basketball) ──────────────────────
    basketball_url = (
        f"https://en.wikipedia.org/api/rest_v1/page/summary/{name_encoded}_(basketball)"
    )
    data = fetch_summary(basketball_url)
    if data:
        img = data.get("originalimage") or data.get("thumbnail")
        if img and img.get("source"):
            return img["source"], f"Wikipedia (en), {data.get('title', full_name)}"
    time.sleep(0.3)

    # ── Stratégie 2 : titre direct, avec vérification NBA ───────────────────
    for lang in ("en", "fr"):
        url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{name_encoded}"
        data = fetch_summary(url)
        if data:
            if not is_basketball_page(data):
                # Homonymie probable — ignorer sans échouer
                time.sleep(0.3)
                continue
            img = data.get("originalimage") or data.get("thumbnail")
            if img and img.get("source"):
                return img["source"], f"Wikipedia ({lang}), {data.get('title', full_name)}"
        time.sleep(0.3)

    # ── Stratégie 3 : recherche Wikipedia avec contexte NBA ─────────────────
    search_url = (
        f"https://en.wikipedia.org/w/api.php"
        f"?action=query&list=search&srsearch={first_name}+{last_name}+NBA+basketball"
        f"&format=json&srlimit=3&srprop=snippet"
    )
    try:
        r = requests.get(search_url, headers=HEADERS, timeout=10)
        if r.status_code == 200:
            results = r.json().get("query", {}).get("search", [])
            for result in results:
                title = result["title"].replace(" ", "_")
                summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
                data = fetch_summary(summary_url)
                if data:
                    if not is_basketball_page(data):
                        time.sleep(0.3)
                        continue
                    # Vérifier que le titre correspond au joueur (pas une page de draft)
                    if not title_matches_player(data, last_name):
                        time.sleep(0.3)
                        continue
                    img = data.get("originalimage") or data.get("thumbnail")
                    if img and img.get("source"):
                        return img["source"], f"Wikipedia (en), {data.get('title', full_name)}"
                time.sleep(0.3)
    except Exception:
        pass

    return None, None


def main():
    if not STATS_FILE.exists():
        print(f"❌  {STATS_FILE} introuvable. Lance d'abord fetch-stats.py.")
        raise SystemExit(1)

    # Charger les joueurs actifs (saison courante uniquement, dédupliquer)
    stats = json.loads(STATS_FILE.read_text())
    active = {}
    for row in stats:
        if row["season"] == CURRENT_SEASON:
            name = row["player_name"]
            parts = name.split(" ", 1)
            first = parts[0] if parts else ""
            last = parts[1] if len(parts) > 1 else ""
            slug = to_slug(name)
            active[slug] = {"slug": slug, "firstName": first, "lastName": last}

    print(f"🏀 {len(active)} joueurs actifs à traiter…\n")

    # Charger le JSON existant pour reprendre là où on s'est arrêté
    existing: dict[str, dict] = {}
    if OUTPUT_FILE.exists():
        for item in json.loads(OUTPUT_FILE.read_text()):
            existing[item["slug"]] = item

    found = sum(1 for v in existing.values() if v.get("photoUrl"))
    print(f"  Déjà trouvées : {found} photos\n")

    results = dict(existing)
    new_found = 0
    skipped = 0

    for i, (slug, player) in enumerate(active.items(), 1):
        # Skip si déjà traité (même sans photo — évite de re-tenter)
        if slug in existing:
            skipped += 1
            continue

        print(f"  [{i}/{len(active)}] {player['firstName']} {player['lastName']}… ", end="", flush=True)
        photo_url, attribution = get_wiki_photo(player["firstName"], player["lastName"])

        results[slug] = {
            "slug": slug,
            "photoUrl": photo_url,
            "photoAttribution": attribution,
        }

        if photo_url:
            print(f"✓")
            new_found += 1
        else:
            print(f"—")

        # Sauvegarde incrémentale toutes les 10 entrées
        if i % 10 == 0:
            OUTPUT_FILE.write_text(
                json.dumps(list(results.values()), ensure_ascii=False, indent=2)
            )

        time.sleep(SLEEP)

    OUTPUT_FILE.write_text(
        json.dumps(list(results.values()), ensure_ascii=False, indent=2)
    )

    total_with_photo = sum(1 for v in results.values() if v.get("photoUrl"))
    print(f"\n✅ {new_found} nouvelles photos trouvées ({total_with_photo} total)")
    print(f"   {skipped} joueurs déjà traités (skip)")
    print(f"   Output: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
