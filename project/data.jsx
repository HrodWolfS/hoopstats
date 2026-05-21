// NBA team + player data — original stylized version, abstracted colors
// Team abbreviations + names are factual / public information

const TEAMS = [
  { abbr: "ATL", city: "Atlanta", name: "Hawks", conf: "Est", div: "Sud-Est", c1: "#C8102E", c2: "#FDB927", w: 36, l: 46 },
  { abbr: "BOS", city: "Boston", name: "Celtics", conf: "Est", div: "Atlantique", c1: "#007A33", c2: "#BA9653", w: 64, l: 18 },
  { abbr: "BKN", city: "Brooklyn", name: "Nets", conf: "Est", div: "Atlantique", c1: "#1d1d1f", c2: "#777777", w: 32, l: 50 },
  { abbr: "CHA", city: "Charlotte", name: "Hornets", conf: "Est", div: "Sud-Est", c1: "#1D1160", c2: "#00788C", w: 21, l: 61 },
  { abbr: "CHI", city: "Chicago", name: "Bulls", conf: "Est", div: "Centrale", c1: "#CE1141", c2: "#1d1d1f", w: 39, l: 43 },
  { abbr: "CLE", city: "Cleveland", name: "Cavaliers", conf: "Est", div: "Centrale", c1: "#6F263D", c2: "#FFB81C", w: 48, l: 34 },
  { abbr: "DAL", city: "Dallas", name: "Mavericks", conf: "Ouest", div: "Sud-Ouest", c1: "#00538C", c2: "#B8C4CA", w: 50, l: 32 },
  { abbr: "DEN", city: "Denver", name: "Nuggets", conf: "Ouest", div: "Nord-Ouest", c1: "#0E2240", c2: "#FEC524", w: 57, l: 25 },
  { abbr: "DET", city: "Detroit", name: "Pistons", conf: "Est", div: "Centrale", c1: "#C8102E", c2: "#1d428a", w: 14, l: 68 },
  { abbr: "GSW", city: "Golden State", name: "Warriors", conf: "Ouest", div: "Pacifique", c1: "#1D428A", c2: "#FFC72C", w: 46, l: 36 },
  { abbr: "HOU", city: "Houston", name: "Rockets", conf: "Ouest", div: "Sud-Ouest", c1: "#CE1141", c2: "#000000", w: 41, l: 41 },
  { abbr: "IND", city: "Indiana", name: "Pacers", conf: "Est", div: "Centrale", c1: "#002D62", c2: "#FDBB30", w: 47, l: 35 },
  { abbr: "LAC", city: "Los Angeles", name: "Clippers", conf: "Ouest", div: "Pacifique", c1: "#C8102E", c2: "#1D428A", w: 51, l: 31 },
  { abbr: "LAL", city: "Los Angeles", name: "Lakers", conf: "Ouest", div: "Pacifique", c1: "#552583", c2: "#FDB927", w: 47, l: 35 },
  { abbr: "MEM", city: "Memphis", name: "Grizzlies", conf: "Ouest", div: "Sud-Ouest", c1: "#5D76A9", c2: "#12173F", w: 27, l: 55 },
  { abbr: "MIA", city: "Miami", name: "Heat", conf: "Est", div: "Sud-Est", c1: "#98002E", c2: "#F9A01B", w: 46, l: 36 },
  { abbr: "MIL", city: "Milwaukee", name: "Bucks", conf: "Est", div: "Centrale", c1: "#00471B", c2: "#EEE1C6", w: 49, l: 33 },
  { abbr: "MIN", city: "Minnesota", name: "Timberwolves", conf: "Ouest", div: "Nord-Ouest", c1: "#0C2340", c2: "#78BE20", w: 56, l: 26 },
  { abbr: "NOP", city: "New Orleans", name: "Pelicans", conf: "Ouest", div: "Sud-Ouest", c1: "#0C2340", c2: "#C8102E", w: 49, l: 33 },
  { abbr: "NYK", city: "New York", name: "Knicks", conf: "Est", div: "Atlantique", c1: "#006BB6", c2: "#F58426", w: 50, l: 32 },
  { abbr: "OKC", city: "Oklahoma City", name: "Thunder", conf: "Ouest", div: "Nord-Ouest", c1: "#007AC1", c2: "#EF3B24", w: 57, l: 25 },
  { abbr: "ORL", city: "Orlando", name: "Magic", conf: "Est", div: "Sud-Est", c1: "#0077C0", c2: "#C4CED4", w: 47, l: 35 },
  { abbr: "PHI", city: "Philadelphia", name: "76ers", conf: "Est", div: "Atlantique", c1: "#006BB6", c2: "#ED174C", w: 47, l: 35 },
  { abbr: "PHX", city: "Phoenix", name: "Suns", conf: "Ouest", div: "Pacifique", c1: "#1D1160", c2: "#E56020", w: 49, l: 33 },
  { abbr: "POR", city: "Portland", name: "Trail Blazers", conf: "Ouest", div: "Nord-Ouest", c1: "#E03A3E", c2: "#1d1d1f", w: 21, l: 61 },
  { abbr: "SAC", city: "Sacramento", name: "Kings", conf: "Ouest", div: "Pacifique", c1: "#5A2D81", c2: "#63727A", w: 46, l: 36 },
  { abbr: "SAS", city: "San Antonio", name: "Spurs", conf: "Ouest", div: "Sud-Ouest", c1: "#C4CED4", c2: "#1d1d1f", w: 22, l: 60 },
  { abbr: "TOR", city: "Toronto", name: "Raptors", conf: "Est", div: "Atlantique", c1: "#CE1141", c2: "#1d1d1f", w: 25, l: 57 },
  { abbr: "UTA", city: "Utah", name: "Jazz", conf: "Ouest", div: "Nord-Ouest", c1: "#002B5C", c2: "#F9A01B", w: 31, l: 51 },
  { abbr: "WAS", city: "Washington", name: "Wizards", conf: "Est", div: "Sud-Est", c1: "#002B5C", c2: "#E31837", w: 15, l: 67 },
];

