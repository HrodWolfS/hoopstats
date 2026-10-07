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

import { defaultDayKey, isDayKey, shiftDay } from "@/lib/schedule";

/** Saison NBA telle qu'elle apparaît dans les adresses : « 2024-25 ». */
const SEASON_FORMAT = /^\d{4}-\d{2}$/;

export function isSeasonParam(value: string): boolean {
  return SEASON_FORMAT.test(value);
}

/** Équipe telle qu'elle apparaît dans les adresses : « bos », « gsw ». */
const TEAM_FORMAT = /^[a-z]{2,4}$/;

export function isTeamParam(value: string): boolean {
  return TEAM_FORMAT.test(value);
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
    path: /^\/fr\/(equipes|rookies|playoffs|saisons|draft|trophees|tendances)$/,
    param: "saison",
    segment: "saison",
    accepts: isSeasonParam,
  },
  {
    path: /^\/fr\/matchs$/,
    param: "date",
    segment: "jour",
    accepts: isDayKey,
  },
  {
    path: /^\/fr\/matchs$/,
    param: "equipe",
    segment: "equipe",
    accepts: isTeamParam,
  },
];

/** Adresse interne à servir, ou `null` si l'adresse publique convient telle quelle. */
export function queryRouteRewrite(url: URL): URL | null {
  for (const route of QUERY_ROUTES) {
    if (!route.path.test(url.pathname)) continue;
    const value = url.searchParams.get(route.param);
    if (value === null) continue;
    if (!route.accepts(value)) return null;

    const target = new URL(url);
    target.pathname = `${url.pathname}/${route.segment}/${encodeURIComponent(value)}`;
    target.searchParams.delete(route.param);
    return target;
  }
  return null;
}

/**
 * Les trophées lisaient `?season=` : les liens déjà partagés sont renvoyés
 * vers `?saison=`, le paramètre commun à toutes les pages. `null` sinon.
 */
export function legacySeasonRedirect(url: URL): URL | null {
  if (url.pathname !== "/fr/trophees" || !url.searchParams.has("season")) return null;
  const target = new URL(url);
  const season = target.searchParams.get("season") ?? "";
  target.searchParams.delete("season");
  if (!target.searchParams.has("saison")) target.searchParams.set("saison", season);
  return target;
}

/** Anciens onglets de la page matchs, remplacés par la navigation par date. */
const LEGACY_MATCH_TABS: Record<string, number | null> = { recents: -1, "aujourd-hui": null, "a-venir": 1 };

/**
 * `?tab=recents` et `?tab=a-venir` renvoient vers la veille ou le lendemain de
 * la journée du moment. Temporaire (307) : la cible change chaque jour.
 */
export function legacyMatchTabRedirect(url: URL, now: Date): URL | null {
  if (url.pathname !== "/fr/matchs" || !url.searchParams.has("tab")) return null;
  const offset = LEGACY_MATCH_TABS[url.searchParams.get("tab") ?? ""];
  const target = new URL(url);
  target.searchParams.delete("tab");
  if (offset != null && !target.searchParams.has("date")) {
    target.searchParams.set("date", shiftDay(defaultDayKey(now), offset));
  }
  return target;
}
