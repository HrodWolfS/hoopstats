export type PlayerMetricKey =
  | "gamesPlayed"
  | "minutesPerGame"
  | "pointsPerGame"
  | "reboundsPerGame"
  | "assistsPerGame"
  | "stealsPerGame"
  | "blocksPerGame"
  | "fgPct"
  | "threePtPct"
  | "ftPct"
  | "trueShooting"
  | "usageRate"
  | "per"
  | "offRating"
  | "defRating"
  | "netRating";

export type MetricMode = "count" | "perGame" | "percentage" | "per100";

export type PlayerMetricDefinition = {
  key: PlayerMetricKey;
  label: string;
  shortLabel: string;
  description: string;
  formula?: string;
  unit?: string;
  source: "NBA Stats API";
  availableSince: string;
  higherIsBetter: boolean;
  mode: MetricMode;
  minimumGames: number;
  showInGlossary: boolean;
};

export const PLAYER_METRICS: readonly PlayerMetricDefinition[] = [
  {
    key: "gamesPlayed",
    label: "Matchs joués",
    shortLabel: "MJ",
    description: "Nombre de matchs disputés pendant la saison.",
    source: "NBA Stats API",
    availableSince: "1980-81",
    higherIsBetter: true,
    mode: "count",
    minimumGames: 0,
    showInGlossary: true,
  },
  {
    key: "minutesPerGame",
    label: "Minutes par match",
    shortLabel: "MIN",
    description: "Temps de jeu moyen par match.",
    source: "NBA Stats API",
    availableSince: "1980-81",
    higherIsBetter: true,
    mode: "perGame",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "pointsPerGame",
    label: "Points par match",
    shortLabel: "PTS",
    description: "Nombre de points marqués par match en moyenne.",
    source: "NBA Stats API",
    availableSince: "1980-81",
    higherIsBetter: true,
    mode: "perGame",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "reboundsPerGame",
    label: "Rebonds par match",
    shortLabel: "REB",
    description: "Total moyen des rebonds offensifs et défensifs.",
    source: "NBA Stats API",
    availableSince: "1980-81",
    higherIsBetter: true,
    mode: "perGame",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "assistsPerGame",
    label: "Passes par match",
    shortLabel: "PAS",
    description: "Nombre moyen de passes directement à l’origine d’un panier.",
    source: "NBA Stats API",
    availableSince: "1980-81",
    higherIsBetter: true,
    mode: "perGame",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "stealsPerGame",
    label: "Interceptions par match",
    shortLabel: "INT",
    description: "Nombre moyen de possessions adverses interceptées.",
    source: "NBA Stats API",
    availableSince: "1980-81",
    higherIsBetter: true,
    mode: "perGame",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "blocksPerGame",
    label: "Contres par match",
    shortLabel: "CTR",
    description: "Nombre moyen de tirs adverses contrés.",
    source: "NBA Stats API",
    availableSince: "1980-81",
    higherIsBetter: true,
    mode: "perGame",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "fgPct",
    label: "Réussite aux tirs",
    shortLabel: "FG%",
    description: "Pourcentage de tirs réussis, hors lancers francs.",
    formula: "FGM / FGA",
    unit: "%",
    source: "NBA Stats API",
    availableSince: "1980-81",
    higherIsBetter: true,
    mode: "percentage",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "threePtPct",
    label: "Réussite à trois points",
    shortLabel: "3P%",
    description: "Pourcentage de tirs à trois points réussis.",
    formula: "3PM / 3PA",
    unit: "%",
    source: "NBA Stats API",
    availableSince: "1980-81",
    higherIsBetter: true,
    mode: "percentage",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "ftPct",
    label: "Réussite aux lancers francs",
    shortLabel: "LF%",
    description: "Pourcentage de lancers francs réussis.",
    formula: "FTM / FTA",
    unit: "%",
    source: "NBA Stats API",
    availableSince: "1980-81",
    higherIsBetter: true,
    mode: "percentage",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "trueShooting",
    label: "True Shooting",
    shortLabel: "TS%",
    description:
      "Efficacité de tir globale intégrant tirs à deux points, trois points et lancers francs.",
    formula: "PTS / (2 × (FGA + 0,44 × FTA))",
    unit: "%",
    source: "NBA Stats API",
    availableSince: "2015-16",
    higherIsBetter: true,
    mode: "percentage",
    minimumGames: 20,
    showInGlossary: true,
  },
  {
    key: "usageRate",
    label: "Usage Rate",
    shortLabel: "USG%",
    description:
      "Part des possessions de l’équipe utilisées par le joueur lorsqu’il est sur le terrain.",
    formula: "(FGA + 0,44 × FTA + TOV) / possessions disponibles",
    unit: "%",
    source: "NBA Stats API",
    availableSince: "2015-16",
    higherIsBetter: true,
    mode: "percentage",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "per",
    label: "Player Impact Estimate",
    shortLabel: "PIE",
    description:
      "Métrique NBA estimant la part de la performance totale d’un match attribuable au joueur. Ce champ ne contient pas le PER de John Hollinger.",
    formula: "Métrique propriétaire NBA.com",
    source: "NBA Stats API",
    availableSince: "2015-16",
    higherIsBetter: true,
    mode: "percentage",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "offRating",
    label: "Offensive Rating",
    shortLabel: "ORtg",
    description:
      "Points marqués par l’équipe pour 100 possessions lorsque le joueur est sur le terrain.",
    unit: "pts/100",
    source: "NBA Stats API",
    availableSince: "2015-16",
    higherIsBetter: true,
    mode: "per100",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "defRating",
    label: "Defensive Rating",
    shortLabel: "DRtg",
    description:
      "Points encaissés par l’équipe pour 100 possessions lorsque le joueur est sur le terrain.",
    unit: "pts/100",
    source: "NBA Stats API",
    availableSince: "2015-16",
    higherIsBetter: false,
    mode: "per100",
    minimumGames: 10,
    showInGlossary: true,
  },
  {
    key: "netRating",
    label: "Net Rating",
    shortLabel: "NRtg",
    description: "Différence entre l’Offensive Rating et le Defensive Rating.",
    formula: "ORtg − DRtg",
    unit: "pts/100",
    source: "NBA Stats API",
    availableSince: "2015-16",
    higherIsBetter: true,
    mode: "per100",
    minimumGames: 10,
    showInGlossary: true,
  },
];