const findTeam = (abbr) => TEAMS.find((t) => t.abbr === abbr);

// "Hot players" — invented names blended with realistic stats
const HOT_PLAYERS = [
  { id: "p1", first: "Nikola", last: "Jokić", num: 15, team: "DEN", pos: "C",
    last5: { pts: 32.2, reb: 13.4, ast: 10.8 }, trend: "+18%" },
  { id: "p2", first: "Shai", last: "Gilgeous-A.", num: 2, team: "OKC", pos: "MA",
    last5: { pts: 34.1, reb: 5.2, ast: 6.4 }, trend: "+12%" },
  { id: "p3", first: "Luka", last: "Dončić", num: 77, team: "DAL", pos: "MA",
    last5: { pts: 35.8, reb: 9.1, ast: 9.2 }, trend: "+9%" },
  { id: "p4", first: "Jayson", last: "Tatum", num: 0, team: "BOS", pos: "AI",
    last5: { pts: 29.6, reb: 8.8, ast: 4.4 }, trend: "+7%" },
  { id: "p5", first: "Anthony", last: "Edwards", num: 5, team: "MIN", pos: "MA",
    last5: { pts: 28.9, reb: 5.4, ast: 5.1 }, trend: "+15%" },
];

// Lakers roster
const LAL_ROSTER = [
  { first: "LeBron", last: "James", num: 23, pos: "AI", age: 41, ppg: 24.4, rpg: 7.1, apg: 8.0 },
  { first: "Anthony", last: "Davis", num: 3, pos: "PI", age: 33, ppg: 26.1, rpg: 12.5, apg: 3.5 },
  { first: "Austin", last: "Reaves", num: 15, pos: "MA", age: 27, ppg: 16.2, rpg: 4.4, apg: 5.5 },
  { first: "D'Angelo", last: "Russell", num: 1, pos: "MA", age: 30, ppg: 15.4, rpg: 3.1, apg: 6.8 },
  { first: "Rui", last: "Hachimura", num: 28, pos: "AI", age: 28, ppg: 13.6, rpg: 4.7, apg: 1.4 },
  { first: "Gabe", last: "Vincent", num: 7, pos: "MA", age: 30, ppg: 7.2, rpg: 1.8, apg: 2.4 },
  { first: "Jaxson", last: "Hayes", num: 11, pos: "C", age: 26, ppg: 5.6, rpg: 4.3, apg: 0.9 },
  { first: "Max", last: "Christie", num: 10, pos: "MA", age: 23, ppg: 6.1, rpg: 2.3, apg: 1.2 },
  { first: "Cam", last: "Reddish", num: 5, pos: "AI", age: 27, ppg: 5.4, rpg: 2.0, apg: 1.0 },
  { first: "Dalton", last: "Knecht", num: 4, pos: "MA", age: 24, ppg: 9.1, rpg: 2.8, apg: 1.1 },
  { first: "Jarred", last: "Vanderbilt", num: 2, pos: "AI", age: 27, ppg: 4.8, rpg: 6.0, apg: 1.2 },
  { first: "Christian", last: "Wood", num: 35, pos: "PI", age: 30, ppg: 6.9, rpg: 5.1, apg: 1.0 },
];

