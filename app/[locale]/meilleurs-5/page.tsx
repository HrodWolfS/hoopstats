import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GENERATIONS } from "@/lib/best-fives";
import { PlayerAvatar } from "@/components/ui/player-avatar";
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

  // Fetch photoUrl for every player slug in one DB call
  const allSlugs = GENERATIONS.flatMap((era) =>
    era.teams.flatMap((team) => team.players.map((p) => p.slug)),
  );

  const playerRows = await prisma.player.findMany({
    where: { slug: { in: allSlugs } },
    select: { slug: true, photoUrl: true },
  });

  const photoMap = new Map<string, string | null>(
    playerRows.map((r) => [r.slug, r.photoUrl]),
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
                ? "grid-cols-1 max-w-sm"
                : era.teams.length === 2
                  ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {era.teams.map((team) => (
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
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
                          {team.name}
                        </p>
                        <h3 className="font-display font-semibold text-lg leading-tight">
                          {team.nickname}
                        </h3>
                      </div>
                      <div
                        className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border mt-0.5"
                        style={{
                          backgroundColor: `${team.primaryColor}20`,
                          borderColor: `${team.primaryColor}35`,
                          color: team.primaryColor,
                          filter: "brightness(1.5) saturate(0.9)",
                        }}
                      >
                        {team.seasons}
                      </div>
                    </div>

                    <p
                      className="text-xs font-semibold"
                      style={{ color: era.accentColor }}
                    >
                      {team.achievement}
                    </p>

                    <p className="text-[11px] text-white/45 leading-relaxed mt-2 line-clamp-3">
                      {team.description}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/[0.06]" />

                  {/* Player roster */}
                  <div className="space-y-2">
                    {team.players.map((player) => {
                      const photoUrl = photoMap.get(player.slug) ?? null;
                      return (
                        <Link
                          key={player.slug}
                          href={`/${locale}/joueurs/${player.slug}`}
                          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.04] transition group"
                        >
                          {/* Position badge */}
                          <span className="text-[9px] font-mono text-white/30 w-7 shrink-0 text-center">
                            {POSITION_SHORT[player.position] ?? player.position}
                          </span>

                          <PlayerAvatar
                            firstName={player.firstName}
                            lastName={player.lastName}
                            primaryColor={team.primaryColor}
                            secondaryColor={team.secondaryColor}
                            photoUrl={photoUrl}
                            size="xs"
                            showNum={false}
                          />

                          <span className="text-sm text-white/75 group-hover:text-white/95 transition truncate">
                            {player.firstName}{" "}
                            <span className="font-semibold">
                              {player.lastName}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      ))}
    </div>
  );
}
