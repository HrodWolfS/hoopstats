/**
 * Audit en lecture seule de la santé des données Hoopstats.
 *
 * Par défaut, les anomalies sont signalées sans faire échouer le processus.
 * Utiliser --strict pour retourner un code non nul en présence d'un échec.
 */

import { PrismaClient } from "@prisma/client";
import { CURRENT_SEASON } from "../lib/nba";
import {
  NULLABLE_METRIC_COLUMNS,
  validatePlayerMetricRegistry,
} from "../lib/stats/metrics";
import { validateStatisticalContext } from "../lib/stats/context";
import { validatePlayerIdentityResolver } from "../lib/stats/player-identity";
import { validateAnalyticsPayload } from "../lib/analytics";
import { validatePlayerSimilarity } from "../lib/stats/player-similarity";
import { validateCareerAggregation } from "../lib/stats/career";
import { isStaleStatus, validateGameStatus } from "../lib/game-status";

const prisma = new PrismaClient({ log: ["error"] });

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
  const seasonStart = new Date(Date.UTC(startYear, 9, 1));
  const regularSeasonEnd = new Date(Date.UTC(startYear + 1, 3, 15));

  if (now <= seasonStart) return 0;
  if (now >= regularSeasonEnd) return 1230;

  const progress =
    (now.getTime() - seasonStart.getTime()) /
    (regularSeasonEnd.getTime() - seasonStart.getTime());
  return Math.floor(1230 * progress * 0.9);
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
    .map(([abbr, { games: n, points }]) => `${abbr} ${n} match(s)/${points} pts`)
    .join(", ");
}

async function runHealthChecks(): Promise<HealthCheck[]> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const expectedGames = expectedRegularSeasonGames(now);
  const metricRegistryErrors = validatePlayerMetricRegistry();
  const statisticalContextErrors = validateStatisticalContext();
  const identityResolverErrors = validatePlayerIdentityResolver();
  const analyticsErrors = validateAnalyticsPayload();
  const similarityErrors = validatePlayerSimilarity();
  const careerErrors = validateCareerAggregation();
  const gameStatusErrors = validateGameStatus();

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
      where: { gameDate: { lt: now }, status: { notIn: ["final", "postponed"] } },
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
        boxScore: { is: null },
      },
    }),
    prisma.game.count({ where: { season: CURRENT_SEASON } }),
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
      select: { completedAt: true, status: true },
    }),
    prisma.game.count({ where: { season: CURRENT_SEASON, status: "final" } }),
    prisma.playerBoxScore.count({
      where: {
        didNotPlay: false,
        playerId: { not: null },
        game: { season: CURRENT_SEASON },
      },
    }),
    prisma.playerBoxScore.count({
      where: {
        didNotPlay: false,
        playerName: { not: "—" },
        game: { season: CURRENT_SEASON },
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
  const completeBoxScoreRate =
    finalGameCount === 0
      ? 0
      : ((finalGameCount - finalGamesWithoutBoxScore - scoreMismatches.length) /
          finalGameCount) *
        100;
  const identityResolutionRate =
    eligiblePlayerRows === 0 ? 0 : (resolvedPlayerRows / eligiblePlayerRows) * 100;

  return [
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
        ? "identifiants, accents et suffixes validés"
        : identityResolverErrors.join("; "),
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
      "Agrégation carrière",
      careerErrors.length === 0,
      careerErrors.length === 0
        ? "pondération par matchs et consolidation des transferts validées"
        : careerErrors.join("; "),
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
      "Statuts de matchs (correspondance ESPN)",
      gameStatusErrors.length === 0,
      gameStatusErrors.length === 0
        ? "reports, matchs terminés et matchs en cours correctement distingués"
        : gameStatusErrors.join("; "),
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
      currentTeamSeasonCount === 30,
      `${currentTeamSeasonCount}/30 équipes couvertes en ${CURRENT_SEASON}`,
    ),
    check(
      "Saisons joueurs",
      currentPlayerSeasonCount > 0,
      `${currentPlayerSeasonCount} lignes en ${CURRENT_SEASON}`,
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
  console.log(`\nRésultat : ${failures} échec(s), ${warnings} avertissement(s)`);

  if (strict && failures > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Audit impossible : ${message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
