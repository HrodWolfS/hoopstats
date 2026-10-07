import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ALL_SEASONS, currentSeason, SEASON_OPENERS, seasonsThrough } from "@/lib/nba";
import { SeasonScope } from "@/components/layout/season-scope";
import { FadeIn } from "@/components/ui/fade-in";
import {
  PlayerExplorerTable,
  type PlayerExplorerRow,
} from "@/components/player/player-explorer-table";
import { getPlayerMetric } from "@/lib/stats/metrics";
import {
  calculateMetricContext,
  calculatePopulationSummary,
} from "@/lib/stats/context";
import {
  buildPlayerExplorerWhere,
  computeMetricValue,
  parsePlayerExplorerParams,
  passesExplorerThresholds,
  PLAYER_EXPLORER_METRICS,
} from "@/lib/stats/player-query";
import { MULTI_TEAM_ABBR } from "@/lib/stats/season-consolidation";
import { consolidateSeasonRows } from "@/lib/stats/season-totals";
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
const POSITIONS = ["G", "PG", "SG", "F", "SF", "PF", "C"];

const inputClass =
  "h-10 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-sm text-white/70 outline-none transition focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10";

export default async function PlayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const explorerParams = parsePlayerExplorerParams(await searchParams);
  const where = buildPlayerExplorerWhere(explorerParams);
  const [stintRows, teams] = await Promise.all([
    prisma.playerSeason.findMany({
      where,
      include: {
        player: {
          select: {
            firstName: true,
            lastName: true,
            slug: true,
            position: true,
            photoUrl: true,
          },
        },
        team: {
          select: {
            abbr: true,
            slug: true,
            primaryColor: true,
            secondaryColor: true,
          },
        },
      },
    }),
    prisma.team.findMany({
      orderBy: { abbr: "asc" },
      select: { abbr: true, city: true, name: true },
    }),
  ]);
  // Une ligne par joueur : les seuils s'appliquent à la saison entière d'un
  // joueur transféré, pas à chacun de ses passages.
  const allRows = (
    await consolidateSeasonRows(explorerParams.season, stintRows)
  ).filter((row) => passesExplorerThresholds(row, explorerParams));
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
    ? await consolidateSeasonRows(
        previousSeason,
        await prisma.playerSeason.findMany({
          where: {
            season: previousSeason,
            playerId: { in: rankedRows.map(({ row }) => row.playerId) },
          },
        }),
      )
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
        <form
          method="get"
          action={`/${locale}/joueurs`}
          className="rounded-2xl border border-white/[0.07] bg-[#111114] p-4 md:p-5 space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
                Joueur
              </span>
              <input
                className={`${inputClass} w-full`}
                type="search"
                name="q"
                defaultValue={resolvedParams.query}
                placeholder="Nom ou prénom…"
              />
            </label>
            <FilterSelect
              label="Saison"
              name="saison"
              value={resolvedParams.season}
              options={(seasons.includes(resolvedParams.season) ? seasons : [resolvedParams.season, ...seasons]).map((season) => ({ value: season, label: season }))}
            />
            <FilterSelect
              label="Équipe"
              name="equipe"
              value={resolvedParams.team}
              options={[
                { value: "", label: "Toutes" },
                ...teams.map((team) => ({
                  value: team.abbr,
                  label: `${team.abbr} — ${team.city} ${team.name}`,
                })),
              ]}
            />
            <FilterSelect
              label="Position"
              name="position"
              value={resolvedParams.position}
              options={[
                { value: "", label: "Toutes" },
                ...POSITIONS.map((position) => ({
                  value: position,
                  label: position,
                })),
              ]}
            />
            <FilterSelect
              label="Statistique"
              name="stat"
              value={resolvedParams.metric}
              options={PLAYER_EXPLORER_METRICS.map((metric) => ({
                value: metric,
                label: `${getPlayerMetric(metric).shortLabel} — ${getPlayerMetric(metric).label}`,
              }))}
            />
            <FilterSelect
              label="Mode"
              name="mode"
              value={resolvedParams.mode}
              options={[
                { value: "perGame", label: "Par match" },
                { value: "total", label: "Total estimé" },
                { value: "per36", label: "Par 36 minutes" },
              ]}
            />
            <FilterSelect
              label="Ordre"
              name="ordre"
              value={resolvedParams.direction}
              options={[
                { value: "desc", label: "Décroissant" },
                { value: "asc", label: "Croissant" },
              ]}
            />
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
                Minimum de matchs
              </span>
              <input
                className={`${inputClass} w-full tabular-nums`}
                type="number"
                name="min_mj"
                min="0"
                max="82"
                defaultValue={resolvedParams.minimumGames}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
                Minutes par match min.
              </span>
              <input
                className={`${inputClass} w-full tabular-nums`}
                type="number"
                name="min_min"
                min="0"
                max="48"
                defaultValue={resolvedParams.minimumMinutes}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-white/25 font-mono">
              Les filtres sont conservés dans l’URL et peuvent être partagés.
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/joueurs`}
                className="h-10 inline-flex items-center rounded-lg px-4 text-xs text-white/40 hover:text-white/70 transition"
              >
                Réinitialiser
              </Link>
              <button
                type="submit"
                className="h-10 rounded-lg bg-orange-600 px-5 text-sm font-medium text-white hover:bg-orange-500 transition shadow-lg shadow-orange-950/20"
              >
                Appliquer
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/[0.05] pt-4">
            <CriteriaPill label="Saison" value={resolvedParams.season} />
            <CriteriaPill label="Stat" value={activeMetric.shortLabel} accent />
            <CriteriaPill
              label="Mode"
              value={
                resolvedParams.mode === "total"
                  ? "Total estimé"
                  : resolvedParams.mode === "per36"
                    ? "Par 36"
                    : "Par match"
              }
            />
            {resolvedParams.team && (
              <CriteriaPill label="Équipe" value={resolvedParams.team} />
            )}
            {resolvedParams.position && (
              <CriteriaPill label="Position" value={resolvedParams.position} />
            )}
            {resolvedParams.query && (
              <CriteriaPill label="Recherche" value={resolvedParams.query} />
            )}
            <CriteriaPill
              label="Échantillon"
              value={`${resolvedParams.minimumGames} MJ${resolvedParams.minimumMinutes > 0 ? ` · ${resolvedParams.minimumMinutes} min` : ""}`}
            />
          </div>
        </form>
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
                Essaie une autre saison ou réduis le minimum de matchs.
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

function CriteriaPill({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono ${
        accent
          ? "border-orange-500/20 bg-orange-500/[0.08] text-orange-300"
          : "border-white/[0.07] bg-white/[0.025] text-white/45"
      }`}
    >
      <span className="text-white/25">{label}</span>
      {value}
    </span>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
        {label}
      </span>
      <select className={`${inputClass} w-full`} name={name} defaultValue={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
