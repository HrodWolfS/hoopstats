import { currentSeason } from "@/lib/nba";
import type { PlayerMetricKey } from "@/lib/stats/metrics";

/**
 * Provenance des données affichées, pour le bloc « Source et mise à jour ».
 *
 * Chaque origine dit d'où vient un chiffre et quels journaux `SyncLog`
 * datent sa dernière mise à jour. La nature distingue ce que la NBA publie
 * (officielle), ce qu'un fournisseur tiers nous transmet tel quel (importée)
 * et ce que hoopstats recalcule (calculée) : une moyenne recalculée ne doit
 * jamais passer pour un chiffre officiel.
 */

/** Première saison dont les box scores d'équipe sont en base (ratings, tendances). */
export const TEAM_BOX_SCORES_SINCE = "2025-26";

export type DataKind = "official" | "imported" | "computed";

export const DATA_KIND_LABEL: Record<DataKind, string> = {
  official: "Officielle",
  imported: "Importée",
  computed: "Calculée",
};

export type DataOrigin = {
  kind: DataKind;
  label: string;
  logSources: readonly string[];
};

export const DATA_ORIGINS = {
  seasonStats: {
    kind: "computed",
    label: "Moyennes recalculées par hoopstats à partir des box scores ESPN",
    logSources: ["sync-daily"],
  },
  historicStats: {
    kind: "official",
    label: "Statistiques NBA Stats API",
    logSources: ["import-player-stats", "import-player-stats-history"],
  },
  advancedStats: {
    kind: "official",
    label: "Stats avancées NBA Stats API",
    logSources: ["import-advanced"],
  },
  games: {
    kind: "imported",
    label: "Scores et box scores ESPN",
    logSources: ["sync-daily", "sync-box-scores"],
  },
  standings: {
    kind: "imported",
    label: "Classements ESPN",
    logSources: ["sync-daily", "import-standings", "backfill-standings"],
  },
  teamRatings: {
    kind: "computed",
    label: "Ratings et rythme d'équipe calculés par hoopstats à partir des box scores ESPN",
    logSources: ["sync-daily", "sync-box-scores"],
  },
  trends: {
    kind: "computed",
    label: "Tendances calculées par hoopstats à partir des box scores ESPN",
    logSources: ["sync-daily", "sync-box-scores"],
  },
  playoffs: {
    kind: "imported",
    label: "Séries de playoffs ESPN",
    logSources: ["sync-playoffs", "import-playoff-history"],
  },
} as const satisfies Record<string, DataOrigin>;

export type DataOriginKey = keyof typeof DATA_ORIGINS;

/**
 * Métriques qu'un box score ne permet pas de recalculer : elles restent à
 * leur dernière valeur importée de l'API NBA, saison en cours comprise.
 */
const POSSESSION_METRICS: readonly PlayerMetricKey[] = [
  "usageRate",
  "per",
  "offRating",
  "defRating",
  "netRating",
];

/** Origine des stats joueurs d'une saison, pour une métrique donnée. */
export function playerStatsOrigin(
  season: string,
  metric?: PlayerMetricKey,
  now?: Date,
): DataOriginKey {
  if (metric && POSSESSION_METRICS.includes(metric)) return "advancedStats";
  return season === currentSeason(now) ? "seasonStats" : "historicStats";
}

/** Dernière mise à jour réussie d'une origine, parmi ses journaux. */
export function latestUpdate(
  origin: DataOrigin,
  logs: readonly { source: string; completedAt: Date }[],
): Date | null {
  return logs
    .filter((log) => origin.logSources.includes(log.source))
    .reduce<Date | null>(
      (latest, log) => (latest && latest >= log.completedAt ? latest : log.completedAt),
      null,
    );
}
