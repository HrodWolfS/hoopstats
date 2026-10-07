/**
 * Adresse de la fiche équipe pour une saison. La saison en cours garde
 * l'adresse nue, comme le fait le sélecteur de saison de l'en-tête.
 */
export function teamSeasonHref(locale: string, slug: string, season: string, liveSeason: string): string {
  const base = `/${locale}/equipes/${slug}`;
  return season === liveSeason ? base : `${base}?saison=${season}`;
}
