/**
 * Audit en lecture seule de la santé des données Hoopstats.
 *
 * Par défaut, les anomalies sont signalées sans faire échouer le processus.
 * Utiliser --strict pour retourner un code non nul en présence d'un échec.
 */

import { PrismaClient } from "@prisma/client";
import { SEASON_OPENERS, currentSeason, espnSeasonYear } from "../lib/nba";
import {
  NULLABLE_METRIC_COLUMNS,
  validatePlayerMetricRegistry,
} from "../lib/stats/metrics";
import { validateStatisticalContext } from "../lib/stats/context";
import { validatePlayerIdentityResolver } from "../lib/stats/player-identity";
import { validateEspnAthleteParsing } from "../lib/espn-athlete";
import { validateAccentOnDark } from "../lib/color";
import { validatePlayerAliases } from "../lib/stats/player-aliases";
import { validateAnalyticsPayload } from "../lib/analytics";
import { validatePlayerSimilarity } from "../lib/stats/player-similarity";
import { validateCareerAggregation } from "../lib/stats/career";
import {
  deriveSeasonFromBoxScores,
  validateSeasonAggregation,
  type BoxScoreLine,
} from "../lib/stats/season-aggregation";
import {
  consolidatePlayerSeasons,
  multiTeamPlayerIds,
  validateSeasonConsolidation,
} from "../lib/stats/season-consolidation";
import { isStaleStatus, validateGameStatus } from "../lib/game-status";
import {
  seriesWinsRequired,
  validatePlayoffSeriesWinner,
} from "../lib/playoff-series";
import {
  PLAYOFF_SERIES_CORRECTIONS,
  findPlayoffSeriesCorrection,
  validatePlayoffCorrections,
} from "../lib/playoff-corrections";
import {
  COMPETITIVE_PHASES,
  REGULAR_SEASON_PHASE,
  validateSeasonPhase,
} from "../lib/season-phase";

const prisma = new PrismaClient({ log: ["error"] });

const CURRENT_SEASON = currentSeason();

type CheckStatus = "pass" | "warn" | "fail";

type HealthCheck = {
  name: string;
  status: CheckStatus;
  message: string;
};

function check(
  name: string,
  condition: boolean,
  message: string,
  failureStatus: Exclude<CheckStatus, "pass"> = "fail",
): HealthCheck {
  return {
    name,
    status: condition ? "pass" : failureStatus,
    message,
  };
}

function expectedRegularSeasonGames(now: Date): number {
  const startYear = Number.parseInt(CURRENT_SEASON.split("-")[0], 10);
  const seasonStart = new Date(SEASON_OPENERS[CURRENT_SEASON]);
  const regularSeasonEnd = new Date(Date.UTC(startYear + 1, 3, 15));

  if (now <= seasonStart) return 0;
  if (now >= regularSeasonEnd) return 1230;

  const progress =
    (now.getTime() - seasonStart.getTime()) /
    (regularSeasonEnd.getTime() - seasonStart.getTime());
  return Math.floor(1230 * progress * 0.9);
}

type SeasonCalendarCheck = { ok: boolean; message: string } | null;

/**
 * Compare le calendrier codé dans `SEASON_OPENERS` à celui d'ESPN. La bascule
 * de saison du site en dépend : une saison ESPN absente du calendrier ou une
 * date de reprise déplacée doit être corrigée avant le premier match.
 * `null` quand ESPN ne répond pas : l'audit ne doit pas échouer pour ça.
 */
