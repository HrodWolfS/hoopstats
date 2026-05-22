import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON, confFr, divFr } from "@/lib/nba";
import { winPct } from "@/lib/format";
import { TeamMono } from "@/components/ui/team-mono";
import { Crumbs } from "@/components/ui/crumbs";
import { TeamTabs } from "@/components/team/team-tabs";
import type { RosterPlayer } from "@/components/team/roster-view";
import type { SeasonStats } from "@/components/team/season-view";
import type { HistorySeason } from "@/components/team/history-view";

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
  const team = await prisma.team.findUnique({
    where: { slug },
    select: { city: true, name: true, conference: true },
  });
  if (!team) return {};
  return {
    title: `${team.city} ${team.name} — Stats NBA | hoopstats`,
    description: `Roster, stats saison et historique 10 saisons des ${team.city} ${team.name} (Conférence ${confFr(team.conference)}).`,
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

  const [currentSeason, history, rosterRows] = await Promise.all([
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
        trueShooting: null, // agrégé équipe non dispo — sera enrichi Sprint 5
      }
    : null;

  const historySeason: HistorySeason[] = history.map((h) => ({
    season: h.season,
    wins: h.wins,
    losses: h.losses,
    conferenceRank: h.conferenceRank,
    playoffResult: h.playoffResult,
  }));

  const wPct = currentSeason
    ? winPct(currentSeason.wins, currentSeason.losses)
    : null;

  const rosterDate = new Date().toLocaleDateString("fr-FR");

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
        roster={roster}
        currentSeason={seasonStats}
        history={historySeason}
        rosterDate={rosterDate}
        locale={locale}
      />
    </div>
  );
}