export const PLAYER_SEASON_AGGREGATION_POLICY = {
  mode: "team-stints",
  description:
    "Le stockage conserve une ligne par équipe et par saison. À l’affichage, une saison transférée est consolidée en une ligne TOT dont les moyennes sont pondérées par les matchs joués. Les pourcentages restent indisponibles sur cette ligne tant que les volumes de tirs nécessaires au calcul exact ne sont pas stockés.",
} as const;

export function getPlayerMetric(key: PlayerMetricKey): PlayerMetricDefinition {
  const metric = PLAYER_METRICS.find((candidate) => candidate.key === key);
  if (!metric) throw new Error(`Métrique joueur inconnue : ${key}`);
  return metric;
}

export function validatePlayerMetricRegistry(): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  const shortLabels = new Set<string>();

  for (const metric of PLAYER_METRICS) {
    if (keys.has(metric.key)) errors.push(`clé dupliquée : ${metric.key}`);
    if (shortLabels.has(metric.shortLabel)) {
      errors.push(`abréviation dupliquée : ${metric.shortLabel}`);
    }
    if (metric.minimumGames < 0) {
      errors.push(`minimum de matchs négatif : ${metric.key}`);
    }
    if (metric.mode === "percentage" && metric.unit !== "%" && metric.key !== "per") {
      errors.push(`unité pourcentage manquante : ${metric.key}`);
    }
    keys.add(metric.key);
    shortLabels.add(metric.shortLabel);
  }

  return errors;
}
