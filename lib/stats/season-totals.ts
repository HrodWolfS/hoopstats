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
  sumSeasonTotals,
  type BoxScoreLine,
  type DerivedSeason,
  type SeasonTotals,
  type StarterBoxScoreLine,
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

export type ShotVolume = {
  games: number;
  fgaPerGame: number;
  threePaPerGame: number;
  ftaPerGame: number;
};

/**
 * Tentatives de tir par match sur une saison régulière, tirées des box
 * scores. `null` quand la saison n'en a pas en base : `PlayerSeason` ne
 * stocke que les pourcentages, pas les volumes.
 */
export async function loadShotVolume(playerId: string, season: string): Promise<ShotVolume | null> {
  const result = await prisma.playerBoxScore.aggregate({
    where: {
      playerId,
      didNotPlay: false,
      game: { season, status: "final", phase: REGULAR_SEASON_PHASE },
    },
    _sum: { fga: true, threePa: true, fta: true },
    _count: true,
  });
  const games = result._count;
  if (games === 0) return null;
  return {
    games,
    fgaPerGame: (result._sum.fga ?? 0) / games,
    threePaPerGame: (result._sum.threePa ?? 0) / games,
    ftaPerGame: (result._sum.fta ?? 0) / games,
  };
}

/**
 * Totaux exacts d'un joueur, saison régulière par saison régulière, toutes
 * équipes confondues. Seules les saisons couvertes par les box scores y
 * figurent : pour les autres, aucun total n'est affiché plutôt qu'un produit
 * moyenne × matchs faussé par l'arrondi des moyennes.
 */
export async function loadPlayerSeasonTotals(playerId: string): Promise<Map<string, SeasonTotals>> {
  const rows = await prisma.playerBoxScore.findMany({
    where: {
      playerId,
      didNotPlay: false,
      game: { status: "final", phase: REGULAR_SEASON_PHASE },
    },
    select: {
      starter: true,
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
      game: { select: { season: true } },
    },
  });

  const bySeason = new Map<string, StarterBoxScoreLine[]>();
  for (const { game, ...line } of rows) {
    const lines = bySeason.get(game.season);
    if (lines) lines.push(line);
    else bySeason.set(game.season, [line]);
  }

  const totals = new Map<string, SeasonTotals>();
  for (const [season, lines] of bySeason) {
    const seasonTotals = sumSeasonTotals(lines);
    if (seasonTotals) totals.set(season, seasonTotals);
  }
  return totals;
}
