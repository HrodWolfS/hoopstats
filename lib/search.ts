import { PLAYER_NAME_ALIASES } from "@/lib/stats/player-aliases";

/**
 * Moteur de la recherche globale, partagé par la palette (⌘K) et le
 * comparateur. Fonctions pures : l'index est construit côté serveur
 * (`lib/search-index.ts`), le classement se teste sans base.
 */

export type SearchResult = {
  type: "player" | "team";
  slug: string;
  label: string;
  sub: string;
  /** Nom ou surnom qui a permis de trouver le résultat, s'il diffère du libellé. */
  matchedAlias?: string;
  /** Résultat retenu par proximité orthographique, faute de correspondance exacte. */
  approximate?: boolean;
  photoUrl?: string | null;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
};

export type SearchEntry = {
  result: SearchResult;
  /** Noms officiels sous lesquels l'entrée est trouvable (« Los Angeles Lakers », « Lakers »). */
  names: string[];
  /** Surnoms et anciens noms : trouvables, un peu moins bien classés, et signalés. */
  aliases?: string[];
  /** Codes courts trouvables à l'identique seulement (« BOS »). */
  codes?: string[];
  /** Départage les homonymes : matchs joués en carrière, par exemple. */
  weight: number;
};

export type SearchKind = "all" | "player";

export const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;

/**
 * Forme de comparaison : sans accents ni casse ; les apostrophes et points
 * disparaissent (« O'Neal » → « oneal », « J.R. » → « jr »), les autres
 * séparateurs deviennent des espaces (« Abdul-Jabbar » → « abdul jabbar »).
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’‘`´.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Prépare la saisie de l'utilisateur : bornée, normalisée. */
export function prepareQuery(raw: string): string {
  return normalizeSearch(raw.slice(0, MAX_QUERY_LENGTH));
}

/**
 * Surnoms et anciens noms, en plus des alias ESPN déjà utilisés pour
 * rattacher les box scores. Nom affiché → nom exact de la fiche.
 */
export const PLAYER_SEARCH_ALIASES: Readonly<Record<string, string>> = {
  ...PLAYER_NAME_ALIASES,
  Shaq: "Shaquille O'Neal",
  "Earvin Johnson": "Magic Johnson",
  "Ron Artest": "Metta World Peace",
  "Metta Sandiford-Artest": "Metta World Peace",
  "Enes Kanter": "Enes Freedom",
  "Akeem Olajuwon": "Hakeem Olajuwon",
  "Penny Hardaway": "Anfernee Hardaway",
  "Greek Freak": "Giannis Antetokounmpo",
  "King James": "LeBron James",
  "Dr. J": "Julius Erving",
  "The Mailman": "Karl Malone",
  "The Answer": "Allen Iverson",
  "Nene Hilario": "Nene",
  "Jimmy Butler": "Jimmy Butler III",
};

/** Surnoms d'équipes courants. Surnom → abréviation. */
export const TEAM_SEARCH_ALIASES: Readonly<Record<string, string>> = {
  Sixers: "PHI",
  Blazers: "POR",
  Cavs: "CLE",
  Mavs: "DAL",
  Wolves: "MIN",
  "T-Wolves": "MIN",
  Pels: "NOP",
  Grizz: "MEM",
  Dubs: "GSW",
  "Les Lakers": "LAL",
};

type IndexedEntry = SearchEntry & {
  keys: { key: string; alias?: string }[];
  codeKeys: string[];
};

/** Index prêt à interroger : formes normalisées calculées une seule fois. */
export type SearchIndex = readonly IndexedEntry[];

export function buildSearchIndex(entries: readonly SearchEntry[]): SearchIndex {
  return entries.map((entry) => ({
    ...entry,
    keys: [
      ...entry.names.map((name) => ({ key: normalizeSearch(name) })),
      ...(entry.aliases ?? []).map((alias) => ({ key: normalizeSearch(alias), alias })),
    ],
    codeKeys: (entry.codes ?? []).map(normalizeSearch),
  }));
}

type Scored = { entry: IndexedEntry; score: number; alias?: string };

