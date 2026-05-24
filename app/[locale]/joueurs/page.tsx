import { Suspense } from "react";
import { type Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";
import { PlayerSearchInput } from "@/components/ui/player-search-input";
import { FadeIn } from "@/components/ui/fade-in";
import {
  SortablePlayerTable,
  type SortableRow,
} from "@/components/ui/sortable-player-table";

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
  searchParams: Promise<{ saison?: string; q?: string }>;
}) {
  const { locale } = await params;
  const { saison, q } = await searchParams;
  const season = saison ?? CURRENT_SEASON;
  const query = q?.trim() ?? "";

  const where = query
    ? {
        season,
        player: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" as const } },
            { lastName: { contains: query, mode: "insensitive" as const } },
          ],
        },
      }
    : { season, gamesPlayed: { gte: 10 } };

  const rows = await prisma.playerSeason.findMany({
    where,
    orderBy: { pointsPerGame: "desc" },
    take: query ? 50 : 100,
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

  const tableRows: SortableRow[] = rows.map((r) => ({
    id: r.id,
    playerSlug: r.player.slug,
    firstName: r.player.firstName,
    lastName: r.player.lastName,
    position: r.player.position,
    photoUrl: r.player.photoUrl,
    teamAbbr: r.team.abbr,
    teamSlug: r.team.slug,
    primaryColor: r.team.primaryColor,
    secondaryColor: r.team.secondaryColor,
    gamesPlayed: r.gamesPlayed,
    pointsPerGame: r.pointsPerGame,
    reboundsPerGame: r.reboundsPerGame,
    assistsPerGame: r.assistsPerGame,
    trueShooting: r.trueShooting,
  }));

  const subtitle = query
    ? `${rows.length} résultat${rows.length !== 1 ? "s" : ""} pour « ${query} » — Saison ${season}`
    : `Top 100 scoreurs — Saison ${season}`;

  const COLUMNS = [
    { key: "gamesPlayed" as const, label: "MJ" },
    { key: "pointsPerGame" as const, label: "PTS" },
    { key: "reboundsPerGame" as const, label: "REB" },
    { key: "assistsPerGame" as const, label: "PAS" },
    { key: "trueShooting" as const, label: "TS%", show: "sm" as const },
  ];

  return (
    <div className="space-y-6">
      <FadeIn>
        <div>
          <h1 className="font-display font-semibold text-4xl tracking-tight mb-1">
            Joueurs NBA
          </h1>
          <p className="text-white/40 text-sm">{subtitle}</p>
        </div>
      </FadeIn>

      <Suspense
        fallback={
          <div className="h-10 rounded-xl bg-white/[0.03] animate-pulse" />
        }
      >
        <PlayerSearchInput />
      </Suspense>

      {rows.length === 0 ? (
        <p className="text-white/40 text-sm font-mono py-12 text-center">
          Aucun joueur trouvé pour « {query} » en {season}.
        </p>
      ) : (
        <FadeIn delay={0.05}>
          <SortablePlayerTable
            rows={tableRows}
            columns={COLUMNS}
            defaultSort="pointsPerGame"
            defaultDir="desc"
            locale={locale}
            footerNote="Cliquer sur une colonne pour trier · Min. 10 matchs joués"
          />
        </FadeIn>
      )}
    </div>
  );
}
