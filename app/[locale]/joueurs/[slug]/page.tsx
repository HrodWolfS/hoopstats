import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";
import { Crumbs } from "@/components/ui/crumbs";
import { PlayerHeader } from "@/components/player/player-header";
import { PlayerTabs } from "@/components/player/player-tabs";
import type { CareerSeason } from "@/components/player/career-view";
import type { AdvancedSeason } from "@/components/player/advanced-view";

export const revalidate = 21600;
// Pages générées on-demand au premier hit puis cachées (ISR)
// Évite de saturer les connexions Supabase au build avec ~580 pages simultanées
export const dynamicParams = true;

// ── generateStaticParams ─────────────────────────────────────────────────────

export async function generateStaticParams() {
  return [];
}

// ── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hoopstats.fr";
  const player = await prisma.player.findUnique({
    where: { slug },
    select: {
      firstName: true,
      lastName: true,
      position: true,
      photoUrl: true,
      summaryFr: true,
    },
  });
  if (!player) return {};
  const title = `${player.firstName} ${player.lastName} — Stats NBA | hoopstats`;
  const description =
    player.summaryFr ??
    `Stats carrière, historique saisons et stats avancées de ${player.firstName} ${player.lastName}${player.position ? ` (${player.position})` : ""}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE}/fr/joueurs/${slug}`,
      siteName: "hoopstats",
      images: player.photoUrl
        ? [{ url: player.photoUrl, width: 400, height: 400 }]
        : [],
      locale: "fr_FR",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: player.photoUrl ? [player.photoUrl] : [],
    },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const { locale, slug } = await params;
  const { saison } = await searchParams;
  const season = saison ?? CURRENT_SEASON;

  const player = await prisma.player.findUnique({
    where: { slug },
    include: {
      seasons: {
        include: { team: true },
        orderBy: { season: "asc" },
      },
    },
  });
  if (!player) notFound();

  // Saison sélectionnée (ou la plus récente dispo)
  const currentSeason =
    player.seasons.find((s) => s.season === season) ??
    player.seasons[player.seasons.length - 1] ??
    null;

  const currentTeam = currentSeason?.team ?? null;

  // Couleurs équipe actuelle (fallback violet/cyan)
  const primaryColor = currentTeam?.primaryColor ?? "#7C3AED";
  const secondaryColor = currentTeam?.secondaryColor ?? "#06B6D4";

  // Adapter les types
  const career: CareerSeason[] = player.seasons.map((ps) => ({
    season: ps.season,
    teamAbbr: ps.team.abbr,
    gamesPlayed: ps.gamesPlayed,
    minutesPerGame: ps.minutesPerGame,
    pointsPerGame: ps.pointsPerGame,
    reboundsPerGame: ps.reboundsPerGame,
    assistsPerGame: ps.assistsPerGame,
    stealsPerGame: ps.stealsPerGame,
    blocksPerGame: ps.blocksPerGame,
    fgPct: ps.fgPct,
    threePtPct: ps.threePtPct,
    ftPct: ps.ftPct,
  }));

  const advanced: AdvancedSeason[] = player.seasons.map((ps) => ({
    season: ps.season,
    teamAbbr: ps.team.abbr,
    gamesPlayed: ps.gamesPlayed,
    trueShooting: ps.trueShooting,
    usageRate: ps.usageRate,
    per: ps.per,
    offRating: null,
    defRating: null,
    netRating: null,
  }));

  return (
    <div className="space-y-10">
      <Crumbs
        items={[
          { label: "Accueil", href: `/${locale}` },
          { label: "Joueurs", href: `/${locale}/joueurs` },
          { label: `${player.firstName} ${player.lastName}` },
        ]}
      />

      <PlayerHeader
        firstName={player.firstName}
        lastName={player.lastName}
        position={player.position}
        country={player.country}
        teamCity={currentTeam?.city ?? null}
        teamName={currentTeam?.name ?? null}
        teamAbbr={currentTeam?.abbr ?? null}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        photoUrl={player.photoUrl}
        summaryFr={player.summaryFr}
        ppg={currentSeason?.pointsPerGame ?? null}
        rpg={currentSeason?.reboundsPerGame ?? null}
        apg={currentSeason?.assistsPerGame ?? null}
        tsPct={currentSeason?.trueShooting ?? null}
      />

      <PlayerTabs
        primaryColor={primaryColor}
        career={career}
        advanced={advanced}
      />
    </div>
  );
}
