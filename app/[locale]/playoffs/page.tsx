import { type Metadata } from "next";
import { CURRENT_SEASON } from "@/lib/nba";
import { getPlayoffBracket } from "@/lib/playoffs";
import { PlayoffBracket } from "@/components/ui/playoff-bracket";
import { FadeIn } from "@/components/ui/fade-in";
import { Crumbs } from "@/components/ui/crumbs";

export const metadata: Metadata = {
  title: "Playoffs NBA — hoopstats",
  description:
    "Bracket des playoffs NBA : résultats des séries, scores et avancement du tableau.",
};

// Revalidate every 5 min during playoffs season, 6h otherwise
export const revalidate = 300;

export default async function PlayoffsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const { locale } = await params;
  const { saison } = await searchParams;
  const season = saison ?? CURRENT_SEASON;

  const bracket = await getPlayoffBracket(season);

  const hasData =
    bracket.west.r1.length > 0 ||
    bracket.east.r1.length > 0 ||
    bracket.nbaFinals !== null;

  return (
    <div className="space-y-6">
      <FadeIn>
        <Crumbs
          items={[
            { label: "Accueil", href: `/${locale}` },
            { label: "Playoffs" },
          ]}
        />
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium uppercase tracking-wider mb-4">
            🏆 Playoffs {season}
          </div>
          <h1 className="font-display font-semibold text-4xl md:text-5xl tracking-[-0.03em] mb-2">
            Playoffs
            <span className="text-white/30 ml-3 font-normal text-3xl">
              {season}
            </span>
          </h1>
        </div>
      </FadeIn>

      {/* Bracket — breaks out of the page padding to use full content width */}
      <FadeIn delay={0.1}>
        {hasData ? (
          <div className="-mx-8 lg:-mx-12">
            <PlayoffBracket data={bracket} locale={locale} />
          </div>
        ) : (
          <p className="text-white/40 text-sm font-mono py-16 text-center">
            Aucune donnée playoff disponible pour la saison {season}.
          </p>
        )}
      </FadeIn>
    </div>
  );
}
