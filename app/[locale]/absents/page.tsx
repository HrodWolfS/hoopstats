import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON, PREV_SEASON } from "@/lib/nba";
import { stat } from "@/lib/format";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata: Metadata = {
  title: "Absents cette saison — hoopstats",
  description: `Joueurs NBA présents en ${PREV_SEASON} mais absents de la saison ${CURRENT_SEASON} : retraités, blessés ou agents libres non signés.`,
};

export const revalidate = 21600;

export default async function AbsentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // IDs présents en saison précédente
  const prevSeasonIds = await prisma.playerSeason.findMany({
    where: { season: PREV_SEASON },
    select: { playerId: true },
  });

  // IDs présents cette saison
  const currSeasonIds = await prisma.playerSeason.findMany({
    where: { season: CURRENT_SEASON },
    select: { playerId: true },
  });

  const currSet = new Set(currSeasonIds.map((r) => r.playerId));
  const absentIds = prevSeasonIds
    .map((r) => r.playerId)
    .filter((id) => !currSet.has(id));

  // Récupérer les stats de leur dernière saison + infos joueur
  const rows = await prisma.playerSeason.findMany({
    where: {
      season: PREV_SEASON,
      playerId: { in: absentIds },
      gamesPlayed: { gte: 5 }, // Filtrer les apparitions anecdotiques
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
          birthDate: true,
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

  const now = rows.length > 0 ? new Date().getTime() : 0;

  function getAge(birthDate: Date | null): string {
    if (!birthDate) return "—";
    const age = Math.floor(
      (now - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
    );
    return String(age);
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <Crumbs
          items={[
            { label: "Accueil", href: `/${locale}` },
            { label: "Absents cette saison" },
          ]}
        />
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/50 text-[11px] font-medium uppercase tracking-wider mb-4">
            Dernière saison : {PREV_SEASON}
          </div>
          <h1 className="font-display font-semibold text-4xl md:text-5xl tracking-[-0.03em] mb-2">
            Absents
            <span className="text-white/30 ml-3 font-normal text-3xl">
              {CURRENT_SEASON}
            </span>
          </h1>
          <p className="text-white/40 text-sm max-w-lg leading-relaxed">
            {rows.length} joueurs actifs en {PREV_SEASON} mais absents cette
            saison — retraités, blessés longue durée ou agents libres non
            signés.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                  <th className="text-left px-5 py-3 font-medium w-10">#</th>
                  <th className="text-left px-3 py-3 font-medium">Joueur</th>
                  <th className="text-left px-3 py-3 font-medium">
                    Dernière équipe
                  </th>
                  <th className="text-right px-3 py-3 font-medium hidden sm:table-cell">
                    Âge
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
                          <div className="text-sm font-sans font-medium text-white/80 leading-tight group-hover:text-violet-300 transition">
                            {row.player.firstName} {row.player.lastName}
                          </div>
                          <div className="text-[11px] text-white/30 font-sans">
                            {row.player.position ?? "—"}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/${locale}/equipes/${row.team.slug}`}
                        className="text-xs text-white/40 hover:text-white/70 transition font-sans"
                      >
                        {row.team.abbr}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/30 hidden sm:table-cell">
                      {getAge(row.player.birthDate)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/40">
                      {row.gamesPlayed}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/70">
                      {stat(row.pointsPerGame)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/50">
                      {stat(row.reboundsPerGame)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-white/50">
                      {stat(row.assistsPerGame)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[11px] text-white/20 font-mono mt-3 px-1">
          Stats de la saison {PREV_SEASON} · Min. 5 matchs joués · Trié par
          points par match
        </p>
      </FadeIn>
    </div>
  );
}
