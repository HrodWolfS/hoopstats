/**
 * Données de la page Tendances : box scores de saison régulière d'une saison,
 * passés aux règles de `trends.ts` pour chaque fenêtre.
 */

import { prisma } from "@/lib/prisma";
import { computeTrends, TREND_WINDOWS, type PlayerTrend, type TrendLine, type TrendWindow } from "@/lib/stats/trends";

/** Saisons dont la saison régulière a des box scores, la plus récente d'abord. */
export async function trendSeasons(): Promise<string[]> {
  const rows = await prisma.game.findMany({
    where: { phase: "regular", status: "final", playerBoxScores: { some: {} } },
    distinct: ["season"],
    select: { season: true },
    orderBy: { season: "desc" },
  });
  return rows.map((row) => row.season);
}

export type TrendPlayer = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

export type TrendTeam = { abbr: string; slug: string; primaryColor: string; secondaryColor: string };

/** Ligne envoyée au client : dates en ISO, sans ce qui ne s'affiche pas. */
export type TrendRow = Omit<PlayerTrend, "from" | "to"> & { from: string; to: string };

export type TrendsData = {
  season: string;
  lastGameDate: string | null;
  players: Record<string, TrendPlayer>;
  teams: Record<string, TrendTeam>;
  windows: Record<TrendWindow, TrendRow[]>;
};

export async function loadTrends(season: string): Promise<TrendsData> {
  const lines = await prisma.playerBoxScore.findMany({
    where: { playerId: { not: null }, game: { season, phase: "regular", status: "final" } },
    select: {
      playerId: true,
      teamAbbr: true,
      starter: true,
      didNotPlay: true,
      minutes: true,
      pts: true,
      fga: true,
      fta: true,
      game: { select: { gameDate: true } },
    },
  });

  const trendLines: TrendLine[] = lines.map((line) => ({
    playerId: line.playerId!,
    gameDate: line.game.gameDate,
    teamAbbr: line.teamAbbr,
    starter: line.starter,
    didNotPlay: line.didNotPlay,
    minutes: line.minutes,
    pts: line.pts,
    fga: line.fga,
    fta: line.fta,
  }));

  const lastGameDate = trendLines.reduce<Date | null>(
    (latest, line) => (latest == null || line.gameDate > latest ? line.gameDate : latest),
    null,
  );

  const windows = Object.fromEntries(
    TREND_WINDOWS.map((window) => [
      window,
      lastGameDate == null
        ? []
        : computeTrends(trendLines, window, lastGameDate).map((trend) => ({
            ...trend,
            from: trend.from.toISOString(),
            to: trend.to.toISOString(),
          })),
    ]),
  ) as Record<TrendWindow, TrendRow[]>;

  const playerIds = [...new Set(Object.values(windows).flatMap((rows) => rows.map((row) => row.playerId)))];
  const [players, teams] = await Promise.all([
    prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, slug: true, firstName: true, lastName: true, photoUrl: true },
    }),
    prisma.team.findMany({ select: { abbr: true, slug: true, primaryColor: true, secondaryColor: true } }),
  ]);

  return {
    season,
    lastGameDate: lastGameDate?.toISOString() ?? null,
    players: Object.fromEntries(players.map((player) => [player.id, player])),
    teams: Object.fromEntries(teams.map((team) => [team.abbr, team])),
    windows,
  };
}
