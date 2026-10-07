import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { isSeasonParam } from "@/lib/query-routes";
import { currentSeason, previousSeason, seasonsThrough } from "@/lib/nba";
import { SeasonScope } from "@/components/layout/season-scope";
import { getPlayoffBracket } from "@/lib/playoffs";
import { PlayoffBracket } from "@/components/ui/playoff-bracket";
import { FadeIn } from "@/components/ui/fade-in";
import { Crumbs } from "@/components/ui/crumbs";
import { SourceNote } from "@/components/ui/source-note";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ saison?: string }>;
}): Promise<Metadata> {
  const { saison } = await params;
  const { defaultSeason } = await defaultPlayoffs();
  // Chaque saison passée est une page à part entière : elle se déclare canonique.
  if (saison === undefined || !isSeasonParam(saison) || saison === defaultSeason) {
    return {
      title: "Playoffs NBA — hoopstats",
      description:
        "Bracket des playoffs NBA : résultats des séries, scores et avancement du tableau.",
      alternates: { canonical: "/fr/playoffs" },
    };
  }
  return {
    title: `Playoffs NBA ${saison} — tableau et séries | hoopstats`,
    description: `Tableau des playoffs NBA ${saison} : séries, scores et parcours de chaque équipe jusqu'aux Finales.`,
    alternates: { canonical: `/fr/playoffs?saison=${saison}` },
  };
}

// Revalidate every 5 min during playoffs season, 6h otherwise
export const revalidate = 300;

function hasBracket(bracket: Awaited<ReturnType<typeof getPlayoffBracket>>): boolean {
  return (
    bracket.west.r1.length > 0 ||
    bracket.east.r1.length > 0 ||
    bracket.nbaFinals !== null
  );
}

/**
 * D'octobre à avril, les playoffs de la saison en cours n'existent pas
 * encore : l'adresse par défaut montre le dernier tableau joué.
 */
async function defaultPlayoffs() {
  const liveSeason = currentSeason();
  const liveBracket = await getPlayoffBracket(liveSeason);
  const defaultSeason = hasBracket(liveBracket) ? liveSeason : previousSeason(liveSeason);
  return { liveSeason, liveBracket, defaultSeason };
}

export default async function PlayoffsPage({
  params,
}: {
  params: Promise<{ locale: string; saison?: string }>;
}) {
  const { locale, saison } = await params;
  if (saison !== undefined && !isSeasonParam(saison)) notFound();
  const { liveSeason, liveBracket, defaultSeason } = await defaultPlayoffs();
  const season = saison ?? defaultSeason;
  const bracket = season === liveSeason ? liveBracket : await getPlayoffBracket(season);

  const hasData = hasBracket(bracket);

  return (
    <div className="space-y-6">
      <SeasonScope seasons={seasonsThrough(liveSeason)} season={season} defaultSeason={defaultSeason} />
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
            <PlayoffBracket data={bracket} locale={locale} liveSeason={liveSeason} />
          </div>
        ) : (
          <p className="text-white/40 text-sm font-mono py-16 text-center">
            {season === liveSeason
              ? `Les playoffs ${season} n'ont pas encore commencé.`
              : `Aucune série de playoffs en base pour ${season}.`}
          </p>
        )}
      </FadeIn>
      <SourceNote origins={["playoffs"]} locale={locale} />
    </div>
  );
}
