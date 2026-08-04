/**
 * Agrégation des saisons et des carrières joueurs.
 *
 * Deux règles gouvernent ce module (feuille de route § 0.3) :
 *
 * 1. Une moyenne par match ne s'agrège jamais en moyennant des moyennes.
 *    Elle se pondère par le nombre de matchs joués. Pour une statistique de
 *    comptage, `moyenne × matchs` reconstitue le total exact, donc la
 *    pondération redonne la vraie moyenne — sans stocker les totaux.
 *
 * 2. Un pourcentage ne s'agrège pas sans les volumes de tentatives. Ni la
 *    moyenne simple ni la pondération par matchs ne donnent le bon résultat :
 *    un joueur peut tirer beaucoup plus par match sur une période que sur une
 *    autre. Tant que `PlayerSeason` ne stocke pas les tentatives, ces valeurs
 *    sont exposées à `null` plutôt qu'approximées silencieusement.
 */

/** Ligne `PlayerSeason` telle que stockée : une par équipe et par saison. */
export type SeasonStint = {
  season: string;
  teamAbbr: string;
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
};

/**
 * Saison consolidée : une seule ligne par saison, quelle que soit le nombre
 * d'équipes traversées.
 */
export type ConsolidatedSeason = SeasonStint & {
  /** Équipes traversées dans l'ordre décroissant de matchs joués. */
  teams: string[];
  /** Vrai lorsque la saison agrège plusieurs passages en équipe. */
  isMultiTeam: boolean;
};

/** Abréviation conventionnelle d'une saison à plusieurs équipes. */
export const MULTI_TEAM_ABBR = "TOT";

/** Statistiques de comptage : pondérables exactement par les matchs joués. */
const COUNTING_KEYS = [
  "minutesPerGame",
  "pointsPerGame",
  "reboundsPerGame",
  "assistsPerGame",
  "stealsPerGame",
  "blocksPerGame",
] as const satisfies readonly (keyof SeasonStint)[];

type CountingKey = (typeof COUNTING_KEYS)[number];

/**
 * Moyenne par match pondérée par les matchs joués.
 *
 * Retourne `null` si aucun match n'a été joué : une moyenne n'a alors pas de
 * sens, et renvoyer 0 laisserait croire à une performance nulle.
 */
export function weightedPerGame(
  rows: readonly SeasonStint[],
  key: CountingKey,
): number | null {
  const games = totalGamesPlayed(rows);
  if (games === 0) return null;

  const total = rows.reduce((sum, row) => sum + row[key] * row.gamesPlayed, 0);
  return total / games;
}

/** Somme des matchs joués, en ignorant les valeurs aberrantes négatives. */
export function totalGamesPlayed(rows: readonly SeasonStint[]): number {
  return rows.reduce((sum, row) => sum + Math.max(0, row.gamesPlayed), 0);
}

/**
 * Fusionne les passages en équipe d'une même saison en une ligne unique.
 *
 * Les saisons sont retournées dans l'ordre chronologique. Une saison jouée
 * dans une seule équipe est conservée telle quelle, pourcentages compris.
 */
export function consolidateSeasons(
  rows: readonly SeasonStint[],
): ConsolidatedSeason[] {
  const bySeason = new Map<string, SeasonStint[]>();
  for (const row of rows) {
    const stints = bySeason.get(row.season);
    if (stints) stints.push(row);
    else bySeason.set(row.season, [row]);
  }

  return [...bySeason.entries()]
    .map(([season, stints]) => consolidateStints(season, stints))
    .sort((a, b) => a.season.localeCompare(b.season));
}

function consolidateStints(
  season: string,
  stints: readonly SeasonStint[],
): ConsolidatedSeason {
  const teams = [...stints]
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
    .map((stint) => stint.teamAbbr);

  if (stints.length === 1) {
    return { ...stints[0], season, teams, isMultiTeam: false };
  }

  const counting = Object.fromEntries(
    COUNTING_KEYS.map((key) => [key, weightedPerGame(stints, key) ?? 0]),
  ) as Record<CountingKey, number>;

  return {
    season,
    teamAbbr: MULTI_TEAM_ABBR,
    teams,
    isMultiTeam: true,
    gamesPlayed: totalGamesPlayed(stints),
    ...counting,
    // Volumes de tentatives absents du modèle : aucune agrégation exacte.
    fgPct: null,
    threePtPct: null,
    ftPct: null,
  };
}

/** Moyennes de carrière, pondérées par les matchs joués. */
export type CareerAverages = {
  seasonsPlayed: number;
  gamesPlayed: number;
  minutesPerGame: number | null;
  pointsPerGame: number | null;
  reboundsPerGame: number | null;
  assistsPerGame: number | null;
  stealsPerGame: number | null;
  blocksPerGame: number | null;
};

