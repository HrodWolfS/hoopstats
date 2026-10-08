import { playerSlug } from "./slugs";

/**
 * Noms du fichier de stats NBA (scripts/data/player-stats.json) qui ne donnent
 * pas le slug de la fiche : surnoms, suffixes Jr./II/III, ordre asiatique.
 * Sans cette table, leurs saisons étaient ignorées sans bruit à l'import
 * (ex. Alex Sarr 2024-25). Chaque entrée a été vérifiée contre la base
 * (équipe et saison cohérentes) ; pas de rapprochement approximatif, qui
 * confondrait un père et un fils.
 */
export const SOURCE_NAME_ALIASES: Record<string, string> = {
  "A.J. Lawson": "aj-lawson",
  "AJ Green": "a-j-green",
  "Ace Bailey": "airious-bailey",
  "Alex Sarr": "alexandre-sarr",
  "Bones Hyland": "nah-shon-hyland",
  "Brandon Boston": "brandon-boston-jr",
  "Bub Carrington": "carlton-carrington",
  "Cam Reddish": "cameron-reddish",
  "Cam Reynolds": "cameron-reynolds",
  "Chaundee Brown Jr.": "chaundee-brown",
  "Craig Porter Jr.": "craig-porter",
  "David Jones Garcia": "david-jones",
  "Didi Louzada": "marcos-louzada-silva",
  "Frank Mason III": "frank-mason",
  "Jeff Dowtin Jr.": "jeff-dowtin",
  "KJ Martin": "kenyon-martin-jr",
  "KJ Simpson": "k-j-simpson",
  "Kevin Knox II": "kevin-knox",
  "Michael Frazier II": "michael-frazier",
  "Nic Claxton": "nicolas-claxton",
  "Nigel Hayes-Davis": "nigel-hayes",
  "Ruben Nembhard Jr.": "rj-nembhard-jr",
  "Sasha Vezenkov": "aleksandar-vezenkov",
  "T.J. Leaf": "tj-leaf",
  "Trey Jemison III": "trey-jemison",
  "Walt Lemon Jr.": "walter-lemon-jr",
  "Yang Hansen": "hansen-yang",
};

/** Slug de la fiche pour un nom du fichier source. */
export function sourcePlayerSlug(name: string): string {
  const trimmed = name.trim();
  const alias = SOURCE_NAME_ALIASES[trimmed];
  if (alias) return alias;
  const parts = trimmed.split(" ");
  return playerSlug(parts[0] ?? "", parts.slice(1).join(" "));
}
