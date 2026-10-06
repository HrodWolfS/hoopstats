/**
 * Paramètres d'URL servis depuis un segment de chemin.
 *
 * Une page qui lit `searchParams` est rendue à chaque visite : chaque visite
 * interroge Neon, dont le réveil prend plusieurs secondes. Le proxy réécrit
 * donc `?saison=2024-25` en `/saison/2024-25`, une route que Next garde en
 * cache (ISR) comme la page par défaut. Les adresses publiques ne changent pas.
 *
 * Seules les valeurs valides sont réécrites : une saison mal formée n'ouvre
 * pas une nouvelle entrée de cache, la page l'ignore comme avant.
 */

/** Saison NBA telle qu'elle apparaît dans les adresses : « 2024-25 ». */
const SEASON_FORMAT = /^\d{4}-\d{2}$/;

export function isSeasonParam(value: string): boolean {
  return SEASON_FORMAT.test(value);
}

export const MATCH_TABS = ["recents", "aujourd-hui", "a-venir"] as const;
export type MatchTab = (typeof MATCH_TABS)[number];

export function isMatchTab(value: string): value is MatchTab {
  return (MATCH_TABS as readonly string[]).includes(value);
}

type QueryRoute = {
  /** Chemin public, locale comprise. */
  path: RegExp;
  /** Paramètre lu dans l'adresse publique. */
  param: string;
  /** Dossier statique qui porte la valeur dans l'arborescence `app/`. */
  segment: string;
  accepts: (value: string) => boolean;
};

const QUERY_ROUTES: QueryRoute[] = [
  {
    path: /^\/fr\/(joueurs|equipes)\/[^/]+$/,
    param: "saison",
    segment: "saison",
    accepts: isSeasonParam,
  },
  {
    path: /^\/fr\/(equipes|rookies|playoffs|saisons|draft)$/,
    param: "saison",
    segment: "saison",
    accepts: isSeasonParam,
  },
  {
    path: /^\/fr\/trophees$/,
    param: "season",
    segment: "saison",
    accepts: isSeasonParam,
  },
  {
    path: /^\/fr\/matchs$/,
    param: "tab",
    segment: "onglet",
    accepts: isMatchTab,
  },
];

/** Adresse interne à servir, ou `null` si l'adresse publique convient telle quelle. */
export function queryRouteRewrite(url: URL): URL | null {
  for (const route of QUERY_ROUTES) {
    if (!route.path.test(url.pathname)) continue;
    const value = url.searchParams.get(route.param);
    if (value === null || !route.accepts(value)) return null;

    const target = new URL(url);
    target.pathname = `${url.pathname}/${route.segment}/${encodeURIComponent(value)}`;
    target.searchParams.delete(route.param);
    return target;
  }
  return null;
}
