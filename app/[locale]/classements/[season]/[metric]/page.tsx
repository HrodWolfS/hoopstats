import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_SEASONS, currentSeason, seasonsThrough } from "@/lib/nba";
import { frDecimal, pct, stat } from "@/lib/format";
import { playerSeasonHref, teamSeasonHref } from "@/lib/team-links";
import { getLeaderboard, LEADERBOARDS, qualificationSummary } from "@/lib/stats/leaders";
import { loadLeaderboard } from "@/lib/stats/leaderboard-data";
import { MULTI_TEAM_ABBR } from "@/lib/stats/season-consolidation";
import { ShareButton } from "@/components/analytics/share-button";
import { CsvExportButton } from "@/components/analytics/csv-export-button";
import { tableUpdatedAt } from "@/lib/data-updates";
import { csvFilename, isExportable } from "@/lib/export";
import { SourceNote } from "@/components/ui/source-note";
import { playerStatsOrigin } from "@/lib/data-sources";
import { SeasonScope } from "@/components/layout/season-scope";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hoopstats.fr";

export function generateStaticParams() {
  return ALL_SEASONS.flatMap((season) =>
    LEADERBOARDS.map((leaderboard) => ({ season, metric: leaderboard.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; season: string; metric: string }>;
}): Promise<Metadata> {
  const { locale, season, metric } = await params;
  const leaderboard = getLeaderboard(metric);
  if (!leaderboard || !ALL_SEASONS.includes(season)) return {};
  const title = `Leaders NBA ${season} — ${leaderboard.label} | hoopstats`;
  const description = `Classement des 50 meilleurs joueurs NBA en ${leaderboard.label.toLowerCase()} pour la saison ${season}, avec seuil de qualification visible.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/classements/${season}/${leaderboard.slug}`,
    },
    openGraph: { title, description, type: "website" },
  };
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string; season: string; metric: string }>;
}) {
  const { locale, season, metric } = await params;
  const leaderboard = getLeaderboard(metric);
  if (!leaderboard || !ALL_SEASONS.includes(season)) notFound();
  const data = await loadLeaderboard(season, metric);
  if (!data) notFound();
  const { definition, qualification, minimumGames, teamGames, leaders, ranks } = data;
  const liveSeason = currentSeason();
  const origin = playerStatsOrigin(season, leaderboard.metric);
  const formatValue = (value: number) =>
    frDecimal(definition.mode === "percentage" ? `${pct(value)} %` : stat(value));
  const csvTable = isExportable([origin])
    ? {
        title: `Leaders NBA ${season} · ${leaderboard.label} · qualification ${qualificationSummary(qualification, minimumGames)}`,
        updatedAt: await tableUpdatedAt([origin]),
        headers: ["Rang", "Joueur", "Équipe", "MJ", definition.mode === "percentage" ? `${definition.shortLabel} (%)` : definition.shortLabel],
        rows: leaders.map(({ row, value, gamesPlayed }, index) => [
          ranks[index],
          `${row.player.firstName} ${row.player.lastName}`,
          row.isMultiTeam ? `${MULTI_TEAM_ABBR} (${row.stints.map((stint) => stint.team.abbr).join(", ")})` : row.team.abbr,
          gamesPlayed,
          definition.mode === "percentage" ? pct(value) : stat(value),
        ]),
      }
    : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${leaderboard.label} NBA ${season}`,
    numberOfItems: leaders.length,
    itemListElement: leaders.map((entry, index) => ({
      "@type": "ListItem",
      position: ranks[index],
      url: `${BASE_URL}/${locale}/joueurs/${entry.row.player.slug}`,
      name: `${entry.row.player.firstName} ${entry.row.player.lastName}`,
    })),
  };

  return (
    <div className="space-y-7">
      <SeasonScope
        seasons={seasonsThrough(liveSeason, ALL_SEASONS)}
        season={season}
        defaultSeason={liveSeason}
        pathTemplate={`/${locale}/classements/{saison}/${metric}`}
      />
      <nav className="text-xs text-white/30">
        <Link href={`/${locale}/classements`} className="hover:text-white">Classements</Link>
        <span className="mx-2">/</span>{season}<span className="mx-2">/</span>{leaderboard.label}
      </nav>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400/70">Saison {season}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">Leaders — {leaderboard.label}</h1>
        <p className="mt-2 text-sm text-white/35">50 premiers · qualification {qualificationSummary(qualification, minimumGames)}{" "}<Link href={`/${locale}/sources#metriques`} className="underline decoration-white/15 underline-offset-2 hover:text-white">({qualification.rule === "nba" ? "règle NBA" : "règle hoopstats"})</Link></p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <ShareButton dimension="leaderboard" />
          {csvTable && (
            <CsvExportButton dimension="leaderboard" filename={csvFilename(["leaders", season, leaderboard.slug])} table={csvTable} />
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {LEADERBOARDS.map((item) => (
          <Link key={item.slug} href={`/${locale}/classements/${season}/${item.slug}`} className={`rounded-lg border px-3 py-2 text-xs ${item.slug === metric ? "border-orange-500/25 bg-orange-500/[0.08] text-orange-300" : "border-white/[0.06] text-white/40"}`}>{item.label}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#111114]">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/30"><th className="px-3 py-3 sm:px-5 text-left">#</th><th className="px-3 py-3 text-left">Joueur</th><th className="hidden px-3 py-3 text-left sm:table-cell">Équipe</th><th className="px-3 py-3 text-right">MJ</th><th className="px-3 py-3 sm:px-5 text-right text-orange-300">{definition.shortLabel}</th></tr></thead>
          <tbody>{leaders.map(({ row, value, gamesPlayed }, index) => <tr key={row.id} className="border-b border-white/[0.04]"><td className="px-3 py-3 sm:px-5 font-mono text-white/25">{ranks[index]}</td><td className="px-3 py-3"><Link href={playerSeasonHref(locale, row.player.slug, season, liveSeason)} className="font-medium text-white/80 hover:text-orange-300">{row.player.firstName} {row.player.lastName}</Link><span className="mt-0.5 block font-mono text-[11px] text-white/35 sm:hidden">{row.isMultiTeam ? MULTI_TEAM_ABBR : row.team.abbr}</span></td><td className="hidden px-3 py-3 sm:table-cell"><Link href={teamSeasonHref(locale, row.team.slug, season, liveSeason)} className="text-white/40 hover:text-white" title={row.isMultiTeam ? `Saison en ${row.stints.length} équipes : ${row.stints.map((stint) => stint.team.abbr).join(", ")}` : undefined}>{row.isMultiTeam ? MULTI_TEAM_ABBR : row.team.abbr}</Link></td><td className="px-3 py-3 text-right font-mono text-white/35">{gamesPlayed}</td><td className="px-3 py-3 sm:px-5 text-right font-mono font-semibold">{formatValue(value)}</td></tr>)}</tbody>
        </table>
        {leaders.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-white/35">
            {teamGames > 0
              ? `${leaderboard.label} n'est pas encore disponible pour ${season} : la source ne publie pas cette statistique pour l'instant.`
              : `Aucun match de saison régulière joué en ${season} pour l'instant : le classement se remplit après la première nuit de matchs.`}
          </p>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SourceNote origins={[origin]} locale={locale} />
    </div>
  );
}
