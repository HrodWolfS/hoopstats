"""
Fetch NBA headshot URLs for legendary players in GENERATIONS (best-fives.ts).
Uses NBA Stats common players endpoint to get personId, then builds cdn.nba.com URL.
Updates the Player table's photoUrl field in DB.
"""

import json
import time
import urllib.request
import urllib.error
import subprocess

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
    "Referer": "https://www.nba.com",
    "Origin": "https://www.nba.com",
}

# Slugs we want to update (from best-fives.ts)
SLUG_TO_NAME = {
    # Celtics dynasty
    "bob-cousy": ("Bob", "Cousy"),
    "sam-jones": ("Sam", "Jones"),
    "tom-heinsohn": ("Tom", "Heinsohn"),
    "tom-sanders": ("Tom", "Sanders"),
    "bill-russell": ("Bill", "Russell"),
    # Showtime Lakers
    "magic-johnson": ("Earvin", "Johnson"),   # NBA uses "Earvin" or "Magic"
    "byron-scott": ("Byron", "Scott"),
    "james-worthy": ("James", "Worthy"),
    "a-c-green": ("A.C.", "Green"),
    "kareem-abdul-jabbar": ("Kareem", "Abdul-Jabbar"),
    # Bird Celtics
    "dennis-johnson": ("Dennis", "Johnson"),
    "danny-ainge": ("Danny", "Ainge"),
    "larry-bird": ("Larry", "Bird"),
    "kevin-mchale": ("Kevin", "McHale"),
    "robert-parish": ("Robert", "Parish"),
    # Bad Boys
    "isiah-thomas": ("Isiah", "Thomas"),
    "joe-dumars": ("Joe", "Dumars"),
    "vinnie-johnson": ("Vinnie", "Johnson"),
    "dennis-rodman": ("Dennis", "Rodman"),
    "bill-laimbeer": ("Bill", "Laimbeer"),
    # Bulls dynasty
    "ron-harper": ("Ron", "Harper"),
    "michael-jordan": ("Michael", "Jordan"),
    "scottie-pippen": ("Scottie", "Pippen"),
    "luc-longley": ("Luc", "Longley"),
    # Utah Jazz
    "john-stockton": ("John", "Stockton"),
    "jeff-hornacek": ("Jeff", "Hornacek"),
    "bryon-russell": ("Bryon", "Russell"),
    "karl-malone": ("Karl", "Malone"),
    "greg-ostertag": ("Greg", "Ostertag"),
    # Lakers three-peat
    "derek-fisher": ("Derek", "Fisher"),
    "kobe-bryant": ("Kobe", "Bryant"),
    "rick-fox": ("Rick", "Fox"),
    "robert-horry": ("Robert", "Horry"),
    "shaquille-o-neal": ("Shaquille", "O'Neal"),
    # Spurs dynasty
    "tony-parker": ("Tony", "Parker"),
    "manu-ginobili": ("Manu", "Ginobili"),
    "bruce-bowen": ("Bruce", "Bowen"),
    "tim-duncan": ("Tim", "Duncan"),
    "david-robinson": ("David", "Robinson"),
    # Detroit 2004
    "chauncey-billups": ("Chauncey", "Billups"),
    "richard-hamilton": ("Richard", "Hamilton"),
    "tayshaun-prince": ("Tayshaun", "Prince"),
    "rasheed-wallace": ("Rasheed", "Wallace"),
    "ben-wallace": ("Ben", "Wallace"),
    # Heat Big Three
    "mario-chalmers": ("Mario", "Chalmers"),
    "dwyane-wade": ("Dwyane", "Wade"),
    "lebron-james": ("LeBron", "James"),
    "chris-bosh": ("Chris", "Bosh"),
    "udonis-haslem": ("Udonis", "Haslem"),
    # Warriors dynasty
    "stephen-curry": ("Stephen", "Curry"),
    "klay-thompson": ("Klay", "Thompson"),
    "kevin-durant": ("Kevin", "Durant"),
    "draymond-green": ("Draymond", "Green"),
    "andre-iguodala": ("Andre", "Iguodala"),
    # Bucks 2021
    "jrue-holiday": ("Jrue", "Holiday"),
    "khris-middleton": ("Khris", "Middleton"),
    "giannis-antetokounmpo": ("Giannis", "Antetokounmpo"),
    "bobby-portis": ("Bobby", "Portis"),
    "brook-lopez": ("Brook", "Lopez"),
    # Nuggets 2023
    "jamal-murray": ("Jamal", "Murray"),
    "kentavious-caldwell-pope": ("Kentavious", "Caldwell-Pope"),
    "michael-porter-jr": ("Michael", "Porter"),
    "aaron-gordon": ("Aaron", "Gordon"),
    "nikola-jokic": ("Nikola", "Jokic"),
}


def fetch_json(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def fetch_all_players():
    url = "https://stats.nba.com/stats/commonallplayers?LeagueID=00&Season=2024-25&IsOnlyCurrentSeason=0"
    print("Fetching NBA player list...")
    data = fetch_json(url)
    headers = data["resultSets"][0]["headers"]
    rows = data["resultSets"][0]["rowSet"]
    idx_id = headers.index("PERSON_ID")
    idx_first = headers.index("ROSTERSTATUS") if "ROSTERSTATUS" in headers else None
    idx_display = headers.index("DISPLAY_LAST_COMMA_FIRST")
    # Build lookup: "Last, First" → personId
    lookup = {}
    for row in rows:
        display = row[idx_display]  # "Jordan, Michael"
        person_id = row[idx_id]
        lookup[display.lower()] = person_id
    return lookup


def match_player(slug, first, last, lookup):
    # Try "Last, First" format
    key = f"{last}, {first}".lower()
    if key in lookup:
        return lookup[key]
    # Try partial: just last name
    for k, v in lookup.items():
        if k.startswith(f"{last.lower()},") and first.lower()[0] == k.split(",")[1].strip()[0]:
            return v
    return None


def build_photo_url(person_id):
    return f"https://cdn.nba.com/headshots/nba/latest/1040x760/{person_id}.png"


def update_db(slug, photo_url):
    """Use prisma via node to update photoUrl."""
    script = f"""
const {{ PrismaClient }} = require('./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client');
const prisma = new PrismaClient();
prisma.player.updateMany({{ where: {{ slug: '{slug}' }}, data: {{ photoUrl: '{photo_url}' }} }})
  .then(r => {{ console.log('updated', r.count); }})
  .then(() => prisma.$disconnect())
  .catch(e => {{ console.error(e.message); process.exit(1); }});
"""
    result = subprocess.run(["node", "-e", script], capture_output=True, text=True)
    if "updated" in result.stdout:
        return True
    print(f"  DB error: {result.stderr[:100]}")
    return False


def main():
    try:
        lookup = fetch_all_players()
        print(f"Got {len(lookup)} players from NBA Stats\n")
    except Exception as e:
        print(f"Failed to fetch NBA players: {e}")
        return

    results = []
    for slug, (first, last) in SLUG_TO_NAME.items():
        person_id = match_player(slug, first, last, lookup)
        if person_id:
            photo_url = build_photo_url(person_id)
            ok = update_db(slug, photo_url)
            status = "✓" if ok else "✗ db error"
            print(f"  {status}  {first} {last} → ID {person_id}")
            results.append((slug, person_id, photo_url))
        else:
            print(f"  ?  {first} {last} ({slug}) — not found in NBA Stats")
        time.sleep(0.05)

    print(f"\nDone — {len(results)} players updated")


if __name__ == "__main__":
    main()
