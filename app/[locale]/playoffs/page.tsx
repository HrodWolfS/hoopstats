import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { isSeasonParam } from "@/lib/query-routes";
import { currentSeason, previousSeason } from "@/lib/nba";
import { getPlayoffBracket } from "@/lib/playoffs";
import { PlayoffBracket } from "@/components/ui/playoff-bracket";
import { FadeIn } from "@/components/ui/fade-in";
import { Crumbs } from "@/components/ui/crumbs";

export const metadata: Metadata = {
  title: "Playoffs NBA — hoopstats",
  description:
    "Bracket des playoffs NBA : résultats des séries, scores et avancement du tableau.",
  alternates: { canonical: "/fr/playoffs" },
};

// Revalidate every 5 min during playoffs season, 6h otherwise
export const revalidate = 300;

function hasBracket(bracket: Awaited<ReturnType<typeof getPlayoffBracket>>): boolean {
  return (
    bracket.west.r1.length > 0 ||
    bracket.east.r1.length > 0 ||
    bracket.nbaFinals !== null
  );
}

export default async function PlayoffsPage({
  params,
}: {
  params: Promise<{ locale: string; saison?: string }>;
}) {
  const { locale, saison } = await params;
  if (saison !== undefined && !isSeasonParam(saison)) notFound();
  const requested = saison ?? currentSeason();
  let season = requested;
  let bracket = await getPlayoffBracket(season);

  // D'octobre à avril, les playoffs de la saison en cours n'existent pas
  // encore : l'adresse par défaut montre le dernier tableau joué.
  if (saison === undefined && !hasBracket(bracket)) {
    season = previousSeason(requested);
    bracket = await getPlayoffBracket(season);
  }

  const hasData = hasBracket(bracket);

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
          <div className="-mx-4 md:-mx-8 lg:-mx-12">
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
