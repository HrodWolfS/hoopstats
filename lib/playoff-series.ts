/**
 * Issue d'une série de playoffs.
 *
 * `team1` désigne la tête de série — la mieux classée, ou l'Ouest en finale —
 * jamais le vainqueur. Confondre les deux revient à supposer que le favori
 * gagne toujours : la page Saisons attribuait ainsi le titre 2015-16 à Golden
 * State alors que Cleveland avait gagné la série 4-3.
 *
 * Module volontairement sans accès base pour rester exécutable par
 * `pnpm health:data` sans ouvrir de connexion.
 */

export type SeriesOutcome = {
  completed: boolean;
  team1Id: string;
  team2Id: string;
  team1Wins: number;
  team2Wins: number;
};

/**
 * Identifiant de l'équipe qui a gagné la série.
 *
 * Retourne `null` tant que la série n'est pas terminée, ou si le décompte ne
 * départage pas les deux équipes : aucun vainqueur ne doit être supposé.
 */
export function seriesWinnerTeamId(series: SeriesOutcome): string | null {
  if (!series.completed) return null;
  if (series.team1Wins === series.team2Wins) return null;

  return series.team1Wins > series.team2Wins ? series.team1Id : series.team2Id;
}

/** Vrai lorsque la série a commencé, qu'elle soit en cours ou terminée. */
export function hasSeriesStarted(series: SeriesOutcome): boolean {
  return series.completed || series.team1Wins + series.team2Wins > 0;
}

/**
 * Formats successifs du premier tour.
 *
 * Le premier tour s'est joué au meilleur des trois jusqu'aux playoffs 1983,
 * au meilleur des cinq jusqu'à ceux de 2002, au meilleur des sept depuis.
 * Une série de 1981 conclue 2-1 est donc complète, pas tronquée : juger tout
 * l'historique à l'aune du format actuel produirait des centaines de fausses
 * alertes et masquerait les vrais décomptes incomplets.
 *
 * Les tours suivants se sont toujours joués au meilleur des sept.
 */
export const FIRST_BEST_OF_FIVE_ROUND_ONE_SEASON = "1983-84";
export const FIRST_BEST_OF_SEVEN_ROUND_ONE_SEASON = "2002-03";

/** Nombre de victoires nécessaires pour remporter la série. */
export function seriesWinsRequired(season: string, round: number): number {
  if (round !== 1) return 4;
  if (season < FIRST_BEST_OF_FIVE_ROUND_ONE_SEASON) return 2;
  if (season < FIRST_BEST_OF_SEVEN_ROUND_ONE_SEASON) return 3;
  return 4;
}

/** Auto-contrôles exécutés par `pnpm health:data`. */
export function validatePlayoffSeriesWinner(): string[] {
  const errors: string[] = [];

  const base = { team1Id: "top", team2Id: "bottom" };

  // La tête de série gagne : cas nominal.
  if (
    seriesWinnerTeamId({ ...base, completed: true, team1Wins: 4, team2Wins: 1 }) !==
    "top"
  ) {
    errors.push("tête de série victorieuse non reconnue");
  }

  // Série gagnée par l'équipe la moins bien classée (feuille de route § 0.3).
  if (
    seriesWinnerTeamId({ ...base, completed: true, team1Wins: 3, team2Wins: 4 }) !==
    "bottom"
  ) {
    errors.push("victoire de l'équipe la moins bien classée non reconnue");
  }

  // Série en cours : aucun vainqueur, même avec une avance décisive.
  if (
    seriesWinnerTeamId({ ...base, completed: false, team1Wins: 3, team2Wins: 0 }) !==
    null
  ) {
    errors.push("vainqueur désigné avant la fin de la série");
  }

  // Décompte à égalité : rien ne permet de départager.
  if (
    seriesWinnerTeamId({ ...base, completed: true, team1Wins: 3, team2Wins: 3 }) !==
    null
  ) {
    errors.push("vainqueur désigné sur un décompte à égalité");
  }

  // Série non commencée.
  if (hasSeriesStarted({ ...base, completed: false, team1Wins: 0, team2Wins: 0 })) {
    errors.push("série non commencée considérée comme démarrée");
  }
  if (!hasSeriesStarted({ ...base, completed: false, team1Wins: 1, team2Wins: 0 })) {
    errors.push("série en cours considérée comme non démarrée");
  }

  // Trois formats successifs du premier tour.
  if (seriesWinsRequired("1981-82", 1) !== 2) {
    errors.push("premier tour de 1982 traité autrement qu'au meilleur des trois");
  }
  if (seriesWinsRequired("1995-96", 1) !== 3) {
    errors.push("premier tour historique traité comme un meilleur des sept");
  }
  if (seriesWinsRequired("1983-84", 1) !== 3) {
    errors.push("bascule 1983-84 vers le meilleur des cinq non appliquée");
  }
  if (seriesWinsRequired("2002-03", 1) !== 4) {
    errors.push("premier tour moderne traité comme un meilleur des cinq");
  }
  if (seriesWinsRequired("1995-96", 2) !== 4) {
    errors.push("demi-finale de conférence traitée comme un meilleur des cinq");
  }
  if (seriesWinsRequired("1995-96", 4) !== 4) {
    errors.push("finale NBA traitée comme un meilleur des cinq");
  }

  return errors;
}
