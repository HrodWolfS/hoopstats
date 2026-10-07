import { prisma } from "@/lib/prisma";
import { REGULAR_SEASON_PHASE } from "@/lib/season-phase";
import { computeTeamRatings, type TeamGameBox, type TeamRatings } from "@/lib/stats/team-ratings";

/**
 * Ratings de toutes les équipes sur la saison régulière, depuis les box
 * scores. Carte vide pour une saison sans box scores en base : la page dit
 * alors que la donnée manque plutôt que d'afficher des zéros.
 */
export async function loadTeamRatings(season: string): Promise<Map<string, TeamRatings>> {
  const games = await prisma.game.findMany({
    where: { season, status: "final", phase: REGULAR_SEASON_PHASE, boxScore: { isNot: null } },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      boxScore: {
        select: {
          homeLinescores: true,
          homeFga: true,
          homeFta: true,
          homeOreb: true,
          homeTov: true,
          awayFga: true,
          awayFta: true,
          awayOreb: true,
          awayTov: true,
        },
      },
    },
  });

  const boxes: TeamGameBox[] = [];
  for (const game of games) {
    const box = game.boxScore;
    if (!box || game.homeScore == null || game.awayScore == null) continue;
    const { homeFga, homeFta, homeOreb, homeTov, awayFga, awayFta, awayOreb, awayTov } = box;
    // Un total manquant fausserait les possessions : le match est écarté.
    if (
      homeFga == null || homeFta == null || homeOreb == null || homeTov == null ||
      awayFga == null || awayFta == null || awayOreb == null || awayTov == null
    ) {
      continue;
    }
    boxes.push({
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      home: { pts: game.homeScore, fga: homeFga, fta: homeFta, oreb: homeOreb, tov: homeTov },
      away: { pts: game.awayScore, fga: awayFga, fta: awayFta, oreb: awayOreb, tov: awayTov },
      periods: Array.isArray(box.homeLinescores) ? Math.max(4, box.homeLinescores.length) : 4,
    });
  }
  return computeTeamRatings(boxes);
}
