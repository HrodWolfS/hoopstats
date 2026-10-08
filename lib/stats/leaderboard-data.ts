import { prisma } from "@/lib/prisma";
import { getPlayerMetric } from "@/lib/stats/metrics";
import {
  competitionRanks,
  getLeaderboard,
  isQualified,
  leaderboardValue,
  minimumGamesFor,
  seasonTeamGames,
} from "@/lib/stats/leaders";
import { consolidateSeasonRows } from "@/lib/stats/season-totals";

/** Les 50 premiers d'un classement, partagés par la page et sa carte sociale. */
export async function loadLeaderboard(season: string, metric: string) {
  const leaderboard = getLeaderboard(metric);
  if (!leaderboard) return null;
  const definition = getPlayerMetric(leaderboard.metric);
  // Le seuil de qualification s'applique après regroupement : un joueur
  // transféré ne doit pas être écarté parce qu'aucune de ses deux lignes ne
  // l'atteint séparément.
  const rows = await prisma.playerSeason.findMany({
    where: { season },
    include: {
      player: { select: { firstName: true, lastName: true, slug: true } },
      team: { select: { abbr: true, slug: true } },
    },
  });
  const consolidated = await consolidateSeasonRows(season, rows);
  const teamGames = seasonTeamGames(consolidated);
  const { qualification } = definition;
  const minimumGames = minimumGamesFor(qualification, teamGames);
  const leaders = consolidated
    .filter((row) => isQualified(row, qualification, minimumGames))
    .map((row) => ({
      row,
      gamesPlayed: row.gamesPlayed,
      value: leaderboardValue(row, leaderboard.metric),
    }))
    .filter((entry): entry is typeof entry & { value: number } => entry.value != null)
    .sort(
      (left, right) =>
        (definition.higherIsBetter ? right.value - left.value : left.value - right.value) ||
        // Égalité : ordre alphabétique, stable d'un rendu à l'autre.
        left.row.player.lastName.localeCompare(right.row.player.lastName, "fr"),
    )
    .slice(0, 50);
  const ranks = competitionRanks(leaders.map((entry) => entry.value));
  return { leaderboard, definition, qualification, minimumGames, teamGames, leaders, ranks };
}
