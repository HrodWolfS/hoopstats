import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON, CURRENT_DRAFT_YEAR, ALL_SEASONS } from "@/lib/nba";
import { stat } from "@/lib/format";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata: Metadata = {
  title: "Rookies NBA 2025-26 — hoopstats",
  description:
    "Découvrez les rookies de la saison NBA 2025-26 : stats, draft et premières performances en carrière.",
};

export const revalidate = 21600;

export default async function RookiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const { locale } = await params;
  const { saison } = await searchParams;
  const season = saison ?? CURRENT_SEASON;

  // Année de draft = première année de la saison sélectionnée
  const draftYear = parseInt(season.split("-")[0]);

  const rows = await prisma.playerSeason.findMany({
    where: {
      season,
      player: { draftYear },
    },
    orderBy: { pointsPerGame: "desc" },
    include: {
      player: {
        select: {
          firstName: true,
          lastName: true,
          slug: true,
          position: true,
          photoUrl: true,
          draftYear: true,
          draftPick: true,
          college: true,
        },
      },
      team: {
        select: {
          abbr: true,
          slug: true,
          primaryColor: true,
          secondaryColor: true,
        },
      },
    },
  });

  const isCurrentSeason = season === CURRENT_SEASON;

  return (
    <div className="space-y-6">
      <FadeIn>
        <Crumbs
          items={[
            { label: "Accueil", href: `/${locale}` },
            { label: "Rookies" },
          ]}
        />
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium uppercase tracking-wider mb-4">
            Classe {draftYear}
          </div>
          <h1 className="font-display font-semibold text-4xl md:text-5xl tracking-[-0.03em] mb-2">
            Rookies
            <span className="text-white/30 ml-3 font-normal text-3xl">
              {season}
            </span>
          </h1>
          <p className="text-white/40 text-sm">
            {rows.length} joueur{rows.length !== 1 ? "s" : ""} en première
            saison NBA
          </p>
        </div>
      </FadeIn>

      {/* Sélecteur de saison */}
      <FadeIn delay={0.05}>
        <div className="flex flex-wrap gap-2">
          {ALL_SEASONS.map((s) => (
            <Link
              key={s}
              href={`/${locale}/rookies?saison=${s}`}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                s === season
                  ? "bg-violet-600 text-white"
                  : "bg-white/[0.04] text-white/40 hover:bg-white/[0.07] hover:text-white/70"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </FadeIn>

      {rows.length === 0 ? (
        <p className="text-white/40 text-sm font-mono py-12 text-center">
          Aucun rookie trouvé pour la saison {season}.
        </p>
      ) : (
        <FadeIn delay={0.1}>
          <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                    <th className="text-left px-5 py-3 font-medium w-10">#</th>
                    <th className="text-left px-3 py-3 font-medium">Joueur</th>
                    <th className="text-left px-3 py-3 font-medium">Équipe</th>
                    <th className="text-right px-3 py-3 font-medium hidden sm:table-cell">
                      Pick
                    </th>
                    <th className="text-right px-3 py-3 font-medium">MJ</th>
                    <th className="text-right px-3 py-3 font-medium">PTS</th>
                    <th className="text-right px-3 py-3 font-medium">REB</th>
                    <th className="text-right px-5 py-3 font-medium">PAS</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition group"
                    >
                      <td className="px-5 py-2.5 text-white/30 text-xs">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/${locale}/joueurs/${row.player.slug}`}
                          className="flex items-center gap-3"
                        >
                          <PlayerAvatar
                            firstName={row.player.firstName}
                            lastName={row.player.lastName}
                            primaryColor={row.team.primaryColor}
                            secondaryColor={row.team.secondaryColor}
                            photoUrl={row.player.photoUrl}
                            size="sm"
                            showNum={false}
                          />
                          <div>
                            <div className="text-sm font-sans font-medium text-white leading-tight group-hover:text-violet-300 transition">
                              {row.player.firstName} {row.player.lastName}
                            </div>
                            <div className="text-[11px] text-white/40 font-sans">
                              {row.player.position ?? "—"}
                              {row.player.college
                                ? ` · ${row.player.college}`
                                : ""}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/${locale}/equipes/${row.team.slug}`}
                          className="text-xs text-white/50 hover:text-white/90 transition font-sans"
                        >
                          {row.team.abbr}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right text-white/40 hidden sm:table-cell">
                        {row.player.draftPick
                          ? `#${row.player.draftPick}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right text-white/50">
                        {row.gamesPlayed}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-white">
                        {stat(row.pointsPerGame)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {stat(row.reboundsPerGame)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {stat(row.assistsPerGame)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isCurrentSeason && (
            <p className="text-[11px] text-white/20 font-mono mt-3 px-1">
              Classe {CURRENT_DRAFT_YEAR} · Saison rookie en cours · Trié par
              points par match
            </p>
          )}
        </FadeIn>
      )}
    </div>
  );
}
