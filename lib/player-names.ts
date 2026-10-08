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

function comparableName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, " ")
    .replace(/[^a-z]/g, "");
}

/**
 * Le titre d'une page Wikipédia désigne-t-il ce joueur ? Nom complet exigé,
 * à l'accent, la ponctuation, le suffixe et la précision « (basketball) » près :
 * un nom de famille seul a donné à Dylan Harper la photo de Ron Harper Jr.,
 * et une redirection vers « 2023 NBA Finals » une photo d'équipe.
 */
export function titleNamesPlayer(title: string, firstName: string, lastName: string): boolean {
  const expected = comparableName(`${firstName} ${lastName}`);
  return expected.length > 0 && comparableName(title) === expected;
}

/** Slug de la fiche pour un nom du fichier source. */
export function sourcePlayerSlug(name: string): string {
  const trimmed = name.trim();
  const alias = SOURCE_NAME_ALIASES[trimmed];
  if (alias) return alias;
  const parts = trimmed.split(" ");
  return playerSlug(parts[0] ?? "", parts.slice(1).join(" "));
}

/**
 * Fiches en double supprimées (sans saison ni match), fusionnées dans la fiche
 * qui porte le suffixe ou les initiales du fichier source. L'ancienne adresse
 * reste valable pour les liens déjà partagés.
 */
export const MERGED_PLAYER_SLUGS: Record<string, string> = {
  "cj-wilcox": "c-j-wilcox",
  "jimmy-butler": "jimmy-butler-iii",
  "marcus-morris": "marcus-morris-sr",
  "pj-tucker": "p-j-tucker",
  "reggie-bullock": "reggie-bullock-jr",
  "trey-murphy": "trey-murphy-iii",
};

/** `/fr/joueurs/jimmy-butler…` → même adresse sur la fiche conservée (308). */
export function mergedPlayerRedirect(url: URL): URL | null {
  const match = /^\/fr\/joueurs\/([^/]+)(\/.*)?$/.exec(url.pathname);
  const target = match && MERGED_PLAYER_SLUGS[match[1]];
  if (!target) return null;
  const next = new URL(url);
  next.pathname = `/fr/joueurs/${target}${match[2] ?? ""}`;
  return next;
}
