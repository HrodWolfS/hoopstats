/**
 * Totaux de saison tirés des box scores, pour les joueurs transférés.
 *
 * Les pourcentages d'une ligne « TOT » ne se déduisent pas des lignes par
 * équipe : il faut les tentatives. Les box scores les portent ; on les
 * agrège sur le même périmètre que `sync-player-seasons` (saison régulière,
 * matchs terminés), toutes équipes confondues.
 *
 * Pour une saison antérieure aux box scores, la table retournée est vide et
 * les pourcentages TOT restent à `null`.
 */

import { prisma } from "@/lib/prisma";
import { REGULAR_SEASON_PHASE } from "@/lib/season-phase";
import {
  deriveSeasonFromBoxScores,
  type BoxScoreLine,
  type DerivedSeason,
} from "@/lib/stats/season-aggregation";
import {
  consolidatePlayerSeasons,
  multiTeamPlayerIds,
  type ConsolidatableRow,
  type Consolidated,
} from "@/lib/stats/season-consolidation";

export async function loadExactSeasonTotals(
  season: string,
  playerIds: readonly string[],
): Promise<Map<string, DerivedSeason>> {
  if (playerIds.length === 0) return new Map();

  const lines = await prisma.playerBoxScore.findMany({
    where: {
      playerId: { in: [...playerIds] },
      didNotPlay: false,
      game: { season, status: "final", phase: REGULAR_SEASON_PHASE },
    },
    select: {
      playerId: true,
      minutes: true,
      pts: true,
      reb: true,
      ast: true,
      stl: true,
      blk: true,
      fgm: true,
      fga: true,
      threePm: true,
      threePa: true,
      ftm: true,
      fta: true,
    },
  });

  const byPlayer = new Map<string, BoxScoreLine[]>();
  for (const { playerId, ...line } of lines) {
    if (!playerId) continue;
    const playerLines = byPlayer.get(playerId);
    if (playerLines) playerLines.push(line);
    else byPlayer.set(playerId, [line]);
  }

  const totals = new Map<string, DerivedSeason>();
  for (const [playerId, playerLines] of byPlayer) {
    const derived = deriveSeasonFromBoxScores(playerLines);
    if (derived) totals.set(playerId, derived);
  }
  return totals;
}

/**
 * Lignes d'une saison ramenées à une par joueur, pourcentages TOT compris.
 * Seuls les joueurs transférés déclenchent une lecture des box scores.
 */
export async function consolidateSeasonRows<T extends ConsolidatableRow>(
  season: string,
  rows: readonly T[],
): Promise<Consolidated<T>[]> {
  const totals = await loadExactSeasonTotals(season, multiTeamPlayerIds(rows));
  return consolidatePlayerSeasons(rows, totals);
}

/**
 * Carrière d'un joueur ramenée à une ligne par saison, dans l'ordre
 * chronologique. Les totaux exacts ne sont chargés que pour les saisons
 * jouées dans plusieurs équipes.
 */
export async function consolidatePlayerCareer<
  T extends ConsolidatableRow & { season: string },
>(
  rows: readonly T[],
): Promise<{
  seasons: Consolidated<T>[];
  exactBySeason: Map<string, DerivedSeason>;
}> {
  const bySeason = new Map<string, T[]>();
  for (const row of rows) {
    const stints = bySeason.get(row.season);
    if (stints) stints.push(row);
    else bySeason.set(row.season, [row]);
  }

  const exactBySeason = new Map<string, DerivedSeason>();
  await Promise.all(
    [...bySeason].map(async ([season, stints]) => {
      const [playerId] = multiTeamPlayerIds(stints);
      if (!playerId) return;
      const exact = (await loadExactSeasonTotals(season, [playerId])).get(playerId);
      if (exact) exactBySeason.set(season, exact);
    }),
  );

  const seasons = [...bySeason]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([season, stints]) => {
      const exact = exactBySeason.get(season);
      return consolidatePlayerSeasons(
        stints,
        exact ? new Map([[stints[0].playerId, exact]]) : undefined,
      )[0];
    });

  return { seasons, exactBySeason };
}