async function checkSeasonCalendar(): Promise<SeasonCalendarCheck> {
  try {
    const res = await fetch(
      "https://site.api.espn.com/apis/common/v3/sports/basketball/nba/season",
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      year?: number;
      types?: { type?: number; startDate?: string }[];
    };
    const regular = data.types?.find((type) => type.type === 2);
    if (!data.year || !regular?.startDate) return null;

    const season = `${data.year - 1}-${String(data.year).slice(-2)}`;
    const known = SEASON_OPENERS[season];
    if (!known) {
      return {
        ok: false,
        message: `saison ESPN ${season} absente de SEASON_OPENERS (lib/nba.ts) : ajouter "${season}": "${new Date(regular.startDate).toISOString().replace(".000", "")}"`,
      };
    }
    if (Date.parse(known) !== Date.parse(regular.startDate)) {
      return {
        ok: false,
        message: `reprise ${season} déplacée par ESPN : ${regular.startDate} au lieu de ${known} dans lib/nba.ts`,
      };
    }
    return {
      ok: true,
      message: `reprise ${season} le ${known}, saison affichée ${CURRENT_SEASON} (ESPN ${espnSeasonYear(CURRENT_SEASON)})`,
    };
  } catch {
    return null;
  }
}

type MismatchedGame = {
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { abbr: string };
  awayTeam: { abbr: string };
  playerBoxScores: { teamAbbr: string; pts: number | null }[];
};

/**
 * Résume les écarts par équipe déficitaire.
 *
 * Un écart concentré sur une seule équipe indique un box score incomplet chez
 * le fournisseur ; un écart réparti sur plusieurs équipes signalerait plutôt
 * un défaut de notre import.
 */
function summarizeMismatches(games: readonly MismatchedGame[]): string {
  const perTeam = new Map<string, { games: number; points: number }>();

  for (const game of games) {
    for (const side of [
      { abbr: game.homeTeam.abbr, score: game.homeScore },
      { abbr: game.awayTeam.abbr, score: game.awayScore },
    ]) {
      const total = game.playerBoxScores
        .filter((row) => row.teamAbbr === side.abbr)
        .reduce((sum, row) => sum + (row.pts ?? 0), 0);
      if (total === side.score) continue;

      const entry = perTeam.get(side.abbr) ?? { games: 0, points: 0 };
      entry.games += 1;
      entry.points += Math.abs((side.score ?? 0) - total);
      perTeam.set(side.abbr, entry);
    }
  }

  return [...perTeam.entries()]
    .sort((a, b) => b[1].games - a[1].games)
    .map(
      ([abbr, { games: n, points }]) => `${abbr} ${n} match(s)/${points} pts`,
    )
    .join(", ");
}

/** Retard médian, en matchs, entre les box scores et les agrégats de saison. */
function medianLag(
  rows: readonly { playerId: string; gamesPlayed: number }[],
  playedPerPlayer: ReadonlyMap<string | null, number>,
): number {
  const lags = rows
    .map((row) => (playedPerPlayer.get(row.playerId) ?? 0) - row.gamesPlayed)
    .sort((a, b) => a - b);

  if (lags.length === 0) return 0;
  return lags[Math.floor(lags.length / 2)];
}

