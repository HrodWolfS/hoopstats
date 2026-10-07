import Link from "next/link";
import { Suspense } from "react";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { currentSeason } from "@/lib/nba";
import { isSeasonParam } from "@/lib/query-routes";
import { loadTrends, trendSeasons } from "@/lib/stats/trends-data";
import { SeasonScope } from "@/components/layout/season-scope";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";
import { DEFAULT_TRENDS_STATE, TrendsView, TrendsViewFromUrl } from "@/components/trends/trends-view";

export const revalidate = 21600;

export async function generateMetadata({ params }: { params: Promise<{ saison?: string }> }): Promise<Metadata> {
  const { saison } = await params;
  const seasons = await trendSeasons();
  const season = saison !== undefined && saison !== seasons[0] && seasons.includes(saison) ? saison : null;
  const description =
    "Qui est en forme en NBA ? Les 5, 10 et 20 derniers matchs de chaque joueur face à sa moyenne de saison : points, tirs, efficacité et minutes.";
  if (!season) {
    return {
      title: "Tendances NBA — joueurs en forme | hoopstats",
      description,
      alternates: { canonical: "/fr/tendances" },
    };
  }
  return {
    title: `Tendances NBA ${season} — joueurs en forme | hoopstats`,
    description,
    alternates: { canonical: `/fr/tendances?saison=${season}` },
  };
}

export default async function TrendsPage({ params }: { params: Promise<{ locale: string; saison?: string }> }) {
  const { locale, saison } = await params;
  if (saison !== undefined && !isSeasonParam(saison)) notFound();
  const seasons = await trendSeasons();
  const defaultSeason = seasons[0];
  if (!defaultSeason || (saison !== undefined && !seasons.includes(saison))) notFound();
  const season = saison ?? defaultSeason;
  const data = await loadTrends(season);
  const liveSeason = currentSeason();
  const lastDate = data.lastGameDate
    ? new Date(data.lastGameDate).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "America/New_York",
      })
    : null;
  const viewProps = { data, locale, liveSeason };

  return (
    <div className="space-y-6">
      <SeasonScope seasons={seasons} season={season} defaultSeason={defaultSeason} />
      <FadeIn>
        <Crumbs items={[{ label: "Accueil", href: `/${locale}` }, { label: "Tendances" }]} />
        <div className="mt-4 space-y-2">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
            Tendances
            <span className="ml-3 inline-block text-3xl font-normal text-white/30">{season}</span>
          </h1>
          <p className="max-w-2xl text-sm text-white/45">
            Qui est en forme, qui ralentit, qui a changé de rôle : les derniers matchs joués de chaque joueur
            comparés à sa moyenne de saison régulière.
          </p>
          <p className="text-[11px] text-white/30">
            {lastDate ? `Box scores de saison régulière jusqu'au ${lastDate}. ` : ""}
            <Link href={`/${locale}/sources#tendances`} className="underline decoration-white/15 underline-offset-2 hover:text-white">
              Règles et seuils
            </Link>
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Suspense fallback={<TrendsView {...viewProps} initial={DEFAULT_TRENDS_STATE} />}>
          <TrendsViewFromUrl {...viewProps} />
        </Suspense>
      </FadeIn>
    </div>
  );
}
