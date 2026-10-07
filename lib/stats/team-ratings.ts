/**
 * Ratings d'équipe (ORtg, DRtg, Net Rating, Pace) recalculés depuis les
 * totaux d'équipe des box scores.
 *
 * `TeamSeason` prévoit ces colonnes mais aucun import ne les remplit : les
 * afficher telles quelles donnerait des « — » partout, et les présenter comme
 * officielles serait faux. On les dérive donc des box scores de saison
 * régulière avec l'estimation de possessions usuelle :
 *
 *   possessions ≈ FGA + 0,44 × FTA − OREB + TOV
 *
 * moyennée entre les deux équipes de chaque match (elles ont, à une
 * possession près, le même nombre de possessions). Les chiffres peuvent
 * différer de quelques dixièmes de ceux de NBA.com, qui compte les
 * possessions sur le play-by-play.
 *
 * Module pur, sans accès base, pour rester exécutable par `pnpm health:data`.
 */

export type TeamBoxLine = {
  pts: number;
  fga: number;
  fta: number;
  oreb: number;
  tov: number;
};

export type TeamGameBox = {
  homeTeamId: string;
  awayTeamId: string;
  home: TeamBoxLine;
  away: TeamBoxLine;
  /** Périodes jouées, prolongations comprises (4 = temps réglementaire). */
  periods: number;
};

export type TeamRatingKey = "offRating" | "defRating" | "netRating" | "pace";

export type TeamRatings = {
  games: number;
  offRating: number;
  defRating: number;
  netRating: number;
  pace: number;
  /** Rang dans la ligue (1 = meilleur ; pour le Pace, 1 = le plus rapide). */
  ranks: Record<TeamRatingKey, number>;
  /** Nombre d'équipes classées. */
  teamCount: number;
};

/** Sens du classement : DRtg se lit à l'envers, moins on encaisse mieux c'est. */
export const TEAM_RATING_HIGHER_IS_BETTER: Record<TeamRatingKey, boolean> = {
  offRating: true,
  defRating: false,
  netRating: true,
  pace: true,
};

export function estimatePossessions(line: TeamBoxLine): number {
  return line.fga + 0.44 * line.fta - line.oreb + line.tov;
}

/** Minutes d'un match : 48 en temps réglementaire, 5 de plus par prolongation. */
export function gameMinutes(periods: number): number {
  return 48 + 5 * Math.max(0, periods - 4);
}

type Accumulator = { games: number; pts: number; oppPts: number; poss: number; minutes: number };

/**
 * Ratings de chaque équipe sur l'ensemble des matchs fournis, avec leur rang.
 * Les rangs sont calculés sur la valeur arrondie au dixième affichée : deux
 * équipes affichées à égalité partagent le même rang.
 */
export function computeTeamRatings(games: readonly TeamGameBox[]): Map<string, TeamRatings> {
  const acc = new Map<string, Accumulator>();
  const add = (teamId: string, pts: number, oppPts: number, poss: number, minutes: number) => {
    const row = acc.get(teamId) ?? { games: 0, pts: 0, oppPts: 0, poss: 0, minutes: 0 };
    row.games += 1;
    row.pts += pts;
    row.oppPts += oppPts;
    row.poss += poss;
    row.minutes += minutes;
    acc.set(teamId, row);
  };

  for (const game of games) {
    const poss = (estimatePossessions(game.home) + estimatePossessions(game.away)) / 2;
    if (!(poss > 0)) continue;
    const minutes = gameMinutes(game.periods);
    add(game.homeTeamId, game.home.pts, game.away.pts, poss, minutes);
    add(game.awayTeamId, game.away.pts, game.home.pts, poss, minutes);
  }

  const values = [...acc].map(([teamId, row]) => {
    const offRating = (100 * row.pts) / row.poss;
    const defRating = (100 * row.oppPts) / row.poss;
    return {
      teamId,
      games: row.games,
      offRating,
      defRating,
      netRating: offRating - defRating,
      pace: (48 * row.poss) / row.minutes,
    };
  });

  const round = (value: number) => Math.round(value * 10) / 10;
  const rankOf = (key: TeamRatingKey, value: number) => {
    const sign = TEAM_RATING_HIGHER_IS_BETTER[key] ? 1 : -1;
    const mine = round(value) * sign;
    return 1 + values.filter((other) => round(other[key]) * sign > mine).length;
  };

  const result = new Map<string, TeamRatings>();
  for (const { teamId, ...row } of values) {
    result.set(teamId, {
      ...row,
      ranks: {
        offRating: rankOf("offRating", row.offRating),
        defRating: rankOf("defRating", row.defRating),
        netRating: rankOf("netRating", row.netRating),
        pace: rankOf("pace", row.pace),
      },
      teamCount: values.length,
    });
  }
  return result;
}

/** Auto-contrôles exécutés par `pnpm health:data`. */
export function validateTeamRatings(): string[] {
  const errors: string[] = [];
  const near = (actual: number | undefined, expected: number) =>
    actual !== undefined && Math.abs(actual - expected) < 1e-9;

  // 80 + 0,44×20 − 10 + 12 = 90,8 possessions de chaque côté.
  const line = (pts: number): TeamBoxLine => ({ pts, fga: 80, fta: 20, oreb: 10, tov: 12 });
  if (!near(estimatePossessions(line(0)), 90.8)) {
    errors.push("estimation des possessions erronée");
  }

  const ratings = computeTeamRatings([
    { homeTeamId: "A", awayTeamId: "B", home: line(109), away: line(100), periods: 4 },
    { homeTeamId: "B", awayTeamId: "A", home: line(104), away: line(104), periods: 5 },
  ]);
  const a = ratings.get("A");
  const b = ratings.get("B");
  if (!a || !b) return [...errors, "équipe absente des ratings"];

  // 213 points marqués et 204 encaissés sur 181,6 possessions.
  if (!near(a.offRating, (100 * 213) / 181.6)) errors.push("ORtg erroné");
  if (!near(a.defRating, (100 * 204) / 181.6)) errors.push("DRtg erroné");
  if (!near(a.netRating, a.offRating - a.defRating)) errors.push("Net Rating ≠ ORtg − DRtg");
  if (!near(a.netRating, -b.netRating)) errors.push("Net Ratings non opposés sur deux équipes");

  // La prolongation allonge le match : le Pace se ramène à 48 minutes.
  if (!near(a.pace, (48 * 181.6) / (48 + 53))) errors.push("prolongation non prise en compte dans le Pace");

  // A encaisse 204 points, B 213 : A a la meilleure défense, donc le rang 1.
  if (a.ranks.offRating !== 1 || a.ranks.defRating !== 1 || b.ranks.defRating !== 2) {
    errors.push("rangs erronés (DRtg doit se classer du plus bas au plus haut)");
  }
  if (a.ranks.pace !== 1 || b.ranks.pace !== 1) errors.push("égalité de Pace non partagée");
  if (a.teamCount !== 2) errors.push("nombre d'équipes classées erroné");

  // Match sans possession (box score vide) : ignoré plutôt que divisé par zéro.
  const empty = { pts: 0, fga: 0, fta: 0, oreb: 0, tov: 0 };
  if (computeTeamRatings([{ homeTeamId: "A", awayTeamId: "B", home: empty, away: empty, periods: 4 }]).size !== 0) {
    errors.push("box score vide compté dans les ratings");
  }

  return errors;
}
