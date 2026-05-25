import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GENERATIONS } from "@/lib/best-fives";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TeamMono } from "@/components/ui/team-mono";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Équipes légendaires par génération — hoopstats",
  description:
    "Les franchises NBA qui ont défini leur époque : Celtics dynasty, Showtime Lakers, Bulls de Jordan, Spurs de Duncan, Warriors de Curry.",
};

const POSITION_SHORT: Record<string, string> = {
  PG: "MEN",
  SG: "ARR",
  SF: "AIL",
  PF: "A-F",
  C: "PIV",
};

export default async function MeilleursCinqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Fetch all slugs needed: player photos + team logos
  const allPlayerSlugs = GENERATIONS.flatMap((era) =>
    era.teams.flatMap((team) => team.players.map((p) => p.slug)),
  );
  const allTeamSlugs = [
    ...new Set(GENERATIONS.flatMap((era) => era.teams.map((t) => t.teamSlug))),
  ];

  const [playerRows, teamRows] = await Promise.all([
    prisma.player.findMany({
      where: { slug: { in: allPlayerSlugs } },
      select: { slug: true, photoUrl: true },
    }),
    prisma.team.findMany({
      where: { slug: { in: allTeamSlugs } },
      select: { slug: true, abbr: true, logoUrl: true },
    }),
  ]);

  const photoMap = new Map<string, string | null>(
    playerRows.map((r) => [r.slug, r.photoUrl]),
  );
  const teamMap = new Map<string, { abbr: string; logoUrl: string | null }>(
    teamRows.map((r) => [r.slug, { abbr: r.abbr, logoUrl: r.logoUrl }]),
  );

  return (
    <div className="space-y-20">
      <FadeIn>
        <Crumbs
          items={[
            { label: "Accueil", href: `/${locale}` },
            { label: "Équipes légendaires" },
          ]}
        />
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium uppercase tracking-wider mb-4">
            Sélection éditoriale
          </div>
          <h1 className="font-display font-semibold text-4xl md:text-5xl tracking-[-0.03em] mb-2">
            Équipes légendaires
            <span className="text-white/30 ml-3 font-normal text-3xl">
              par génération
            </span>
          </h1>
          <p className="text-white/50 text-sm max-w-xl leading-relaxed">
            Les franchises qui ont marqué leur époque — pas le meilleur 5
            imaginaire, mais les vraies équipes qui ont écrit l&apos;histoire de
            la NBA.
          </p>
        </div>
      </FadeIn>

      {GENERATIONS.map((era, eraIdx) => (
        <FadeIn key={era.id} delay={eraIdx * 0.06}>
          {/* Era header */}
          <div className="mb-8">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider mb-3 border"
              style={{
                backgroundColor: `${era.accentColor}18`,
                borderColor: `${era.accentColor}30`,
                color: era.accentColor,
              }}
            >
              {era.years}
            </div>
            <h2 className="font-display font-semibold text-2xl md:text-3xl tracking-[-0.02em] mb-2">
              {era.label}
            </h2>
            <p className="text-white/45 text-sm max-w-2xl leading-relaxed">
              {era.description}
            </p>
          </div>

          {/* Team cards */}
          <div
            className={`grid gap-5 ${
              era.teams.length === 1
                ? "grid-cols-1 max-w-md"
                : era.teams.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {era.teams.map((team) => {
              const teamInfo = teamMap.get(team.teamSlug);
              return (
                <div
                  key={team.id}
                  className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden"
                >
                  {/* Color bar */}
                  <div
                    className="h-1.5 w-full"
                    style={{
                      background: `linear-gradient(90deg, ${team.primaryColor} 0%, ${team.secondaryColor} 100%)`,
                    }}
                  />

                  <div className="p-5 space-y-4">
                    {/* Team identity */}
                    <div className="flex items-start gap-3">
                      {/* Team logo */}
                      {teamInfo && (
                        <TeamMono
                          abbr={teamInfo.abbr}
                          primaryColor={team.primaryColor}
                          secondaryColor={team.secondaryColor}
                          logoUrl={teamInfo.logoUrl}
                          size="sm"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium leading-none mb-0.5">
                              {team.name}
                            </p>
                            <h3 className="font-display font-semibold text-base leading-tight">
                              {team.nickname}
                            </h3>
                          </div>
                          <span className="shrink-0 text-[10px] font-mono text-white/35 mt-0.5">
                            {team.seasons}
                          </span>
                        </div>

                        <p
                          className="text-xs font-semibold mt-1"
                          style={{ color: era.accentColor }}
                        >
                          {team.achievement}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-white/45 leading-relaxed line-clamp-3">
                      {team.description}
                    </p>

                    {/* Divider */}
                    <div className="border-t border-white/[0.06]" />

                    {/* Player roster */}
                    <div className="space-y-3">
                      {team.players.map((player) => {
                        const photoUrl = photoMap.get(player.slug) ?? null;
                        return (
                          <Link
                            key={player.slug}
                            href={`/${locale}/joueurs/${player.slug}`}
                            className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04] transition group"
                          >
                            {/* Position */}
                            <span className="text-[9px] font-mono text-white/30 w-7 shrink-0 text-center pt-2.5">
                              {POSITION_SHORT[player.position] ??
                                player.position}
                            </span>

                            {/* Avatar */}
                            <div className="shrink-0 pt-0.5">
                              <PlayerAvatar
                                firstName={player.firstName}
                                lastName={player.lastName}
                                primaryColor={team.primaryColor}
                                secondaryColor={team.secondaryColor}
                                photoUrl={photoUrl}
                                size="sm"
                                showNum={false}
                              />
                            </div>

                            {/* Name + bio */}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white/80 group-hover:text-white/95 transition leading-tight block">
                                {player.firstName}{" "}
                                <span className="font-semibold">
                                  {player.lastName}
                                </span>
                              </span>
                              <p className="text-[11px] text-white/40 leading-relaxed mt-0.5 line-clamp-2">
                                {player.bio}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </FadeIn>
      ))}
    </div>
  );
}
