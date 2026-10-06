import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ALL_SEASONS } from "@/lib/nba";
import { pct, stat } from "@/lib/format";
import { getPlayerMetric } from "@/lib/stats/metrics";
import {
  consolidateForRanking,
  getLeaderboard,
  leaderboardValue,
  LEADERBOARDS,
  scaledMinimumGames,
} from "@/lib/stats/leaders";
import { ShareButton } from "@/components/analytics/share-button";

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
  const ranked = consolidateForRanking(rows, leaderboard.metric, (row) =>
    leaderboardValue(row, leaderboard.metric),
  );
  // Le joueur le plus utilisé donne l'avancement de la saison en matchs.
  const teamGames = ranked.reduce((most, entry) => Math.max(most, entry.gamesPlayed), 0);
  const minimumGames = scaledMinimumGames(teamGames, definition.minimumGames);
  const leaders = ranked
    .filter((entry) => entry.gamesPlayed >= minimumGames)
    .filter((entry): entry is typeof entry & { value: number } => entry.value != null)
    .sort((left, right) =>
      definition.higherIsBetter ? right.value - left.value : left.value - right.value,
    )
    .slice(0, 50);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${leaderboard.label} NBA ${season}`,
    numberOfItems: leaders.length,
    itemListElement: leaders.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE_URL}/${locale}/joueurs/${entry.row.player.slug}`,
      name: `${entry.row.player.firstName} ${entry.row.player.lastName}`,
    })),
  };

  return (
    <div className="space-y-7">
      <nav className="text-xs text-white/30">
        <Link href={`/${locale}/classements`} className="hover:text-white">Classements</Link>
        <span className="mx-2">/</span>{season}<span className="mx-2">/</span>{leaderboard.label}
      </nav>
      <div className="flex items-start justify-between gap-4">
        <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400/70">Saison {season}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">Leaders — {leaderboard.label}</h1>
        <p className="mt-2 text-sm text-white/35">50 premiers · qualification ≥ {minimumGames} {minimumGames > 1 ? "matchs" : "match"}</p>
        </div>
        <ShareButton dimension="leaderboard" />
      </div>
      <div className="flex flex-wrap gap-2">
        {LEADERBOARDS.map((item) => (
          <Link key={item.slug} href={`/${locale}/classements/${season}/${item.slug}`} className={`rounded-lg border px-3 py-2 text-xs ${item.slug === metric ? "border-orange-500/25 bg-orange-500/[0.08] text-orange-300" : "border-white/[0.06] text-white/40"}`}>{item.label}</Link>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111114]">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/30"><th className="px-5 py-3 text-left">#</th><th className="px-3 py-3 text-left">Joueur</th><th className="px-3 py-3 text-left">Équipe</th><th className="px-3 py-3 text-right">MJ</th><th className="px-5 py-3 text-right text-orange-300">{definition.shortLabel}</th></tr></thead>
          <tbody>{leaders.map(({ row, value, gamesPlayed }, index) => <tr key={row.id} className="border-b border-white/[0.04]"><td className="px-5 py-3 font-mono text-white/25">{index + 1}</td><td className="px-3 py-3"><Link href={`/${locale}/joueurs/${row.player.slug}`} className="font-medium text-white/80 hover:text-orange-300">{row.player.firstName} {row.player.lastName}</Link></td><td className="px-3 py-3"><Link href={`/${locale}/equipes/${row.team.slug}`} className="text-white/40 hover:text-white">{row.team.abbr}</Link></td><td className="px-3 py-3 text-right font-mono text-white/35">{gamesPlayed}</td><td className="px-5 py-3 text-right font-mono font-semibold">{definition.mode === "percentage" ? `${pct(value)} %` : stat(value)}</td></tr>)}</tbody>
        </table>
        {leaders.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-white/35">
            Aucun match de saison régulière joué en {season} pour l&apos;instant : le classement se remplit après la première nuit de matchs.
          </p>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