const LAL_KPI = { off: 116.4, def: 112.8, net: 3.6, pace: 100.2 };

// Lakers wins last 10 seasons
const LAL_WINS = [
  { s: "15-16", w: 17 },
  { s: "16-17", w: 26 },
  { s: "17-18", w: 35 },
  { s: "18-19", w: 37 },
  { s: "19-20", w: 52 },
  { s: "20-21", w: 42 },
  { s: "21-22", w: 33 },
  { s: "22-23", w: 43 },
  { s: "23-24", w: 47 },
  { s: "24-25", w: 47 },
];

// Jokić career
const JOKIC = {
  first: "Nikola", last: "Jokić", num: 15, team: "DEN", pos: "Pivot",
  height: "2m11", weight: "129 kg", age: 31, country: "🇷🇸 Serbie", draft: "2014 — 41e tour",
  bio: "Pivot serbe au QI basket hors-norme, Nikola Jokić a redéfini le poste avec une science du jeu qui évoque davantage un meneur que les pivots traditionnels. Triple MVP en quatre saisons, champion 2023, il combine un toucher d'attaquant racé, une vision périphérique de chef d'orchestre, et une indifférence totale aux projecteurs. Sa saison en cours s'inscrit dans la lignée de ses précédentes : production statistique inégalée, lecture du jeu chirurgicale, et un Denver qui tourne autour de ses passes comme un système solaire.",
  season: { ppg: 29.6, rpg: 12.7, apg: 10.2, fg: 57.8, tp: 41.7, per: 32.6 },
};

const JOKIC_CAREER = [
  { s: "15-16", pts: 10.0, reb: 7.0, ast: 2.4, fg: 51.2, tp: 33.3, mpg: 21.7, gp: 80 },
  { s: "16-17", pts: 16.7, reb: 9.8, ast: 4.9, fg: 57.8, tp: 32.4, mpg: 27.9, gp: 73 },
  { s: "17-18", pts: 18.5, reb: 10.7, ast: 6.1, fg: 49.9, tp: 39.6, mpg: 32.6, gp: 75 },
  { s: "18-19", pts: 20.1, reb: 10.8, ast: 7.3, fg: 51.1, tp: 30.7, mpg: 31.3, gp: 80 },
  { s: "19-20", pts: 19.9, reb: 9.7, ast: 7.0, fg: 52.8, tp: 31.4, mpg: 32.0, gp: 73 },
  { s: "20-21", pts: 26.4, reb: 10.8, ast: 8.3, fg: 56.6, tp: 38.8, mpg: 34.6, gp: 72 },
  { s: "21-22", pts: 27.1, reb: 13.8, ast: 7.9, fg: 58.3, tp: 33.7, mpg: 33.5, gp: 74 },
  { s: "22-23", pts: 24.5, reb: 11.8, ast: 9.8, fg: 63.2, tp: 38.3, mpg: 33.7, gp: 69 },
  { s: "23-24", pts: 26.4, reb: 12.4, ast: 9.0, fg: 58.3, tp: 35.9, mpg: 34.6, gp: 79 },
  { s: "24-25", pts: 29.6, reb: 12.7, ast: 10.2, fg: 57.8, tp: 41.7, mpg: 36.1, gp: 70 },
];

// comparison suggestions
const JOKIC_COMP = [
  { first: "Joel", last: "Embiid", num: 21, team: "PHI", pos: "Pivot" },
  { first: "Giannis", last: "Antetokounmpo", num: 34, team: "MIL", pos: "AI" },
  { first: "Victor", last: "Wembanyama", num: 1, team: "SAS", pos: "Pivot" },
  { first: "Anthony", last: "Davis", num: 3, team: "LAL", pos: "PI" },
];

Object.assign(window, {
  TEAMS, findTeam, HOT_PLAYERS,
  LAL_ROSTER, LAL_KPI, LAL_WINS,
  JOKIC, JOKIC_CAREER, JOKIC_COMP,
});
