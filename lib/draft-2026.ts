export type DraftPick2026 = {
  pick: number;
  team: string;
  teamAbbr: string;
  player: string;
  origin?: string;
  trade?: string;
};

/** Résultats officiels publiés par NBA.com, équipe affichée = équipe qui a drafté. */
export const DRAFT_2026: DraftPick2026[] = [
  { pick: 1, team: "Washington Wizards", teamAbbr: "WAS", player: "AJ Dybantsa", origin: "BYU" },
  { pick: 2, team: "Utah Jazz", teamAbbr: "UTA", player: "Darryn Peterson", origin: "Kansas" },
  { pick: 3, team: "Memphis Grizzlies", teamAbbr: "MEM", player: "Cameron Boozer", origin: "Duke" },
  { pick: 4, team: "Chicago Bulls", teamAbbr: "CHI", player: "Caleb Wilson", origin: "North Carolina" },
  { pick: 5, team: "LA Clippers", teamAbbr: "LAC", player: "Keaton Wagler", origin: "Illinois" },
  { pick: 6, team: "Brooklyn Nets", teamAbbr: "BKN", player: "Mikel Brown Jr.", origin: "Louisville" },
  { pick: 7, team: "Sacramento Kings", teamAbbr: "SAC", player: "Darius Acuff Jr.", origin: "Arkansas" },
  { pick: 8, team: "Atlanta Hawks", teamAbbr: "ATL", player: "Kingston Flemings", origin: "Houston" },
  { pick: 9, team: "Dallas Mavericks", teamAbbr: "DAL", player: "Morez Johnson Jr.", origin: "Michigan" },
  { pick: 10, team: "Milwaukee Bucks", teamAbbr: "MIL", player: "Brayden Burries", origin: "Arizona" },
  { pick: 11, team: "Golden State Warriors", teamAbbr: "GSW", player: "Yaxel Lendeborg", origin: "Michigan" },
  { pick: 12, team: "Oklahoma City Thunder", teamAbbr: "OKC", player: "Aday Mara", origin: "Michigan" },
  { pick: 13, team: "Miami Heat", teamAbbr: "MIA", player: "Nate Ament", origin: "Tennessee", trade: "Transféré à Milwaukee" },
  { pick: 14, team: "Charlotte Hornets", teamAbbr: "CHA", player: "Hannes Steinbach", origin: "Washington" },
  { pick: 15, team: "Chicago Bulls", teamAbbr: "CHI", player: "Dailyn Swain", origin: "Texas" },
  { pick: 16, team: "Memphis Grizzlies", teamAbbr: "MEM", player: "Bennett Stirtz", origin: "Iowa", trade: "Transféré à Oklahoma City" },
  { pick: 17, team: "Oklahoma City Thunder", teamAbbr: "OKC", player: "Ebuka Okorie", origin: "Stanford", trade: "Transféré à Detroit via Memphis" },
  { pick: 18, team: "Charlotte Hornets", teamAbbr: "CHA", player: "Christian Anderson", origin: "Texas Tech" },
  { pick: 19, team: "Toronto Raptors", teamAbbr: "TOR", player: "Allen Graves", origin: "Santa Clara" },
  { pick: 20, team: "San Antonio Spurs", teamAbbr: "SAS", player: "Jayden Quaintance" },
  { pick: 21, team: "Detroit Pistons", teamAbbr: "DET", player: "Karim López", origin: "New Zealand Breakers", trade: "Transféré à Memphis" },
  { pick: 22, team: "Philadelphia 76ers", teamAbbr: "PHI", player: "Labaron Philon Jr.", origin: "Alabama" },
  { pick: 23, team: "Atlanta Hawks", teamAbbr: "ATL", player: "Zuby Ejiofor", origin: "St. John’s" },
  { pick: 24, team: "New York Knicks", teamAbbr: "NYK", player: "Cameron Carr", origin: "Baylor", trade: "Transféré aux Lakers" },
  { pick: 25, team: "Los Angeles Lakers", teamAbbr: "LAL", player: "Sergio De Larrea", origin: "Valencia", trade: "Transféré à Dallas via New York" },
  { pick: 26, team: "Denver Nuggets", teamAbbr: "DEN", player: "Tarris Reed Jr.", origin: "Connecticut", trade: "Transféré à San Antonio" },
  { pick: 27, team: "Boston Celtics", teamAbbr: "BOS", player: "Chris Cenac Jr.", origin: "Houston" },
  { pick: 28, team: "Minnesota Timberwolves", teamAbbr: "MIN", player: "Joshua Jefferson", origin: "Iowa State", trade: "Transféré à Brooklyn" },
  { pick: 29, team: "Cleveland Cavaliers", teamAbbr: "CLE", player: "Alex Karaban", origin: "Connecticut", trade: "Transféré à Sacramento" },
  { pick: 30, team: "Dallas Mavericks", teamAbbr: "DAL", player: "Koa Peat", origin: "Arizona", trade: "Transféré à Phoenix via New York" },
  { pick: 31, team: "New York Knicks", teamAbbr: "NYK", player: "Bruce Thornton", origin: "Ohio State", trade: "Transféré à Houston" },
  { pick: 32, team: "Memphis Grizzlies", teamAbbr: "MEM", player: "Richie Saunders", origin: "BYU" },
  { pick: 33, team: "Brooklyn Nets", teamAbbr: "BKN", player: "Isaiah Evans", origin: "Duke", trade: "Transféré à Minnesota" },
  { pick: 34, team: "Sacramento Kings", teamAbbr: "SAC", player: "Meleek Thomas", origin: "Arkansas", trade: "Transféré à Cleveland" },
  { pick: 35, team: "San Antonio Spurs", teamAbbr: "SAS", player: "Trevon Brazile", origin: "Arkansas", trade: "Transféré à Denver" },
  { pick: 36, team: "LA Clippers", teamAbbr: "LAC", player: "Baba Miller", origin: "Cincinnati" },
  { pick: 37, team: "Oklahoma City Thunder", teamAbbr: "OKC", player: "Ryan Conwell", origin: "Louisville", trade: "Transféré à Miami" },
  { pick: 38, team: "Chicago Bulls", teamAbbr: "CHI", player: "Braden Smith", origin: "Purdue", trade: "Transféré à Indiana" },
  { pick: 39, team: "Houston Rockets", teamAbbr: "HOU", player: "Jack Kayil", origin: "Alba Berlin", trade: "Transféré à New York" },
  { pick: 40, team: "Boston Celtics", teamAbbr: "BOS", player: "Dillon Mitchell", origin: "St. John’s" },
  { pick: 41, team: "Miami Heat", teamAbbr: "MIA", player: "Otega Oweh", origin: "Kentucky", trade: "Transféré à Oklahoma City" },
  { pick: 42, team: "San Antonio Spurs", teamAbbr: "SAS", player: "Ja’Kobi Gillespie", origin: "Tennessee" },
  { pick: 43, team: "Brooklyn Nets", teamAbbr: "BKN", player: "Tyler Bilodeau", origin: "UCLA" },
  { pick: 44, team: "San Antonio Spurs", teamAbbr: "SAS", player: "Maliq Brown", origin: "Duke" },
  { pick: 45, team: "Sacramento Kings", teamAbbr: "SAC", player: "Emanuel Sharp", origin: "Houston" },
  { pick: 46, team: "Orlando Magic", teamAbbr: "ORL", player: "Felix Okpara", origin: "Tennessee", trade: "Transféré à Washington" },
  { pick: 47, team: "Phoenix Suns", teamAbbr: "PHX", player: "Tyler Nickel", origin: "Vanderbilt", trade: "Transféré à New York" },
  { pick: 48, team: "Dallas Mavericks", teamAbbr: "DAL", player: "Tobi Lawal", origin: "Virginia Tech" },
  { pick: 49, team: "Denver Nuggets", teamAbbr: "DEN", player: "Bryce Hopkins", origin: "St. John’s" },
  { pick: 50, team: "Toronto Raptors", teamAbbr: "TOR", player: "Jaden Bradley", origin: "Arizona" },
  { pick: 51, team: "Washington Wizards", teamAbbr: "WAS", player: "Izaiyah Nelson", origin: "South Florida", trade: "Transféré à Orlando" },
  { pick: 52, team: "LA Clippers", teamAbbr: "LAC", player: "Henri Veesaar", origin: "North Carolina", trade: "Transféré à Atlanta" },
  { pick: 53, team: "Houston Rockets", teamAbbr: "HOU", player: "Ugonna Onyenso", origin: "Virginia", trade: "Transféré à Detroit via New York" },
  { pick: 54, team: "Golden State Warriors", teamAbbr: "GSW", player: "Lajae Jones", origin: "Florida State" },
  { pick: 55, team: "New York Knicks", teamAbbr: "NYK", player: "Nick Martinelli", origin: "Northwestern", trade: "Transféré aux Clippers via Houston" },
  { pick: 56, team: "Chicago Bulls", teamAbbr: "CHI", player: "Vsevolod Ishchenko", origin: "Lokomotiv Kuban", trade: "Transféré à Dallas via les Lakers" },
  { pick: 57, team: "Atlanta Hawks", teamAbbr: "ATL", player: "Narcisse Ngoy", origin: "Poitiers", trade: "Transféré aux Clippers" },
  { pick: 58, team: "New Orleans Pelicans", teamAbbr: "NOP", player: "Jaron Pierre Jr.", origin: "Southern Methodist" },
  { pick: 59, team: "Minnesota Timberwolves", teamAbbr: "MIN", player: "Trey Kaufman-Renn", origin: "Purdue" },
  { pick: 60, team: "Washington Wizards", teamAbbr: "WAS", player: "Malique Lewis", origin: "South East Melbourne", trade: "Transféré à Milwaukee via Orlando" },
];

export const DRAFT_2026_SOURCE = "https://www.nba.com/news/2026-nba-draft-order";
