import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BEST_FIVES } from "@/lib/best-fives";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Meilleurs 5 par génération — hoopstats",
  description:
    "Les cinq meilleurs joueurs de chaque grande ère NBA : Pionniers, Showtime, Jordan, Kobe/Shaq, Moderne.",
};

const POSITION_LABEL: Record<string, string> = {
  PG: "Meneur",
  SG: "Arrière",
  SF: "Ailier",
  PF: "Ailier fort",
  C: "Pivot",
};

export default async function MeilleursCinqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Fetch photoUrl for all 25 slugs in one DB call
  const allSlugs = BEST_FIVES.flatMap((era) => era.players.map((p) => p.slug));

  const playerRows = await prisma.player.findMany({
    where: { slug: { in: allSlugs } },
    select: { slug: true, photoUrl: true },
  });

  const photoMap = new Map<string, string | null>(
    playerRows.map((r) => [r.slug, r.photoUrl]),
  );

  return (
    <div className="space-y-16">
      <FadeIn>
        <Crumbs
          items={[
            { label: "Accueil", href: `/${locale}` },
            { label: "Meilleurs 5" },
          ]}
        />
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium uppercase tracking-wider mb-4">
            Sélection éditoriale
          </div>
          <h1 className="font-display font-semibold text-4xl md:text-5xl tracking-[-0.03em] mb-2">
            Meilleurs 5
            <span className="text-white/30 ml-3 font-normal text-3xl">
              par génération
            </span>
          </h1>
          <p className="text-white/50 text-sm max-w-xl leading-relaxed">
            Cinq grandes ères de la NBA. Cinq postes par époque. Les joueurs qui
            ont défini leur génération.
          </p>
        </div>
      </FadeIn>

      {BEST_FIVES.map((era, eraIdx) => (
        <FadeIn key={era.id} delay={eraIdx * 0.07}>
          {/* Era header */}
          <div className="mb-6">
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
            <h2 className="font-display font-semibold text-2xl md:text-3xl tracking-[-0.02em] mb-1">
              {era.label}
            </h2>
            <p className="text-white/45 text-sm max-w-2xl leading-relaxed">
              {era.description}
            </p>
          </div>

          {/* Players grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {era.players.map((player) => {
              const photoUrl = photoMap.get(player.slug) ?? null;
              return (
                <Link
                  key={player.slug}
                  href={`/${locale}/joueurs/${player.slug}`}
                  className="group rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden hover:border-white/[0.12] hover:bg-[#16161A] transition-all duration-200"
                >
                  {/* Colored top accent */}
                  <div
                    className="h-1 w-full"
                    style={{ backgroundColor: era.accentColor, opacity: 0.7 }}
                  />

                  <div className="p-4 flex flex-col gap-3">
                    {/* Position badge + avatar row */}
                    <div className="flex items-center gap-3">
                      <PlayerAvatar
                        firstName={player.firstName}
                        lastName={player.lastName}
                        primaryColor={player.primaryColor}
                        secondaryColor={player.secondaryColor}
                        photoUrl={photoUrl}
                        size="md"
                        showNum={false}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
                          style={{ color: era.accentColor, opacity: 0.85 }}
                        >
                          {POSITION_LABEL[player.position] ?? player.position}
                        </div>
                        <div className="text-sm font-semibold text-white leading-tight truncate group-hover:text-white/90 transition">
                          {player.firstName}
                        </div>
                        <div className="text-sm font-semibold text-white leading-tight truncate group-hover:text-white/90 transition">
                          {player.lastName}
                        </div>
                      </div>
                    </div>

                    {/* Team */}
                    <div className="text-[11px] text-white/35 truncate">
                      {player.team}
                    </div>

                    {/* Rationale */}
                    <p className="text-[11px] text-white/50 leading-relaxed line-clamp-4">
                      {player.rationale}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </FadeIn>
      ))}
    </div>
  );
}
