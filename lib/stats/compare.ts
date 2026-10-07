/**
 * Choix des saisons comparées (feuille de route § 1.3).
 *
 * Règles, dans l'ordre :
 *  1. une saison demandée dans l'URL et réellement jouée est respectée ;
 *  2. une saison demandée mais non jouée n'est jamais remplacée en silence :
 *     elle est signalée dans `unavailable` ;
 *  3. deux joueurs différents sont comparés sur la même saison par défaut :
 *     si un seul côté est fixé, l'autre s'aligne dessus quand il l'a jouée,
 *     sinon on prend sa saison la plus proche ;
 *  4. sans demande : dernière saison commune, à défaut la dernière de chacun ;
 *  5. un joueur comparé à lui-même : avant-dernière saison contre dernière.
 */

export type ComparisonSlot = "j1" | "j2";

export type ComparisonSeasons = {
  season1: string | null;
  season2: string | null;
  /** Saisons demandées dans l'URL que le joueur n'a pas jouées. */
  unavailable: { slot: ComparisonSlot; season: string }[];
};

/** Matchs en dessous desquels une moyenne de saison est signalée comme fragile. */
export const SMALL_SAMPLE_GAMES = 20;

const startYear = (season: string) => Number.parseInt(season.slice(0, 4), 10);

/** Saison jouée la plus proche de `target`, la plus récente en cas d'égalité. */
export function closestSeason(seasons: readonly string[], target: string): string | null {
  const distance = (season: string) => Math.abs(startYear(season) - startYear(target));
  return (
    [...seasons].sort((a, b) => distance(a) - distance(b) || b.localeCompare(a))[0] ?? null
  );
}

export function resolveComparisonSeasons({
  seasons1,
  seasons2,
  requested1,
  requested2,
  samePlayer,
}: {
  seasons1: readonly string[];
  seasons2: readonly string[];
  requested1?: string | null;
  requested2?: string | null;
  samePlayer: boolean;
}): ComparisonSeasons {
  const sorted1 = [...new Set(seasons1)].sort();
  const sorted2 = [...new Set(seasons2)].sort();
  const unavailable: ComparisonSeasons["unavailable"] = [];

  const accept = (slot: ComparisonSlot, requested: string | null | undefined, seasons: string[]) => {
    if (!requested) return null;
    if (seasons.includes(requested)) return requested;
    unavailable.push({ slot, season: requested });
    return null;
  };
  const fixed1 = accept("j1", requested1, sorted1);
  const fixed2 = accept("j2", requested2, sorted2);

  const latest1 = sorted1.at(-1) ?? null;
  const latest2 = sorted2.at(-1) ?? null;

  // Côté non fixé : même saison pour un autre joueur, autre saison pour
  // le même joueur (la dernière, ou l'avant-dernière si c'est déjà l'ancre).
  const follow = (anchor: string, seasons: string[]) => {
    if (!samePlayer) return closestSeason(seasons, anchor);
    return seasons.at(-1) === anchor ? (seasons.at(-2) ?? anchor) : (seasons.at(-1) ?? null);
  };

  if (fixed1 && fixed2) return { season1: fixed1, season2: fixed2, unavailable };
  if (fixed1) return { season1: fixed1, season2: sorted2.length ? follow(fixed1, sorted2) : null, unavailable };
  if (fixed2) return { season1: sorted1.length ? follow(fixed2, sorted1) : null, season2: fixed2, unavailable };

  if (samePlayer) {
    return { season1: sorted1.at(-2) ?? latest1, season2: latest2, unavailable };
  }
  const common = sorted1.filter((season) => sorted2.includes(season)).at(-1);
  return { season1: common ?? latest1, season2: common ?? latest2, unavailable };
}
