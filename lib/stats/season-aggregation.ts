/**
 * Agrégation d'une saison joueur à partir de ses lignes de box score.
 *
 * Décision 001 : les box scores ESPN sont la source des statistiques de
 * comptage et des pourcentages de tir. Les métriques avancées non dérivables
 * (PER, USG%, ORtg, DRtg, NRtg) ne sont pas produites ici et ne doivent pas
 * être écrasées par l'appelant.
 *
 * Deux principes gouvernent le calcul :
 *
 *  1. Les moyennes se calculent sur les totaux, jamais en moyennant des
 *     moyennes par match.
 *  2. Un pourcentage sans tentative vaut `null`, pas zéro. Zéro affirmerait
 *     que le joueur a échoué ; l'absence dit qu'il n'a pas tenté.
 */

export type BoxScoreLine = {
  minutes: string | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  fgm: number | null;
  fga: number | null;
  threePm: number | null;
  threePa: number | null;
  ftm: number | null;
  fta: number | null;
};

export type DerivedSeason = {
  gamesPlayed: number;
  minutesPerGame: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  fgPct: number | null;
  threePtPct: number | null;
  ftPct: number | null;
  trueShooting: number | null;
};

/**
 * Minutes ESPN vers un nombre décimal.
 *
 * Le champ arrive sous « 34 », « 34:30 », ou « -- » pour un joueur resté sur
 * le banc. Les secondes comptent : les ignorer sous-estimerait le temps de
 * jeu d'une demi-minute par match en moyenne.
 */
export function parseMinutes(raw: string | null): number {
  if (!raw) return 0;

  const [minutes, seconds] = raw.split(":");
  const parsedMinutes = Number.parseInt(minutes, 10);
  if (!Number.isFinite(parsedMinutes)) return 0;

  const parsedSeconds = seconds ? Number.parseInt(seconds, 10) : 0;
  return parsedMinutes + (Number.isFinite(parsedSeconds) ? parsedSeconds / 60 : 0);
}

function sum(lines: readonly BoxScoreLine[], pick: (line: BoxScoreLine) => number | null): number {
  return lines.reduce((total, line) => total + (pick(line) ?? 0), 0);
}

/** Ratio réussis/tentés, ou `null` faute de tentative. */
function ratio(made: number, attempted: number): number | null {
  return attempted === 0 ? null : made / attempted;
}

/**
 * Moyennes de saison d'un joueur pour une équipe donnée.
 *
 * Retourne `null` sans aucune ligne : une saison sans match n'a pas de
 * moyenne, et en fabriquer une à zéro laisserait croire à une contre-performance.
 */
export function deriveSeasonFromBoxScores(
  lines: readonly BoxScoreLine[],
): DerivedSeason | null {
  const games = lines.length;
  if (games === 0) return null;

  const points = sum(lines, (line) => line.pts);
  const fieldGoalsAttempted = sum(lines, (line) => line.fga);
  const freeThrowsAttempted = sum(lines, (line) => line.fta);

  // TS% = points / (2 × (tirs tentés + 0,44 × lancers tentés)), formule NBA.
  const shootingPossessions =
    fieldGoalsAttempted + 0.44 * freeThrowsAttempted;

  return {
    gamesPlayed: games,
    minutesPerGame:
      lines.reduce((total, line) => total + parseMinutes(line.minutes), 0) / games,
    pointsPerGame: points / games,
    reboundsPerGame: sum(lines, (line) => line.reb) / games,
    assistsPerGame: sum(lines, (line) => line.ast) / games,
    stealsPerGame: sum(lines, (line) => line.stl) / games,
    blocksPerGame: sum(lines, (line) => line.blk) / games,
    fgPct: ratio(sum(lines, (line) => line.fgm), fieldGoalsAttempted),
    threePtPct: ratio(sum(lines, (line) => line.threePm), sum(lines, (line) => line.threePa)),
    ftPct: ratio(sum(lines, (line) => line.ftm), freeThrowsAttempted),
    trueShooting:
      shootingPossessions === 0 ? null : points / (2 * shootingPossessions),
  };
}

// ── Auto-contrôles ───────────────────────────────────────────────────────────

function line(partial: Partial<BoxScoreLine>): BoxScoreLine {
  return {
    minutes: null,
    pts: null,
    reb: null,
    ast: null,
    stl: null,
    blk: null,
    fgm: null,
    fga: null,
    threePm: null,
    threePa: null,
    ftm: null,
    fta: null,
    ...partial,
  };
}

function near(actual: number | null, expected: number): boolean {
  return actual !== null && Math.abs(actual - expected) < 0.0005;
}

/** Cas de contrôle exécutés par `pnpm health:data`. */
export function validateSeasonAggregation(): string[] {
  const errors: string[] = [];

  // Minutes : entier, format mm:ss, valeur absente ou non numérique.
  if (parseMinutes("34") !== 34) errors.push("minutes entières mal lues");
  if (!near(parseMinutes("34:30"), 34.5)) errors.push("secondes ignorées");
  if (parseMinutes("--") !== 0) errors.push("minutes absentes mal lues");
  if (parseMinutes(null) !== 0) errors.push("minutes nulles mal lues");

  // Aucune ligne : pas de moyenne inventée.
  if (deriveSeasonFromBoxScores([]) !== null) {
    errors.push("saison sans match dotée de moyennes");
  }

  // Moyennes calculées sur les totaux.
  const twoGames = deriveSeasonFromBoxScores([
    line({ minutes: "30", pts: 20, reb: 10, ast: 5, fgm: 8, fga: 16 }),
    line({ minutes: "20", pts: 10, reb: 4, ast: 1, fgm: 2, fga: 4 }),
  ]);
  if (!near(twoGames?.pointsPerGame ?? null, 15)) {
    errors.push("moyenne de points incorrecte");
  }
  if (!near(twoGames?.minutesPerGame ?? null, 25)) {
    errors.push("moyenne de minutes incorrecte");
  }
  // 10/20 sur les totaux, quand la moyenne des taux par match donnerait 0,5.
  if (!near(twoGames?.fgPct ?? null, 0.5)) {
    errors.push("pourcentage de tir non calculé sur les totaux");
  }

  // Le pourcentage se pondère par le volume, pas par le nombre de matchs :
  // 1/1 puis 1/9 valent 20 %, quand la moyenne des taux donnerait 55,6 %.
  const volumeWeighted = deriveSeasonFromBoxScores([
    line({ pts: 2, fgm: 1, fga: 1 }),
    line({ pts: 2, fgm: 1, fga: 9 }),
  ]);
  if (!near(volumeWeighted?.fgPct ?? null, 0.2)) {
    errors.push("pourcentage non pondéré par le volume de tirs");
  }

  // Aucune tentative : pourcentage indisponible, pas nul.
  const noAttempts = deriveSeasonFromBoxScores([line({ pts: 0, minutes: "3" })]);
  if (noAttempts?.fgPct !== null || noAttempts?.threePtPct !== null) {
    errors.push("pourcentage à zéro alors qu'aucun tir n'a été tenté");
  }
  if (noAttempts?.trueShooting !== null) {
    errors.push("true shooting calculé sans aucune tentative");
  }

  // True shooting : 20 points sur 10 tirs et 4 lancers.
  const ts = deriveSeasonFromBoxScores([line({ pts: 20, fga: 10, fta: 4 })]);
  if (!near(ts?.trueShooting ?? null, 20 / (2 * (10 + 0.44 * 4)))) {
    errors.push("formule de true shooting incorrecte");
  }

  return errors;
}
