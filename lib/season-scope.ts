/**
 * Sélecteur de saison de l'en-tête : la page affichée dit quelles saisons elle
 * sait montrer, laquelle elle montre et comment on passe à une autre.
 *
 * L'en-tête vit dans le layout et ne voit pas les données de la page : une
 * fiche joueur ne couvre que sa carrière, les trophées que les saisons
 * décernées, une équipe que ses saisons d'existence. Sans ce périmètre, le
 * sélecteur affichait 2025-26 au-dessus d'un classement 2024-25.
 *
 * Module sans accès base ni React : il est testé tel quel.
 */

export type SeasonScope = {
  /** Saisons proposées, la plus récente en premier. */
  seasons: string[];
  /** Saison montrée par la page. */
  season: string;
  /** Saison montrée sans paramètre : elle garde l'adresse nue. */
  defaultSeason: string;
  /**
   * Adresse construite par chemin, `{saison}` remplacé par la saison
   * (classements). Sans modèle, la saison passe par `?saison=`.
   */
  pathTemplate?: string;
};

/** Pages où une saison n'a pas de sens : le sélecteur n'y apparaît pas. */
const SEASONLESS = [
  /^\/fr$/,
  /^\/fr\/matchs(\/|$)/,
  /^\/fr\/meilleurs-5(\/|$)/,
  /^\/fr\/comparer(\/|$)/,
  /^\/fr\/sources(\/|$)/,
  /^\/fr\/guides(\/|$)/,
  /^\/fr\/mentions-legales(\/|$)/,
  /^\/fr\/politique-confidentialite(\/|$)/,
  /^\/fr\/pilotage(\/|$)/,
];

/**
 * La page déclare-t-elle un périmètre de saison ? Sert au premier rendu,
 * avant que la page ne l'ait transmis : on réserve la place du sélecteur
 * plutôt que d'afficher une saison qui ne serait pas celle de la page.
 */
export function pageHasSeason(pathname: string): boolean {
  return !SEASONLESS.some((pattern) => pattern.test(pathname));
}

/** Adresse de la page pour une autre saison, les autres paramètres conservés. */
export function seasonScopeHref(scope: SeasonScope, pathname: string, search: string, season: string): string {
  if (scope.pathTemplate) return scope.pathTemplate.replace("{saison}", season);

  const params = new URLSearchParams(search);
  if (season === scope.defaultSeason) params.delete("saison");
  else params.set("saison", season);
  const query = params.toString();
  return pathname + (query ? `?${query}` : "");
}

/** Saisons voisines dans le périmètre : `older` et `newer` valent `null` en bout de liste. */
export function neighbourSeasons(scope: SeasonScope): { older: string | null; newer: string | null } {
  const index = scope.seasons.indexOf(scope.season);
  if (index < 0) return { older: null, newer: null };
  return {
    older: scope.seasons[index + 1] ?? null,
    newer: index > 0 ? scope.seasons[index - 1] : null,
  };
}
