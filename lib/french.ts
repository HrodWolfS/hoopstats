/**
 * Qui est « Français » sur hoopstats : une seule règle, appliquée partout
 * (accueil, hub « Français en NBA ») et publiée sur la page Sources.
 *
 * Nationalité sportive : la fiche NBA.com (via balldontlie) indique la France,
 * ou le joueur a porté le maillot de l'équipe de France A alors que NBA.com
 * le rattache à un autre pays. Chaque ajout est nommé et sourcé ici.
 */

export const FRENCH_COUNTRY = "France";

export type FrenchAddition = { slug: string; name: string; reason: string };

/** Internationaux français que NBA.com classe sous un autre pays. */
export const FRENCH_ADDITIONS: readonly FrenchAddition[] = [
  {
    slug: "yakhouba-diawara",
    name: "Yakhouba Diawara",
    reason: "EuroBasket 2007 et 2009, Jeux olympiques 2012 avec l'équipe de France (FIBA).",
  },
  {
    slug: "joakim-noah",
    name: "Joakim Noah",
    reason: "Médaille d'argent à l'EuroBasket 2011 avec l'équipe de France (FIBA).",
  },
];

const ADDITION_SLUGS = new Set(FRENCH_ADDITIONS.map((addition) => addition.slug));

export function isFrench(player: { slug: string; country: string | null }): boolean {
  return player.country === FRENCH_COUNTRY || ADDITION_SLUGS.has(player.slug);
}

/** Filtre Prisma équivalent à `isFrench`. */
export const FRENCH_PLAYER_WHERE = {
  OR: [{ country: FRENCH_COUNTRY }, { slug: { in: [...ADDITION_SLUGS] } }],
};

/** Jours de calendrier couverts par « Prochains matchs ». */
export const FRENCH_SCHEDULE_DAYS = 14;

export const FRENCH_RULES: { title: string; rule: string }[] = [
  {
    title: "Critère d'inclusion",
    rule: "Nationalité sportive : la fiche NBA.com du joueur (pays publié via balldontlie) indique la France, ou il a joué pour l'équipe de France A alors que NBA.com le rattache à un autre pays. Le lieu de naissance n'entre pas en compte.",
  },
  {
    title: "Ajouts nommés",
    rule: FRENCH_ADDITIONS.map((addition) => `${addition.name} : ${addition.reason}`).join(" "),
  },
  {
    title: "Avoir joué en NBA",
    rule: "Le hub liste les joueurs qui ont disputé au moins un match de saison régulière NBA. Un drafté ou un joueur aperçu seulement en présaison n'y figure pas encore.",
  },
  {
    title: "Actifs",
    rule: "Un joueur est actif s'il a joué en saison régulière lors de la saison affichée. Son équipe est celle de son dernier match en base, présaison comprise.",
  },
  {
    title: "Prochains matchs",
    rule: `Matchs programmés dans les ${FRENCH_SCHEDULE_DAYS} jours qui viennent pour les équipes des joueurs actifs.`,
  },
];
