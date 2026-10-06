import type { PlayerSeason } from "@prisma/client";
import type { PlayerMetricKey } from "@/lib/stats/metrics";

export const LEADERBOARDS = [
  { slug: "points", metric: "pointsPerGame", label: "Points par match" },
  { slug: "rebonds", metric: "reboundsPerGame", label: "Rebonds par match" },
  { slug: "passes", metric: "assistsPerGame", label: "Passes par match" },
  { slug: "interceptions", metric: "stealsPerGame", label: "Interceptions par match" },
  { slug: "true-shooting", metric: "trueShooting", label: "True Shooting" },
  { slug: "net-rating", metric: "netRating", label: "Net Rating" },
] as const satisfies readonly {
  slug: string;
  metric: PlayerMetricKey;
  label: string;
}[];

export type LeaderboardDefinition = (typeof LEADERBOARDS)[number];

export function getLeaderboard(slug: string): LeaderboardDefinition | null {
  return LEADERBOARDS.find((leaderboard) => leaderboard.slug === slug) ?? null;
}

export function leaderboardValue(
  row: PlayerSeason,
  metric: PlayerMetricKey,
): number | null {
  const value = row[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Seuil de matchs adapté à l'avancement de la saison. Un seuil fixe de 10
 * matchs viderait les classements pendant les trois premières semaines : on
 * exige 70 % des matchs déjà joués par une équipe, plafonné au seuil normal.
 */
export function scaledMinimumGames(teamGames: number, cap: number): number {
  return Math.min(cap, Math.max(1, Math.ceil(teamGames * 0.7)));
}