/** Pertinence d'un nom pour une requête, 0 si aucune correspondance. */
function nameScore(name: string, query: string, queryTokens: string[]): number {
  if (name === query) return 100;
  // Nom de famille complet : « james » fait remonter LeBron James avant
  // James Harden, dont seul le prénom commence par la saisie.
  if (name.endsWith(` ${query}`)) return 85;
  if (name.startsWith(query)) return 80;
  const tokens = name.split(" ");
  // Chaque mot saisi doit commencer un mot du nom, dans n'importe quel ordre :
  // « james lebron », « leb jam ».
  const used = new Set<number>();
  const allTokensMatch = queryTokens.every((queryToken) => {
    const index = tokens.findIndex((token, i) => !used.has(i) && token.startsWith(queryToken));
    if (index === -1) return false;
    used.add(index);
    return true;
  });
  if (allTokensMatch) {
    // Le nom de famille compte plus que le prénom.
    const lastMatched = used.has(tokens.length - 1);
    return lastMatched ? 70 : 60;
  }
  // Saisie sans espace ni tiret : « abduljabbar », « okc thunder » collé.
  const compactName = name.replace(/ /g, "");
  const compactQuery = query.replace(/ /g, "");
  if (compactQuery.length >= 3 && compactName.startsWith(compactQuery)) return 55;
  if (compactQuery.length >= 4 && compactName.includes(compactQuery)) return 40;
  return 0;
}

/** Distance d'édition bornée : au-delà de `max`, renvoie `max + 1`. */
export function boundedEditDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

/**
 * Proximité orthographique, seulement quand rien ne correspond : chaque mot
 * saisi doit être à une faute (deux au-delà de 6 lettres) d'un mot du nom.
 * « jokic » trouve déjà Jokić ; ici, c'est « wembanyamma » ou « antetokumpo ».
 */
function approximateScore(name: string, queryTokens: string[]): number {
  const tokens = name.split(" ");
  let total = 0;
  for (const queryToken of queryTokens) {
    if (queryToken.length < 4) return 0;
    const tolerance = queryToken.length > 6 ? 2 : 1;
    const best = Math.min(
      ...tokens.map((token) =>
        boundedEditDistance(queryToken, token.slice(0, queryToken.length + tolerance), tolerance),
      ),
    );
    if (best > tolerance) return 0;
    total += tolerance + 1 - best;
  }
  return total;
}

export type SearchOutcome = { results: SearchResult[]; approximate: boolean };

export function searchEntries(
  entries: SearchIndex,
  rawQuery: string,
  { kind = "all", limit = 8 }: { kind?: SearchKind; limit?: number } = {},
): SearchOutcome {
  const query = prepareQuery(rawQuery);
  if (query.replace(/ /g, "").length < MIN_QUERY_LENGTH) return { results: [], approximate: false };
  const queryTokens = query.split(" ");
  const pool = kind === "player" ? entries.filter((e) => e.result.type === "player") : entries;

  const scored: Scored[] = [];
  for (const entry of pool) {
    let best: Scored | null = null;
    if (entry.codeKeys.includes(query)) best = { entry, score: 100 };
    for (const { key, alias } of entry.keys) {
      const score = nameScore(key, query, queryTokens) - (alias ? 5 : 0);
      if (score > 0 && (!best || score > best.score)) best = { entry, score, alias };
    }
    if (best) scored.push(best);
  }

  let approximate = false;
  if (scored.length === 0) {
    approximate = true;
    for (const entry of pool) {
      const score = Math.max(...entry.keys.map(({ key }) => approximateScore(key, queryTokens)));
      if (score > 0) scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || b.entry.weight - a.entry.weight);
  const results: SearchResult[] = scored.slice(0, limit).map(({ entry, alias }) => ({
    ...entry.result,
    ...(alias ? { matchedAlias: alias } : {}),
    ...(approximate ? { approximate: true } : {}),
  }));
  return { results, approximate: approximate && results.length > 0 };
}

/** Années de carrière à partir des saisons : « 1984-85 », « 2002-03 » → « 1984-2003 ». */
export function careerSpan(firstSeason: string, lastSeason: string): string {
  const start = Number.parseInt(firstSeason.slice(0, 4), 10);
  const end = Number.parseInt(lastSeason.slice(0, 4), 10) + 1;
  return start + 1 === end ? firstSeason : `${start}-${end}`;
}
