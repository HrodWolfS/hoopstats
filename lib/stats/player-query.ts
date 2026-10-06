import type { Prisma } from "@prisma/client";
import { ALL_SEASONS, currentSeason } from "@/lib/nba";
import {
  getPlayerMetric,
  type PlayerMetricKey,
} from "@/lib/stats/metrics";

export const PLAYER_EXPLORER_METRICS = [
  "pointsPerGame",
  "reboundsPerGame",
  "assistsPerGame",
  "stealsPerGame",
  "blocksPerGame",
  "minutesPerGame",
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

export type PlayerExplorerMetric = (typeof PLAYER_EXPLORER_METRICS)[number];
export type SortDirection = "asc" | "desc";
export type MetricDisplayMode = "perGame" | "total" | "per36";

export type PlayerExplorerParams = {
  season: string;
  query: string;
  team: string;
  position: string;
  metric: PlayerExplorerMetric;
  direction: SortDirection;
  mode: MetricDisplayMode;
  minimumGames: number;
  minimumMinutes: number;
  page: number;
};

const POSITIONS = new Set(["G", "PG", "SG", "F", "SF", "PF", "C"]);
const NULLABLE_METRICS = new Set<PlayerExplorerMetric>([
  "fgPct",
  "threePtPct",
  "ftPct",
  "trueShooting",
  "usageRate",
  "per",
  "offRating",
  "defRating",
  "netRating",
]);
const COUNTING_METRICS = new Set<PlayerExplorerMetric>([
  "pointsPerGame",
  "reboundsPerGame",
  "assistsPerGame",
  "stealsPerGame",
  "blocksPerGame",
]);

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function boundedInteger(value: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function parsePlayerExplorerParams(
  input: Record<string, string | string[] | undefined>,
): PlayerExplorerParams {
  const requestedMetric = first(input.stat) as PlayerExplorerMetric;
  const metric = PLAYER_EXPLORER_METRICS.includes(requestedMetric)
    ? requestedMetric
    : "pointsPerGame";
  const defaultDirection = getPlayerMetric(metric).higherIsBetter ? "desc" : "asc";
  const requestedDirection = first(input.ordre);
  const requestedSeason = first(input.saison);
  const requestedPosition = first(input.position).toUpperCase();
  const requestedMode = first(input.mode) as MetricDisplayMode;
  const mode =
    COUNTING_METRICS.has(metric) &&
    (requestedMode === "total" || requestedMode === "per36")
      ? requestedMode
      : "perGame";

  return {
    season: ALL_SEASONS.includes(requestedSeason)
      ? requestedSeason
      : currentSeason(),
    query: first(input.q).trim().slice(0, 80),
    team: first(input.equipe).trim().toUpperCase().slice(0, 3),
    position: POSITIONS.has(requestedPosition) ? requestedPosition : "",
    metric,
    mode,
    direction:
      requestedDirection === "asc" || requestedDirection === "desc"
        ? requestedDirection
        : defaultDirection,
    minimumGames: boundedInteger(first(input.min_mj), 10, 0, 82),
    minimumMinutes: boundedInteger(first(input.min_min), 0, 0, 48),
    page: boundedInteger(first(input.page), 1, 1, 10_000),
  };
}

/**
 * Filtre base de l'explorateur : saison, équipe, joueur.
 *
 * Les seuils (matchs, minutes) et la disponibilité de la métrique ne sont pas
 * filtrés en base : ils s'appliquent à la ligne consolidée d'un joueur
 * transféré, via `passesExplorerThresholds`. Filtrés par passage, ils
 * écarteraient un joueur à 40 + 30 matchs d'un seuil de 50.
 */
export function buildPlayerExplorerWhere(
  params: PlayerExplorerParams,
): Prisma.PlayerSeasonWhereInput {
  const playerFilter: Prisma.PlayerWhereInput = {
    ...(params.position ? { position: params.position } : {}),
    ...(params.query
      ? {
          OR: [
            {
              firstName: {
                contains: params.query,
                mode: "insensitive" as const,
              },
            },
            {
              lastName: {
                contains: params.query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };
  const hasPlayerFilter =
    params.position !== "" || params.query !== "";

  return {
    season: params.season,
    ...(params.team ? { team: { abbr: params.team } } : {}),
    ...(hasPlayerFilter ? { player: playerFilter } : {}),
  };
}

export function passesExplorerThresholds(
  row: { gamesPlayed: number; minutesPerGame: number } &
    Partial<Record<PlayerExplorerMetric, number | null>>,
  params: PlayerExplorerParams,
): boolean {
  if (row.gamesPlayed < params.minimumGames) return false;
  if (row.minutesPerGame < params.minimumMinutes) return false;
  return !NULLABLE_METRICS.has(params.metric) || row[params.metric] != null;
}

export function buildExplorerUrl(
  locale: string,
  params: PlayerExplorerParams,
  overrides: Partial<PlayerExplorerParams> = {},
): string {
  const next = { ...params, ...overrides };
  const query = new URLSearchParams();
  query.set("saison", next.season);
  query.set("stat", next.metric);
  query.set("ordre", next.direction);
  query.set("mode", next.mode);
  query.set("min_mj", String(next.minimumGames));
  if (next.minimumMinutes > 0) {
    query.set("min_min", String(next.minimumMinutes));
  }
  if (next.query) query.set("q", next.query);
  if (next.team) query.set("equipe", next.team);
  if (next.position) query.set("position", next.position);
  if (next.page > 1) query.set("page", String(next.page));
  return `/${locale}/joueurs?${query.toString()}`;
}

export function availableMetricModes(
  metric: PlayerExplorerMetric,
): readonly MetricDisplayMode[] {
  return COUNTING_METRICS.has(metric)
    ? (["perGame", "total", "per36"] as const)
    : (["perGame"] as const);
}

export function computeMetricValue(
  metricValue: number | null,
  gamesPlayed: number,
  minutesPerGame: number,
  mode: MetricDisplayMode,
): number | null {
  if (metricValue == null) return null;
  if (mode === "total") return metricValue * gamesPlayed;
  if (mode === "per36") {
    return minutesPerGame > 0 ? (metricValue / minutesPerGame) * 36 : null;
  }
  return metricValue;
}
