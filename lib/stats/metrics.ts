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

/**
 * Conditions pour figurer dans un classement de la métrique.
 *
 * `gamesShare` est la part des matchs de l'équipe à disputer, appliquée à
 * l'avancement de la saison (0 = aucun seuil). `rule` dit d'où vient le
 * seuil : la règle officielle NBA.com, ou un choix hoopstats documenté
 * quand la NBA n'en publie pas d'applicable à nos données.
 */
export type MetricQualification = {
  rule: "nba" | "hoopstats" | "none";
  gamesShare: number;
  minMinutesPerGame?: number;
  minPointsPerGame?: number;
};

/** Règle NBA.com des leaders : 70 % des matchs de l'équipe (58 sur 82). */
const NBA_GAMES: MetricQualification = { rule: "nba", gamesShare: 0.7 };

/**
 * Pourcentages : la NBA exige un volume de paniers réussis (300 tirs, 82
 * paniers à trois points, 125 lancers francs). Ces volumes ne sont pas
 * stockés : on garde la seule condition de matchs, plus un temps de jeu.
 */
const SHOOTING: MetricQualification = { rule: "hoopstats", gamesShare: 0.7, minMinutesPerGame: 20 };

/**
 * Métriques « sur le terrain » : sans temps de jeu minimum, un remplaçant
 * de fin de match aux 5 minutes par soir domine le classement par le bruit.
 */
const ON_COURT: MetricQualification = { rule: "hoopstats", gamesShare: 0.7, minMinutesPerGame: 20 };

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
  qualification: MetricQualification;
  /** Ce que la valeur ne dit pas, ou ce que nos données ne permettent pas. */
  limits?: string;
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
    qualification: { rule: "none", gamesShare: 0 },
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
    qualification: NBA_GAMES,
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
    qualification: NBA_GAMES,
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
    qualification: NBA_GAMES,
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
    qualification: NBA_GAMES,
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
    qualification: NBA_GAMES,
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
    qualification: NBA_GAMES,
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
    qualification: SHOOTING,
    limits:
      "La NBA qualifie au volume de paniers réussis, que nos données ne stockent pas : un joueur sous ce volume peut apparaître ici.",
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
    qualification: SHOOTING,
    limits:
      "La NBA qualifie au volume de paniers réussis, que nos données ne stockent pas : un joueur sous ce volume peut apparaître ici.",
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
    qualification: SHOOTING,
    limits:
      "La NBA qualifie au volume de paniers réussis, que nos données ne stockent pas : un joueur sous ce volume peut apparaître ici.",
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
    qualification: { rule: "hoopstats", gamesShare: 0.7, minMinutesPerGame: 20, minPointsPerGame: 10 },
    limits:
      "Sans seuil de volume, des pivots à trois tirs par match dominent : 20 minutes et 10 points par match réservent le classement aux joueurs dont l’efficacité porte une attaque.",
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
    qualification: ON_COURT,
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
    qualification: ON_COURT,
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
    qualification: ON_COURT,
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
    qualification: ON_COURT,
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
    qualification: ON_COURT,
    limits:
      "Dépend fortement des coéquipiers et des adversaires présents sur le terrain : ce n’est pas une mesure individuelle isolée.",
    showInGlossary: true,
  },
];

/**
 * Métriques exposées dont la colonne `PlayerSeason` est optionnelle.
 *
 * Une métrique publiée doit être alimentée : une colonne vide affichée comme
 * une donnée réelle est pire qu'une métrique absente. `pnpm health:data`
 * vérifie que chacune de ces colonnes contient au moins une valeur.
 *
 * BPM, VORP et Win Shares sont volontairement absents du registre : les
 * colonnes existent en base mais ne sont alimentées par aucun import, faute
 * de source autorisée. Tant que c'est le cas, ils ne doivent pas être exposés.
 */
export const NULLABLE_METRIC_COLUMNS = [
  "fgPct",
  "threePtPct",
  "ftPct",
  "trueShooting",
  "usageRate",
  "per",
  "offRating",
  "defRating",
  "netRating",
] as const satisfies readonly PlayerMetricKey[];

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
    const { rule, gamesShare } = metric.qualification;
    if (gamesShare < 0 || gamesShare > 1) {
      errors.push(`part de matchs hors de [0, 1] : ${metric.key}`);
    }
    if ((rule === "none") !== (gamesShare === 0)) {
      errors.push(`règle de qualification incohérente : ${metric.key}`);
    }
    if (metric.mode === "percentage" && metric.unit !== "%" && metric.key !== "per") {
      errors.push(`unité pourcentage manquante : ${metric.key}`);
    }
    keys.add(metric.key);
    shortLabels.add(metric.shortLabel);
  }

  return errors;
}
