import { type Metadata } from "next";
import { ALL_SEASONS, currentSeason, SEASON_OPENERS, seasonsThrough } from "@/lib/nba";
import { SeasonScope } from "@/components/layout/season-scope";
import { FadeIn } from "@/components/ui/fade-in";
import {
  PlayerExplorerTable,
  type PlayerExplorerRow,
} from "@/components/player/player-explorer-table";
import { PlayerExplorerFilters } from "@/components/player/player-explorer-filters";
import { getPlayerMetric } from "@/lib/stats/metrics";
import {
  calculateMetricContext,
  calculatePopulationSummary,
} from "@/lib/stats/context";
import {
  automaticMinimumGames,
  computeMetricValue,
  filterExplorerRows,
  parsePlayerExplorerParams,
  passesExplorerThresholds,
} from "@/lib/stats/player-query";
import { seasonTeamGames } from "@/lib/stats/leaders";
import { MULTI_TEAM_ABBR } from "@/lib/stats/season-consolidation";
import { loadExplorerSeason, loadExplorerTeams } from "@/lib/stats/player-explorer-data";
import { AnalyticsEvent } from "@/components/analytics/analytics-event";
import { ShareButton } from "@/components/analytics/share-button";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale } = await params;
  const query = await searchParams;
  const hasFilters = Object.values(query).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );

  return {
    title: "Explorer les statistiques des joueurs NBA — hoopstats",
    description:
      "Classements NBA filtrables par saison, équipe, position et statistique.",
    alternates: { canonical: `/${locale}/joueurs` },
    robots: { index: !hasFilters, follow: true },
  };
}

const PAGE_SIZE = 50;

export default async function PlayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const parsedParams = parsePlayerExplorerParams(await searchParams);
  const [seasonData, teams] = await Promise.all([
    loadExplorerSeason(parsedParams.season),
    loadExplorerTeams(),
  ]);
  const seasonRows = filterExplorerRows(seasonData, parsedParams);
  const explorerParams = parsedParams.minimumGamesExplicit
    ? parsedParams
    : {
        ...parsedParams,
        minimumGames: automaticMinimumGames(
          seasonTeamGames(seasonData.flatMap((row) => row.stints)),
          parsedParams.query,
        ),
      };
  const allRows = seasonRows.filter((row) =>
    passesExplorerThresholds(row, explorerParams),
  );
  const total = allRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(explorerParams.page, totalPages);
  const resolvedParams = { ...explorerParams, page: currentPage };

  const valuedRows = allRows.map((row) => ({
    row,
    metricValue: computeMetricValue(
      row[resolvedParams.metric],
      row.gamesPlayed,
      row.minutesPerGame,
      resolvedParams.mode,
    ),
  }));
  const populationValues = valuedRows.map(({ metricValue }) => metricValue);
  const population = calculatePopulationSummary(populationValues);
  const activeMetric = getPlayerMetric(resolvedParams.metric);
  const rankedRows = valuedRows
    .sort((left, right) => {
      if (left.metricValue == null) return 1;
      if (right.metricValue == null) return -1;
      const difference = left.metricValue - right.metricValue;
      return resolvedParams.direction === "asc" ? difference : -difference;
    })
    .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const previousSeason = ALL_SEASONS[ALL_SEASONS.indexOf(resolvedParams.season) + 1];
  const previousRows = previousSeason && rankedRows.length > 0
    ? await loadExplorerSeason(previousSeason)
    : [];
  const previousByPlayer = new Map(
    previousRows.map((row) => [row.playerId, row]),
  );

  const tableRows: PlayerExplorerRow[] = rankedRows.map(({ row, metricValue }) => ({
    id: row.id,
    playerSlug: row.player.slug,
    firstName: row.player.firstName,
    lastName: row.player.lastName,
    position: row.player.position,
    photoUrl: row.player.photoUrl,
    teamAbbr: row.isMultiTeam ? MULTI_TEAM_ABBR : row.team.abbr,
    teamSlug: row.isMultiTeam ? null : row.team.slug,
    teams: row.stints.map((stint) => stint.team.abbr),
    primaryColor: row.team.primaryColor,
    secondaryColor: row.team.secondaryColor,
    gamesPlayed: row.gamesPlayed,
    metricValue,
    context: calculateMetricContext(
      populationValues,
      metricValue,
      activeMetric.higherIsBetter,
    ),
    previousValue: (() => {
      const previous = previousByPlayer.get(row.playerId);
      return previous
        ? computeMetricValue(
            previous[resolvedParams.metric],
            previous.gamesPlayed,
            previous.minutesPerGame,
            resolvedParams.mode,
          )
        : null;
    })(),
  }));

  const liveSeason = currentSeason();
  const seasons = seasonsThrough(liveSeason, ALL_SEASONS);
  const opener = resolvedParams.season > liveSeason ? SEASON_OPENERS[resolvedParams.season] : undefined;

  return (
    <div className="space-y-7">
      <SeasonScope seasons={seasons} season={resolvedParams.season} defaultSeason={liveSeason} />
      {resolvedParams.query && (
        <AnalyticsEvent
          event="player_search"
          dimension={tableRows.length === 0 ? "empty" : "results"}
          dedupeKey={`search:${resolvedParams.query}:${resolvedParams.season}:${tableRows.length === 0}`}
        />
      )}
      <AnalyticsEvent
        event="filter_apply"
        dimension={resolvedParams.metric}
        dedupeKey={`filter:${JSON.stringify(resolvedParams)}`}
      />
      <FadeIn>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-orange-400/70 mb-2">
              Stat desk
            </div>
            <h1 className="font-display font-semibold text-4xl tracking-tight mb-1">
              Explorer les joueurs
            </h1>
            <p className="text-white/40 text-sm">
              Classements personnalisés, statistiques joueurs depuis {ALL_SEASONS[ALL_SEASONS.length - 1]}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ShareButton dimension="player_explorer" />
          <div className="rounded-xl border border-orange-500/15 bg-orange-500/[0.04] px-4 py-3 md:text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">
              Classement actif
            </div>
            <div className="font-display text-lg text-orange-300">
              {activeMetric.label}
            </div>
          </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.04}>
        <PlayerExplorerFilters
          locale={locale}
          params={resolvedParams}
          seasons={seasons}
          teams={teams}
        />
      </FadeIn>

      {tableRows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] py-16 text-center space-y-2">
          {resolvedParams.season > liveSeason ? (
            <>
              <p className="text-white/50">La saison {resolvedParams.season} n&apos;a pas encore commencé.</p>
              <p className="text-xs text-white/25">
                {opener
                  ? `Premier match le ${new Date(opener).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}.`
                  : "Les statistiques arrivent après la première nuit de matchs."}
              </p>
            </>
          ) : (
            <>
              <p className="text-white/50">Aucun joueur ne correspond à ces critères.</p>
              <p className="text-xs text-white/25">
                {resolvedParams.query
                  ? `Aucun nom ne contient « ${resolvedParams.query} » en ${resolvedParams.season} : vérifie l’orthographe ou change de saison.`
                  : "Essaie une autre saison ou réduis le minimum de matchs."}
              </p>
            </>
          )}
        </div>
      ) : (
        <FadeIn delay={0.08}>
          <PlayerExplorerTable
            rows={tableRows}
            params={resolvedParams}
            locale={locale}
            total={total}
            pageSize={PAGE_SIZE}
            population={population}
            previousSeason={previousSeason ?? null}
          />
        </FadeIn>
      )}
    </div>
  );
}
