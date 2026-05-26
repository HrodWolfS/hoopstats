import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON, confFr, divFr } from "@/lib/nba";
import { winPct } from "@/lib/format";
import { TeamMono } from "@/components/ui/team-mono";
import { Crumbs } from "@/components/ui/crumbs";
import { TeamTabs } from "@/components/team/team-tabs";
import type { RosterPlayer } from "@/components/team/roster-view";
import type { SeasonStats, ConferenceRow } from "@/components/team/season-view";
import type { HistorySeason } from "@/components/team/history-view";
import type { GameRow } from "@/components/team/recent-games";

export const revalidate = 21600; // 6h ISR

// ── generateStaticParams ────────────────────────────────────────────────────

export async function generateStaticParams() {
  const teams = await prisma.team.findMany({ select: { slug: true } });
  return teams.map((t) => ({ slug: t.slug }));
}

// ── generateMetadata ────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hoopstats.fr";

  const [team, currentSeason] = await Promise.all([
    prisma.team.findUnique({
      where: { slug },
      select: {
        city: true,
        name: true,
        abbr: true,
        conference: true,
        logoUrl: true,
      },
    }),
    prisma.teamSeason.findFirst({
      where: { team: { slug }, season: CURRENT_SEASON },
      select: { wins: true, losses: true, conferenceRank: true },
    }),
  ]);
  if (!team) return {};

  const recordStr = currentSeason
    ? `${currentSeason.wins}-${currentSeason.losses}`
    : null;
  const rankStr = currentSeason?.conferenceRank
    ? `, ${currentSeason.conferenceRank}e Conférence ${confFr(team.conference)}`
    : ` · Conférence ${confFr(team.conference)}`;

  const description = recordStr
    ? `Stats NBA ${CURRENT_SEASON} des ${team.city} ${team.name} (${team.abbr}) : ${recordStr}${rankStr}. Roster, rating offensif/défensif, matchs récents et historique.`
    : `Roster, stats saison et historique des ${team.city} ${team.name} (Conférence ${confFr(team.conference)}). Stats avancées, classement et historique NBA.`;

  const title = `${team.city} ${team.name} — Stats NBA ${CURRENT_SEASON}, roster et historique | hoopstats`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE}/fr/equipes/${slug}`,
      siteName: "hoopstats",
      images: team.logoUrl
        ? [{ url: team.logoUrl, width: 200, height: 200 }]
        : [],
      locale: "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: team.logoUrl ? [team.logoUrl] : [],
    },
  };
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const { locale, slug } = await params;
  const { saison } = await searchParams;
  const season = saison ?? CURRENT_SEASON;

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) notFound();

  const gameInclude = {
    homeTeam: {
      select: {
        id: true,
        slug: true,
        city: true,
        name: true,
        abbr: true,
        logoUrl: true,
        primaryColor: true,
      },
    },
    awayTeam: {
      select: {
        id: true,
        slug: true,
        city: true,
        name: true,
        abbr: true,
        logoUrl: true,
        primaryColor: true,
      },
    },
  } as const;

  const [
    currentSeason,
    history,
    rosterRows,
    conferenceStandings,
    recentGamesRaw,
    upcomingGamesRaw,
  ] = await Promise.all([
    prisma.teamSeason.findFirst({
      where: { teamId: team.id, season },
    }),
    prisma.teamSeason.findMany({
      where: { teamId: team.id },
      orderBy: { season: "asc" },
    }),
    prisma.playerSeason.findMany({
      where: { teamId: team.id, season },
      orderBy: { pointsPerGame: "desc" },
      take: 20,
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
      },
    }),
    // Classement de la conférence pour l'onglet "Saison actuelle"
    prisma.teamSeason.findMany({
      where: {
        season,
        team: { conference: team.conference },
      },
      orderBy: { conferenceRank: "asc" },
      select: {
        wins: true,
        losses: true,
        conferenceRank: true,
        previousConferenceRank: true,
        team: {
          select: {
            id: true,
            slug: true,
            city: true,
            name: true,
            abbr: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
      },
    }),
    // 10 derniers matchs joués
    prisma.game.findMany({
      where: {
        status: "final",
        season: CURRENT_SEASON,
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      orderBy: { gameDate: "desc" },
      take: 10,
      include: gameInclude,
    }),
    // 3 prochains matchs
    prisma.game.findMany({
      where: {
        status: "scheduled",
        season: CURRENT_SEASON,
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      orderBy: { gameDate: "asc" },
      take: 3,
      include: gameInclude,
    }),
  ]);

  // ── Adapter les types pour les composants ─────────────────────────────────

  const roster: RosterPlayer[] = rosterRows.map((ps) => ({
    slug: ps.player.slug,
    firstName: ps.player.firstName,
    lastName: ps.player.lastName,
    position: ps.player.position,
    jerseyNumber: null,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    photoUrl: ps.player.photoUrl,
    pointsPerGame: ps.pointsPerGame,
    reboundsPerGame: ps.reboundsPerGame,
    assistsPerGame: ps.assistsPerGame,
  }));

  const seasonStats: SeasonStats | null = currentSeason
    ? {
        wins: currentSeason.wins,
        losses: currentSeason.losses,
        offRating: currentSeason.offRating,
        defRating: currentSeason.defRating,
        netRating: currentSeason.netRating,
        pace: currentSeason.pace,
        trueShooting: null,
        summaryFr: currentSeason.summaryFr ?? null,
      }
    : null;

  const historySeason: HistorySeason[] = history.map((h) => ({
    season: h.season,
    wins: h.wins,
    losses: h.losses,
    conferenceRank: h.conferenceRank,
    playoffResult: h.playoffResult,
  }));

  const standings: ConferenceRow[] = conferenceStandings.map((cs) => ({
    conferenceRank: cs.conferenceRank,
    previousConferenceRank: cs.previousConferenceRank,
    wins: cs.wins,
    losses: cs.losses,
    team: cs.team,
  }));

  const teamId = team.id;

  function toGameRow(
    g: (typeof recentGamesRaw)[number] | (typeof upcomingGamesRaw)[number],
  ): GameRow {
    const isHome = g.homeTeamId === teamId;
    const opponent = isHome ? g.awayTeam : g.homeTeam;
    return {
      id: g.id,
      gameDate: g.gameDate.toISOString(),
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      status: g.status,
      isHome,
      opponent,
    };
  }

  const recentGames: GameRow[] = recentGamesRaw.map(toGameRow);
  const upcomingGames: GameRow[] = upcomingGamesRaw.map(toGameRow);

  const wPct = currentSeason
    ? winPct(currentSeason.wins, currentSeason.losses)
    : null;

  const rosterDate = new Date().toLocaleDateString("fr-FR");

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hoopstats.fr";

  const teamUrl = `${BASE_URL}/${locale}/equipes/${slug}`;

  const jsonLdTeam: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: `${team.city} ${team.name}`,
    url: teamUrl,
    sport: "Basketball",
    ...(team.logoUrl && { image: team.logoUrl }),
    memberOf: { "@type": "SportsOrganization", name: "NBA" },
    foundingDate: String(team.founded),
    location: {
      "@type": "Place",
      name: team.city_country ?? team.city,
    },
    ...(team.arena && {
      homeLocation: { "@type": "Place", name: team.arena },
    }),
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: `${BASE_URL}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Équipes",
        item: `${BASE_URL}/${locale}/equipes`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${team.city} ${team.name}`,
        item: teamUrl,
      },
    ],
  };

  return (
    <div className="space-y-10">
      <Crumbs
        items={[
          { label: "Accueil", href: `/${locale}` },
          { label: "Équipes", href: `/${locale}/equipes` },
          { label: `${team.city} ${team.name}` },
        ]}
      />

      {/* Header */}
      <section className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 md:col-span-4">
          <TeamMono
            abbr={team.abbr}
            primaryColor={team.primaryColor}
            secondaryColor={team.secondaryColor}
            logoUrl={team.logoUrl}
            size="hero"
            className="shadow-2xl"
          />
        </div>
        <div className="col-span-12 md:col-span-8 space-y-5">
          <div>
            <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mb-3">
              Conférence {confFr(team.conference)} · Division{" "}
              {divFr(team.division)}
            </div>
            <h1 className="font-display font-semibold text-6xl md:text-7xl tracking-[-0.04em] leading-[0.95]">
              {team.city}
              <br />
              <span className="text-white/40">{team.name}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4 pt-2">
            {currentSeason && (
              <>
                <div>
                  <div className="text-[11px] text-white/40 uppercase tracking-wider">
                    Bilan
                  </div>
                  <div className="font-display font-semibold text-3xl tabular-nums mt-1">
                    {currentSeason.wins}
                    <span className="text-white/30 mx-1">–</span>
                    {currentSeason.losses}
                  </div>
                  <div className="text-xs text-white/40 font-mono mt-0.5">
                    {wPct}% de victoires
                  </div>
                </div>
                {currentSeason.conferenceRank && (
                  <div>
                    <div className="text-[11px] text-white/40 uppercase tracking-wider">
                      Classement
                    </div>
                    <div className="font-display font-semibold text-3xl tabular-nums mt-1">
                      {currentSeason.conferenceRank}
                      <span className="text-white/40 text-lg">e</span>
                      <span className="text-white/30 text-base font-sans">
                        {" "}
                        {confFr(team.conference)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
            {team.arena && (
              <div>
                <div className="text-[11px] text-white/40 uppercase tracking-wider">
                  Salle
                </div>
                <div className="text-base mt-1">{team.arena}</div>
                <div className="text-xs text-white/40 mt-0.5">
                  Fondée en {team.founded}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tabs + vues */}
      <TeamTabs
        primaryColor={team.primaryColor}
        teamId={team.id}
        roster={roster}
        currentSeason={seasonStats}
        standings={standings}
        history={historySeason}
        recentGames={recentGames}
        upcomingGames={upcomingGames}
        rosterDate={rosterDate}
        locale={locale}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdTeam) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
    </div>
  );
}
