import type { Metadata } from "next";
import Link from "next/link";
import { ALL_SEASONS, currentSeason } from "@/lib/nba";
import { LEADERBOARDS } from "@/lib/stats/leaders";
import { SeasonScope } from "@/components/layout/season-scope";

export const metadata: Metadata = {
  title: "Classements et leaders NBA par saison | hoopstats",
  description:
    "Retrouvez les leaders NBA en points, rebonds, passes, interceptions, True Shooting et Net Rating pour chaque saison.",
  alternates: { canonical: "/fr/classements" },
};

export default async function LeaderboardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const season = currentSeason();
  // La saison suivante n'a pas encore de leaders tant qu'elle n'a pas commencé.
  const archives = ALL_SEASONS.filter((s) => s <= season);
  return (
    <div className="space-y-8">
      <SeasonScope seasons={archives} season={season} defaultSeason={season} pathTemplate={`/${locale}/classements/{saison}/points`} />
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400/70">
          Leaders NBA
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Classements statistiques
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/40">
          Des classements qualifiés et comparables, saison par saison.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {LEADERBOARDS.map((leaderboard) => (
          <Link
            key={leaderboard.slug}
            href={`/${locale}/classements/${season}/${leaderboard.slug}`}
            className="rounded-2xl border border-white/[0.07] bg-[#111114] p-5 transition hover:border-orange-500/25 hover:bg-orange-500/[0.03]"
          >
            <div className="font-display text-xl text-white/85">
              {leaderboard.label}
            </div>
            <div className="mt-2 font-mono text-[11px] text-white/30">
              Saison {season} →
            </div>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-[10px] font-mono uppercase tracking-wider text-white/30">
          Archives disponibles
        </h2>
        <div className="flex flex-wrap gap-2">
          {archives.map((archive) => (
            <Link
              key={archive}
              href={`/${locale}/classements/${archive}/points`}
              className="rounded-lg border border-white/[0.06] px-3 py-2 text-xs text-white/45 hover:text-white"
            >
              {archive}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
