import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";
import { stat } from "@/lib/format";
import { PlayerAvatar } from "@/components/ui/player-avatar";

export const metadata: Metadata = {
  title: "Joueurs NBA — hoopstats",
  description: "Stats, carrière et historique des joueurs NBA. Saison 2025-26.",
};

export const revalidate = 21600;

export default async function PlayersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const { locale } = await params;
  const { saison } = await searchParams;
  const season = saison ?? CURRENT_SEASON;

  // Top 100 scoreurs de la saison sélectionnée
  const rows = await prisma.playerSeason.findMany({
    where: { season, gamesPlayed: { gte: 10 } },
    orderBy: { pointsPerGame: "desc" },
    take: 100,
    include: {
      player: {
        select: {
          firstName: true,
          lastName: true,
          slug: true,
          position: true,
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-semibold text-4xl tracking-tight mb-1">
          Joueurs NBA
        </h1>
        <p className="text-white/40 text-sm">
          Top 100 scoreurs — Saison {season}
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                <th className="text-left px-5 py-3 font-medium w-10">#</th>
                <th className="text-left px-3 py-3 font-medium">Joueur</th>
                <th className="text-left px-3 py-3 font-medium">Équipe</th>
                <th className="text-right px-3 py-3 font-medium">MJ</th>
                <th className="text-right px-3 py-3 font-medium">PTS</th>
                <th className="text-right px-3 py-3 font-medium">REB</th>
                <th className="text-right px-3 py-3 font-medium">PAS</th>
                <th className="text-right px-5 py-3 font-medium">TS%</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition group"
                >
                  <td className="px-5 py-2.5 text-white/30 text-xs">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/${locale}/joueurs/${row.player.slug}`}
                      className="flex items-center gap-3 group-hover:text-white transition"
                    >
                      <PlayerAvatar
                        firstName={row.player.firstName}
                        lastName={row.player.lastName}
                        primaryColor={row.team.primaryColor}
                        secondaryColor={row.team.secondaryColor}
                        size="sm"
                        showNum={false}
                      />
                      <div>
                        <div className="text-sm font-sans font-medium text-white leading-tight">
                          {row.player.firstName}{" "}
                          <span className="text-white/90">
                            {row.player.lastName}
                          </span>
                        </div>
                        <div className="text-[11px] text-white/40 font-sans">
                          {row.player.position ?? "—"}
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
                  <td className="px-3 py-2.5 text-right text-white/50">
                    {row.gamesPlayed}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-white">
                    {stat(row.pointsPerGame)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {stat(row.reboundsPerGame)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {stat(row.assistsPerGame)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-white/60">
                    {row.trueShooting != null
                      ? `${(row.trueShooting * 100).toFixed(1)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
