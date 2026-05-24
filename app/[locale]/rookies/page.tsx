import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON, CURRENT_DRAFT_YEAR, ALL_SEASONS } from "@/lib/nba";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";
import {
  SortablePlayerTable,
  type SortableRow,
} from "@/components/ui/sortable-player-table";

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
  const draftYear = parseInt(season.split("-")[0]);

  const rows = await prisma.playerSeason.findMany({
    where: { season, player: { draftYear } },
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

  const tableRows: SortableRow[] = rows.map((r) => ({
    id: r.id,
    playerSlug: r.player.slug,
    firstName: r.player.firstName,
    lastName: r.player.lastName,
    position: r.player.position,
    photoUrl: r.player.photoUrl,
    college: r.player.college,
    teamAbbr: r.team.abbr,
    teamSlug: r.team.slug,
    primaryColor: r.team.primaryColor,
    secondaryColor: r.team.secondaryColor,
    draftPick: r.player.draftPick,
    gamesPlayed: r.gamesPlayed,
    pointsPerGame: r.pointsPerGame,
    reboundsPerGame: r.reboundsPerGame,
    assistsPerGame: r.assistsPerGame,
    trueShooting: r.trueShooting,
  }));

  const COLUMNS = [
    { key: "pick" as const, label: "Pick", show: "sm" as const },
    { key: "gamesPlayed" as const, label: "MJ" },
    { key: "pointsPerGame" as const, label: "PTS" },
    { key: "reboundsPerGame" as const, label: "REB" },
    { key: "assistsPerGame" as const, label: "PAS" },
    { key: "trueShooting" as const, label: "TS%", show: "sm" as const },
  ];

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
          <SortablePlayerTable
            rows={tableRows}
            columns={COLUMNS}
            defaultSort="pick"
            defaultDir="asc"
            locale={locale}
            showCollege
            footerNote={`Classe ${CURRENT_DRAFT_YEAR} · Cliquer sur une colonne pour trier`}
          />
        </FadeIn>
      )}
    </div>
  );
}
