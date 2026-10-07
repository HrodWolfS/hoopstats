import type { PlayerSeason } from "@prisma/client";
import type { MetricQualification, PlayerMetricKey } from "@/lib/stats/metrics";

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

/** Matchs d'une saison régulière complète. */
export const REGULAR_SEASON_GAMES = 82;

/**
 * Avancement de la saison en matchs d'équipe, d'après le joueur le plus
 * utilisé. Un joueur transféré peut dépasser 82 matchs (son ancienne équipe
 * avait joué moins que la nouvelle) : on plafonne pour ne pas exiger 59
 * matchs au lieu de 58.
 */
export function seasonTeamGames(rows: readonly { gamesPlayed: number }[]): number {
  const most = rows.reduce((max, row) => Math.max(max, row.gamesPlayed), 0);
  return Math.min(REGULAR_SEASON_GAMES, most);
}

/**
 * Matchs exigés pour une métrique, proportionnels aux matchs déjà joués :
 * 70 % donne 58 sur une saison complète, comme NBA.com, et 4 après 5 matchs,
 * pour que les classements ne restent pas vides en début de saison.
 */
export function minimumGamesFor(qualification: MetricQualification, teamGames: number): number {
  if (qualification.gamesShare === 0) return 0;
  const played = Math.min(REGULAR_SEASON_GAMES, teamGames);
  return Math.max(1, Math.ceil(played * qualification.gamesShare));
}

export function isQualified(
  row: { gamesPlayed: number; minutesPerGame: number; pointsPerGame: number },
  qualification: MetricQualification,
  minimumGames: number,
): boolean {
  return (
    row.gamesPlayed >= minimumGames &&
    row.minutesPerGame >= (qualification.minMinutesPerGame ?? 0) &&
    row.pointsPerGame >= (qualification.minPointsPerGame ?? 0)
  );
}

/** Seuil appliqué, en clair : « ≥ 58 matchs · 20 min · 10 pts ». */
export function qualificationSummary(
  qualification: MetricQualification,
  minimumGames: number,
): string {
  const parts = [`≥ ${minimumGames} ${minimumGames > 1 ? "matchs" : "match"}`];
  if (qualification.minMinutesPerGame) parts.push(`${qualification.minMinutesPerGame} min`);
  if (qualification.minPointsPerGame) parts.push(`${qualification.minPointsPerGame} pts`);
  return parts.join(" · ");
}

/** Règle générale, pour le glossaire : part des matchs et son origine. */
export function qualificationRule(qualification: MetricQualification): string {
  if (qualification.rule === "none") return "aucun seuil";
  const share = Math.round(qualification.gamesShare * 100);
  const full = minimumGamesFor(qualification, REGULAR_SEASON_GAMES);
  const extras = [
    qualification.minMinutesPerGame && `${qualification.minMinutesPerGame} min/match`,
    qualification.minPointsPerGame && `${qualification.minPointsPerGame} pts/match`,
  ].filter(Boolean);
  const origin = qualification.rule === "nba" ? "règle NBA" : "règle hoopstats";
  return `${share} % des matchs de l'équipe (${full} sur ${REGULAR_SEASON_GAMES})${extras.length ? ` + ${extras.join(" + ")}` : ""} · ${origin}`;
}

/**
 * Rangs « sportifs » d'une liste déjà triée : deux valeurs égales partagent
 * le même rang et le suivant saute d'autant (1, 2, 2, 4). Numéroter par la
 * seule position classerait arbitrairement l'un devant l'autre selon l'ordre
 * de lecture en base.
 */
export function competitionRanks(sortedValues: readonly number[]): number[] {
  const ranks: number[] = [];
  sortedValues.forEach((value, index) => {
    ranks.push(index > 0 && value === sortedValues[index - 1] ? ranks[index - 1] : index + 1);
  });
  return ranks;
}