async function runHealthChecks(): Promise<HealthCheck[]> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const expectedGames = expectedRegularSeasonGames(now);
  const metricRegistryErrors = validatePlayerMetricRegistry();
  const statisticalContextErrors = validateStatisticalContext();
  const identityResolverErrors = [
    ...validatePlayerIdentityResolver(),
    ...validateEspnAthleteParsing(),
  ];
  const aliasErrors = validatePlayerAliases();
  const analyticsErrors = validateAnalyticsPayload();
  const similarityErrors = validatePlayerSimilarity();
  const accentErrors = validateAccentOnDark();
  const careerErrors = validateCareerAggregation();
  const seasonAggregationErrors = validateSeasonAggregation();
  const consolidationErrors = validateSeasonConsolidation();
  const gameStatusErrors = validateGameStatus();
  const seriesWinnerErrors = validatePlayoffSeriesWinner();
  const correctionErrors = validatePlayoffCorrections();
  const seasonPhaseErrors = validateSeasonPhase();

  // Un match non classé est exclu des moyennes : s'il en reste, la
  // synchronisation n'a pas lu la saison ESPN ou le rattrapage n'a pas tourné.
  // Une équipe joue 82 matchs de saison régulière : au-delà, des matchs d'une
  // autre phase se sont glissés dans l'agrégat.
  const [
    unclassifiedGames,
    overflowingSeasonRows,
    regularFinalGames,
    seasonCalendar,
  ] = await Promise.all([
    prisma.game.count({ where: { phase: null } }),
    prisma.playerSeason.count({
      where: { season: CURRENT_SEASON, gamesPlayed: { gt: 82 } },
    }),
    prisma.game.count({
      where: {
        season: CURRENT_SEASON,
        status: "final",
        phase: REGULAR_SEASON_PHASE,
      },
    }),
    checkSeasonCalendar(),
  ]);

  // Une série terminée dont aucune équipe n'atteint le total requis trahit un
  // décompte incomplet : le vainqueur affiché serait alors arbitraire. Le
  // format d'époque compte — le premier tour se jouait au meilleur des cinq.
  const inconsistentSeries = (
    await prisma.playoffSeries.findMany({
      where: { completed: true, team1Wins: { lt: 4 }, team2Wins: { lt: 4 } },
      select: { season: true, round: true, team1Wins: true, team2Wins: true },
    })
  ).filter((series) => {
    const required = seriesWinsRequired(series.season, series.round);
    return series.team1Wins < required && series.team2Wins < required;
  });

  // Les box scores sont synchronisés chaque jour, pas les agrégats de saison.
  // Comparer les deux mesure le retard réel des moyennes affichées.
  const [boxScoreGameCounts, storedSeasons] = await Promise.all([
    prisma.playerBoxScore.groupBy({
      by: ["playerId"],
      where: {
        didNotPlay: false,
        playerId: { not: null },
        game: {
          season: CURRENT_SEASON,
          status: "final",
          phase: REGULAR_SEASON_PHASE,
        },
      },
      _count: { _all: true },
    }),
    prisma.playerSeason.findMany({
      where: { season: CURRENT_SEASON },
      select: { playerId: true, gamesPlayed: true },
    }),
  ]);

  const playedPerPlayer = new Map(
    boxScoreGameCounts.map((row) => [row.playerId, row._count._all]),
  );

  // Comparaison par joueur, pas par ligne : une saison transférée compte une
  // ligne par équipe, dont aucune ne porte le total de la saison.
  const storedPerPlayer = new Map<string, number>();
  for (const row of storedSeasons) {
    storedPerPlayer.set(
      row.playerId,
      (storedPerPlayer.get(row.playerId) ?? 0) + row.gamesPlayed,
    );
  }
  const staleSeasonRows = [...storedPerPlayer.entries()]
    .map(([playerId, gamesPlayed]) => ({ playerId, gamesPlayed }))
    .filter(
      (row) => (playedPerPlayer.get(row.playerId) ?? 0) > row.gamesPlayed,
    );

  // Lignes TOT réelles : la moyenne pondérée des passages doit retomber sur
  // le total recalculé depuis les box scores, toutes équipes confondues. Un
  // écart trahit un passage manquant ou compté deux fois.
  const tradedStints = await prisma.playerSeason.findMany({
    where: {
      season: CURRENT_SEASON,
      playerId: { in: multiTeamPlayerIds(storedSeasons) },
    },
    select: {
      playerId: true,
      gamesPlayed: true,
      pointsPerGame: true,
      reboundsPerGame: true,
      assistsPerGame: true,
      fgPct: true,
      trueShooting: true,
    },
  });
  const tradedLines = await prisma.playerBoxScore.findMany({
    where: {
      playerId: { in: multiTeamPlayerIds(tradedStints) },
      didNotPlay: false,
      game: {
        season: CURRENT_SEASON,
        status: "final",
        phase: REGULAR_SEASON_PHASE,
      },
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
  const linesByPlayer = new Map<string, BoxScoreLine[]>();
  for (const { playerId, ...line } of tradedLines) {
    if (!playerId) continue;
    linesByPlayer.set(playerId, [...(linesByPlayer.get(playerId) ?? []), line]);
  }
  const tradedTotals = new Map(
    [...linesByPlayer].flatMap(([playerId, lines]) => {
      const derived = deriveSeasonFromBoxScores(lines);
      return derived ? [[playerId, derived] as const] : [];
    }),
  );
  const totRows = consolidatePlayerSeasons(tradedStints, tradedTotals);
  const inconsistentTotRows = totRows.filter((row) => {
    const exact = tradedTotals.get(row.playerId);
    if (!exact) return true;
    return (
      exact.gamesPlayed !== row.gamesPlayed ||
      Math.abs(exact.pointsPerGame - row.pointsPerGame) > 0.05 ||
      Math.abs(exact.reboundsPerGame - row.reboundsPerGame) > 0.05 ||
      Math.abs(exact.assistsPerGame - row.assistsPerGame) > 0.05 ||
      (exact.trueShooting !== null && row.trueShooting === null)
    );
  });

  // Réimporter l'archive ESPN réécrit les séries historiques : on vérifie que
  // les corrections tiennent toujours en base, faute de quoi la finale 1990
  // repasserait silencieusement à 3-2 et 1986 changerait de champion.
  const unappliedCorrections = (
    await prisma.playoffSeries.findMany({
      where: {
        season: {
          in: [...new Set(PLAYOFF_SERIES_CORRECTIONS.map((c) => c.season))],
        },
      },
      select: {
        season: true,
        round: true,
        team1Wins: true,
        team2Wins: true,
        completed: true,
        team1: { select: { abbr: true } },
        team2: { select: { abbr: true } },
      },
    })
  ).filter((series) => {
    const correction = findPlayoffSeriesCorrection(
      series.season,
      series.team1.abbr,
      series.team2.abbr,
    );
    if (!correction) return false;

    const team1Won = series.team1.abbr === correction.winnerAbbr;
    return (
      !series.completed ||
      series.round !== correction.round ||
      series.team1Wins !==
        (team1Won ? correction.winnerWins : correction.loserWins) ||
      series.team2Wins !==
        (team1Won ? correction.loserWins : correction.winnerWins)
    );
  });

  // Une métrique publiée mais jamais alimentée s'afficherait comme une donnée
  // réelle : on vérifie que chaque colonne optionnelle exposée porte des valeurs.
  const emptyMetrics = (
    await Promise.all(
      NULLABLE_METRIC_COLUMNS.map(async (column) => ({
        column,
        filled: await prisma.playerSeason.count({
          where: { [column]: { not: null } } as never,
        }),
      })),
    )
  ).filter((metric) => metric.filled === 0);

  // Un match dont la date est passée depuis longtemps sans être terminé ni
  // reporté trahit un statut figé : il resterait affiché comme « en cours ».
  const staleStatusGames = (
    await prisma.game.findMany({
      where: {
        gameDate: { lt: now },
        status: { notIn: ["final", "postponed"] },
      },
      select: { gameDate: true, status: true },
    })
  ).filter((game) => isStaleStatus(game.status, game.gameDate, now));

  const [
    teamCount,
    currentTeamSeasonCount,
    currentPlayerSeasonCount,
    invalidPlayerSeasonCount,
    finalGamesWithoutScore,
    finalGamesWithoutBoxScore,
    seasonGameCount,
    invalidGames,
    duplicatePlayerRows,
    completedGames,
    latestDailySync,
    finalGameCount,
    resolvedPlayerRows,
    eligiblePlayerRows,
  ] = await Promise.all([
    prisma.team.count(),
    prisma.teamSeason.count({ where: { season: CURRENT_SEASON } }),
    prisma.playerSeason.count({ where: { season: CURRENT_SEASON } }),
    prisma.playerSeason.count({
      where: {
        season: CURRENT_SEASON,
        OR: [
          { gamesPlayed: { lt: 0 } },
          { minutesPerGame: { lt: 0 } },
          { minutesPerGame: { gt: 60 } },
          { pointsPerGame: { lt: 0 } },
          { reboundsPerGame: { lt: 0 } },
          { assistsPerGame: { lt: 0 } },
          { fgPct: { lt: 0 } },
          { fgPct: { gt: 1 } },
          { threePtPct: { lt: 0 } },
          { threePtPct: { gt: 1 } },
          { ftPct: { lt: 0 } },
          { ftPct: { gt: 1 } },
        ],
      },
    }),
    prisma.game.count({
      where: {
        season: CURRENT_SEASON,
        status: "final",
        OR: [{ homeScore: null }, { awayScore: null }],
      },
    }),
    prisma.game.count({
      where: {
        season: CURRENT_SEASON,
        status: "final",
        phase: { in: COMPETITIVE_PHASES },
        boxScore: { is: null },
      },
    }),
    prisma.game.count({
      where: { season: CURRENT_SEASON, phase: REGULAR_SEASON_PHASE },
    }),
    prisma.game.count({
      where: {
        season: CURRENT_SEASON,
        OR: [
          { homeTeamId: { equals: prisma.game.fields.awayTeamId } },
          { homeScore: { lt: 0 } },
          { awayScore: { lt: 0 } },
          {
            status: "final",
            homeScore: { equals: prisma.game.fields.awayScore },
          },
        ],
      },
    }),
    prisma.playerBoxScore.groupBy({
      by: ["gameId", "teamAbbr", "playerName"],
      _count: { _all: true },
      having: { id: { _count: { gt: 1 } } },
    }),
    prisma.game.findMany({
      where: {
        season: CURRENT_SEASON,
        status: "final",
        phase: { in: COMPETITIVE_PHASES },
        boxScore: { isNot: null },
      },
      select: {
        espnId: true,
        homeScore: true,
        awayScore: true,
        homeTeam: { select: { abbr: true } },
        awayTeam: { select: { abbr: true } },
        playerBoxScores: {
          where: { didNotPlay: false },
          select: { teamAbbr: true, pts: true },
        },
      },
    }),
    prisma.syncLog.findFirst({
      where: {
        source: "sync-daily",
        status: { in: ["success", "partial"] },
      },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true, status: true, itemsProcessed: true },
    }),
    prisma.game.count({
      where: {
        season: CURRENT_SEASON,
        status: "final",
        phase: { in: COMPETITIVE_PHASES },
      },
    }),
    prisma.playerBoxScore.count({
      where: {
        didNotPlay: false,
        playerId: { not: null },
        game: { season: CURRENT_SEASON, phase: { in: COMPETITIVE_PHASES } },
      },
    }),
    prisma.playerBoxScore.count({
      where: {
        didNotPlay: false,
        playerName: { not: "—" },
        game: { season: CURRENT_SEASON, phase: { in: COMPETITIVE_PHASES } },
      },
    }),
  ]);

  const scoreMismatches = completedGames.filter((game) => {
    const homePlayerPoints = game.playerBoxScores
      .filter((row) => row.teamAbbr === game.homeTeam.abbr)
      .reduce((total, row) => total + (row.pts ?? 0), 0);
    const awayPlayerPoints = game.playerBoxScores
      .filter((row) => row.teamAbbr === game.awayTeam.abbr)
      .reduce((total, row) => total + (row.pts ?? 0), 0);

    return (
      homePlayerPoints !== game.homeScore || awayPlayerPoints !== game.awayScore
    );
  });
  // Le matin de la reprise, aucun match n'est terminé : rien n'est incomplet.
  const completeBoxScoreRate =
    finalGameCount === 0
      ? 100
      : ((finalGameCount - finalGamesWithoutBoxScore - scoreMismatches.length) /
          finalGameCount) *
        100;
  const identityResolutionRate =
    eligiblePlayerRows === 0
      ? 100
      : (resolvedPlayerRows / eligiblePlayerRows) * 100;

  return [
    seasonCalendar
      ? check(
          "Calendrier des saisons",
          seasonCalendar.ok,
          seasonCalendar.message,
        )
      : check(
          "Calendrier des saisons",
          false,
          "ESPN injoignable, calendrier non vérifié",
          "warn",
        ),
    check(
      "Registre statistique",
      metricRegistryErrors.length === 0,
      metricRegistryErrors.length === 0
        ? "définitions uniques et valides"
        : metricRegistryErrors.join("; "),
    ),
    check(
      "Contexte statistique",
      statisticalContextErrors.length === 0,
      statisticalContextErrors.length === 0
        ? "rangs, percentiles, moyenne et médiane valides"
        : statisticalContextErrors.join("; "),
    ),
    check(
      "Résolveur d’identités",
      identityResolverErrors.length === 0,
      identityResolverErrors.length === 0
        ? "identifiants, homonymes, accents, suffixes, alias et profils ESPN validés"
        : identityResolverErrors.join("; "),
    ),
    check(
      "Alias de noms joueurs",
      aliasErrors.length === 0,
      aliasErrors.length === 0
        ? "chaque alias vise une fiche unique et distincte du nom observé"
        : aliasErrors.join("; "),
    ),
    check(
      "Analytics privé",
      analyticsErrors.length === 0,
      analyticsErrors.length === 0
        ? "événements agrégés et dimensions sans texte libre"
        : analyticsErrors.join("; "),
    ),
    check(
      "Similarité joueurs",
      similarityErrors.length === 0,
      similarityErrors.length === 0
        ? "distance normalisée et classement validés"
        : similarityErrors.join("; "),
    ),
    check(
      "Couleurs d'équipe sur fond sombre",
      accentErrors.length === 0,
      accentErrors.length === 0
        ? "couleurs sombres éclaircies, couleurs lisibles inchangées"
        : accentErrors.join("; "),
    ),
    check(
      "Agrégation carrière",
      careerErrors.length === 0,
      careerErrors.length === 0
        ? "pondération par matchs et consolidation des transferts validées"
        : careerErrors.join("; "),
    ),
    check(
      "Ligne TOT par joueur et par saison",
      consolidationErrors.length === 0,
      consolidationErrors.length === 0
        ? "une ligne par joueur : 1, 2 ou 3 équipes, sans match, pourcentages exacts des box scores"
        : consolidationErrors.join("; "),
    ),
    check(
      "Agrégation saison depuis les box scores",
      seasonAggregationErrors.length === 0,
      seasonAggregationErrors.length === 0
        ? "moyennes calculées sur les totaux, pourcentages pondérés par le volume"
        : seasonAggregationErrors.join("; "),
    ),
    check(
      "Statuts de matchs à jour",
      staleStatusGames.length === 0,
      staleStatusGames.length === 0
        ? "aucun match passé bloqué dans un statut non terminé"
        : `${staleStatusGames.length} match(s) passé(s) encore en « ${[
            ...new Set(staleStatusGames.map((game) => game.status)),
          ].join(", ")} » : lancer scripts/fix-stale-game-status.ts`,
    ),
    check(
      "Vainqueurs de séries playoffs",
      seriesWinnerErrors.length === 0,
      seriesWinnerErrors.length === 0
        ? "vainqueur déduit du décompte, y compris quand la tête de série tombe"
        : seriesWinnerErrors.join("; "),
    ),
    check(
      "Décomptes de séries playoffs",
      inconsistentSeries.length === 0,
      inconsistentSeries.length === 0
        ? "chaque série terminée compte une équipe au total de victoires requis"
        : `${inconsistentSeries.length} série(s) au décompte incomplet : ${inconsistentSeries
            .map((s) => `${s.season} R${s.round} ${s.team1Wins}-${s.team2Wins}`)
            .join(", ")}`,
      "warn",
    ),
    check(
      "Corrections séries playoffs",
      correctionErrors.length === 0,
      correctionErrors.length === 0
        ? `${PLAYOFF_SERIES_CORRECTIONS.length} séries rectifiées, chacune jouable au format de son époque`
        : correctionErrors.join("; "),
    ),
    check(
      "Corrections séries playoffs appliquées",
      unappliedCorrections.length === 0,
      unappliedCorrections.length === 0
        ? "l'archive ESPN n'a pas réécrit les séries historiques rectifiées"
        : `${unappliedCorrections.length} série(s) revenue(s) à la version ESPN (${unappliedCorrections
            .map((s) => `${s.season} ${s.team1.abbr}-${s.team2.abbr}`)
            .join(", ")}) : lancer pnpm fix:playoff-history`,
    ),
    check(
      "Phases de saison (lecture ESPN)",
      seasonPhaseErrors.length === 0,
      seasonPhaseErrors.length === 0
        ? "présaison, saison régulière, finale NBA Cup, play-in et playoffs distingués"
        : seasonPhaseErrors.join("; "),
    ),
    check(
      "Matchs classés par phase",
      unclassifiedGames === 0,
      unclassifiedGames === 0
        ? "chaque match porte sa saison et sa phase ESPN"
        : `${unclassifiedGames} match(s) sans phase, exclus des moyennes : lancer pnpm tsx scripts/backfill-game-phases.ts --apply`,
    ),
    check(
      "Matchs joués par saison",
      overflowingSeasonRows === 0,
      overflowingSeasonRows === 0
        ? "aucune ligne ne dépasse 82 matchs de saison régulière"
        : `${overflowingSeasonRows} ligne(s) au-delà de 82 matchs en ${CURRENT_SEASON} : présaison ou playoffs comptés dans les moyennes`,
    ),
    check(
      "Statuts de matchs (correspondance ESPN)",
      gameStatusErrors.length === 0,
      gameStatusErrors.length === 0
        ? "reports, matchs terminés et matchs en cours correctement distingués"
        : gameStatusErrors.join("; "),
    ),
    check(
      "Lignes TOT en base",
      inconsistentTotRows.length === 0,
      inconsistentTotRows.length === 0
        ? `${totRows.length} joueur(s) transféré(s) en ${CURRENT_SEASON} : matchs, moyennes et TS% concordent avec les box scores`
        : `${inconsistentTotRows.length}/${totRows.length} ligne(s) TOT divergent des box scores (passage manquant ou compté deux fois)`,
    ),
    check(
      "Fraîcheur des agrégats joueurs",
      staleSeasonRows.length === 0,
      staleSeasonRows.length === 0
        ? "les moyennes de saison couvrent tous les matchs synchronisés"
        : `${staleSeasonRows.length}/${storedPerPlayer.size} joueur(s) dont les moyennes ignorent des matchs déjà synchronisés` +
            ` (retard médian ${medianLag(staleSeasonRows, playedPerPlayer)} match(s)) :` +
            " PlayerSeason n'est pas alimenté par la synchronisation quotidienne",
    ),
    check(
      "Métriques exposées alimentées",
      emptyMetrics.length === 0,
      emptyMetrics.length === 0
        ? `${NULLABLE_METRIC_COLUMNS.length} métriques optionnelles exposées portent des valeurs`
        : `métrique(s) publiée(s) sans aucune donnée : ${emptyMetrics
            .map((metric) => metric.column)
            .join(", ")}`,
    ),
    check("Équipes", teamCount === 30, `${teamCount}/30 équipes présentes`),
    check(
      "Saisons équipes",
      currentTeamSeasonCount === 30 || regularFinalGames === 0,
      regularFinalGames === 0
        ? `aucun match de saison régulière terminé en ${CURRENT_SEASON} : bilans à venir`
        : `${currentTeamSeasonCount}/30 équipes couvertes en ${CURRENT_SEASON}`,
    ),
    check(
      "Saisons joueurs",
      currentPlayerSeasonCount > 0 || regularFinalGames === 0,
      regularFinalGames === 0
        ? `aucun match de saison régulière terminé en ${CURRENT_SEASON} : rien à agréger`
        : `${currentPlayerSeasonCount} lignes en ${CURRENT_SEASON}`,
    ),
    check(
      "Valeurs joueurs",
      invalidPlayerSeasonCount === 0,
      `${invalidPlayerSeasonCount} ligne(s) hors bornes en ${CURRENT_SEASON}`,
    ),
    check(
      "Scores finaux",
      finalGamesWithoutScore === 0,
      `${finalGamesWithoutScore} match(s) final(aux) sans score`,
    ),
    check(
      "Box scores",
      finalGamesWithoutBoxScore === 0,
      `${finalGamesWithoutBoxScore} match(s) final(aux) sans box score`,
      "warn",
    ),
    check(
      "Complétude box scores",
      completeBoxScoreRate >= 98,
      `${completeBoxScoreRate.toFixed(2)} % des matchs finaux ont un box score complet`,
    ),
    check(
      "Identités joueurs",
      identityResolutionRate >= 98,
      `${identityResolutionRate.toFixed(2)} % des lignes nommées sont reliées à un joueur`,
      "warn",
    ),
    check(
      "Couverture calendrier",
      seasonGameCount >= expectedGames,
      `${seasonGameCount} match(s) importé(s), minimum attendu à cette date : ${expectedGames}`,
      "warn",
    ),
    check(
      "Cohérence des matchs",
      invalidGames === 0,
      `${invalidGames} match(s) avec équipes ou scores invalides`,
    ),
    check(
      "Doublons box scores joueurs",
      duplicatePlayerRows.length === 0,
      `${duplicatePlayerRows.length} doublon(s) fonctionnel(s)`,
    ),
    check(
      "Totaux des box scores",
      scoreMismatches.length === 0,
      scoreMismatches.length === 0
        ? "les points joueurs reconstituent le score final sur tous les matchs"
        : `${scoreMismatches.length} match(s) dont les points joueurs diffèrent du score final` +
            ` (lignes manquantes chez ESPN, signalées par un bandeau sur la page match) : ` +
            summarizeMismatches(scoreMismatches),
      "warn",
    ),
    check(
      "Volume de la dernière synchronisation",
      latestDailySync == null || latestDailySync.itemsProcessed > 0,
      latestDailySync == null
        ? "aucune synchronisation à évaluer"
        : latestDailySync.itemsProcessed > 0
          ? `${latestDailySync.itemsProcessed} élément(s) traité(s)`
          : "la dernière synchronisation n'a traité aucun élément : source muette ou pipeline interrompu",
    ),
    check(
      "Fraîcheur sync quotidienne",
      latestDailySync != null && latestDailySync.completedAt >= staleBefore,
      latestDailySync
        ? `dernier statut ${latestDailySync.status} le ${latestDailySync.completedAt.toISOString()}`
        : "aucune synchronisation quotidienne trouvée",
      "warn",
    ),
  ];
}

async function main() {
  const strict = process.argv.includes("--strict");
  const checks = await runHealthChecks();

  console.log(`Santé des données — saison ${CURRENT_SEASON}\n`);
  for (const result of checks) {
    const icon =
      result.status === "pass" ? "✅" : result.status === "warn" ? "⚠️" : "❌";
    console.log(`${icon} ${result.name}: ${result.message}`);
  }

  const warnings = checks.filter((result) => result.status === "warn").length;
  const failures = checks.filter((result) => result.status === "fail").length;
  console.log(
    `\nRésultat : ${failures} échec(s), ${warnings} avertissement(s)`,
  );

  if (strict && failures > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Audit impossible : ${message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
