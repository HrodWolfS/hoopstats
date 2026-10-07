/**
 * Adresse de la fiche équipe pour une saison. La saison en cours garde
 * l'adresse nue, comme le fait le sélecteur de saison de l'en-tête.
 */
export function teamSeasonHref(locale: string, slug: string, season: string, liveSeason: string): string {
  const base = `/${locale}/equipes/${slug}`;
  return season === liveSeason ? base : `${base}?saison=${season}`;
}

/** Adresse de la fiche joueur pour une saison, même règle que `teamSeasonHref`. */
export function playerSeasonHref(locale: string, slug: string, season: string, liveSeason: string): string {
  const base = `/${locale}/joueurs/${slug}`;
  return season === liveSeason ? base : `${base}?saison=${season}`;
}