/**
 * Calcule les moyennes de carrière à partir des lignes brutes.
 *
 * Les passages en équipe sont consolidés au préalable pour que le nombre de
 * saisons reflète les saisons réellement jouées, et non les lignes stockées.
 */
export function computeCareerAverages(
  rows: readonly SeasonStint[],
): CareerAverages {
  const seasons = consolidateSeasons(rows);

  return {
    seasonsPlayed: seasons.length,
    gamesPlayed: totalGamesPlayed(seasons),
    minutesPerGame: weightedPerGame(seasons, "minutesPerGame"),
    pointsPerGame: weightedPerGame(seasons, "pointsPerGame"),
    reboundsPerGame: weightedPerGame(seasons, "reboundsPerGame"),
    assistsPerGame: weightedPerGame(seasons, "assistsPerGame"),
    stealsPerGame: weightedPerGame(seasons, "stealsPerGame"),
    blocksPerGame: weightedPerGame(seasons, "blocksPerGame"),
  };
}

// ── Auto-contrôles ───────────────────────────────────────────────────────────

function stint(
  season: string,
  teamAbbr: string,
  gamesPlayed: number,
  pointsPerGame: number,
): SeasonStint {
  return {
    season,
    teamAbbr,
    gamesPlayed,
    pointsPerGame,
    minutesPerGame: 0,
    reboundsPerGame: 0,
    assistsPerGame: 0,
    stealsPerGame: 0,
    blocksPerGame: 0,
    fgPct: 0.5,
    threePtPct: 0.35,
    ftPct: 0.8,
  };
}

function near(actual: number | null, expected: number): boolean {
  return actual !== null && Math.abs(actual - expected) < 0.005;
}

/**
 * Cas de contrôle de la feuille de route § 0.3, exécutés par `pnpm health:data`.
 */
export function validateCareerAggregation(): string[] {
  const errors: string[] = [];

  // Joueur resté dans une seule équipe : la moyenne ne bouge pas.
  const single = computeCareerAverages([stint("2023-24", "SAS", 70, 21)]);
  if (!near(single.pointsPerGame, 21)) {
    errors.push("équipe unique : moyenne altérée");
  }
  if (single.seasonsPlayed !== 1 || single.gamesPlayed !== 70) {
    errors.push("équipe unique : saisons ou matchs incorrects");
  }

  // Joueur transféré une fois : pondération par les matchs, pas moyenne simple.
  // (60 × 20 + 10 × 10) / 70 = 18.57 — la moyenne naïve donnerait 15.
  const traded = computeCareerAverages([
    stint("2023-24", "BKN", 60, 20),
    stint("2023-24", "LAC", 10, 10),
  ]);
  if (!near(traded.pointsPerGame, 1300 / 70)) {
    errors.push("transfert : pondération par matchs non appliquée");
  }
  if (traded.seasonsPlayed !== 1) {
    errors.push("transfert : la saison est comptée plusieurs fois");
  }

  // Trois équipes ou plus sur une même saison.
  const threeTeams = consolidateSeasons([
    stint("2023-24", "MIL", 10, 6),
    stint("2023-24", "DET", 40, 12),
    stint("2023-24", "GSW", 30, 9),
  ]);
  if (threeTeams.length !== 1) {
    errors.push("trois équipes : saison non consolidée");
  } else {
    const [season] = threeTeams;
    if (season.teamAbbr !== MULTI_TEAM_ABBR || !season.isMultiTeam) {
      errors.push("trois équipes : ligne consolidée non signalée");
    }
    if (season.gamesPlayed !== 80) {
      errors.push("trois équipes : matchs non additionnés");
    }
    if (season.teams[0] !== "DET") {
      errors.push("trois équipes : ordre des équipes incorrect");
    }
    if (season.fgPct !== null || season.threePtPct !== null || season.ftPct !== null) {
      errors.push("trois équipes : pourcentage agrégé sans volumes de tirs");
    }
  }

  // Saison partielle : aucune règle de seuil ne doit fausser la moyenne.
  const partial = computeCareerAverages([
    stint("2022-23", "NYK", 72, 24),
    stint("2023-24", "NYK", 8, 12),
  ]);
  if (!near(partial.pointsPerGame, (72 * 24 + 8 * 12) / 80)) {
    errors.push("saison partielle : pondération incorrecte");
  }

  // Joueur sans match : pas de moyenne inventée, et aucune division par zéro.
  const noGames = computeCareerAverages([stint("2023-24", "SAS", 0, 0)]);
  if (noGames.pointsPerGame !== null || noGames.gamesPlayed !== 0) {
    errors.push("aucun match : moyenne devrait être indisponible");
  }

  // Une saison dans une seule équipe conserve ses pourcentages.
  const [kept] = consolidateSeasons([stint("2023-24", "SAS", 70, 21)]);
  if (kept.fgPct === null) {
    errors.push("équipe unique : pourcentage perdu à tort");
  }

  return errors;
}
