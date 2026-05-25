import { type Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON, CURRENT_DRAFT_YEAR } from "@/lib/nba";
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

  // Requête depuis Player pour inclure tous les draftés même sans stats
  const players = await prisma.player.findMany({
    where: { draftYear },
    include: {
      seasons: {
        where: { season },
        include: {
          team: {
            select: {
              abbr: true,
              slug: true,
              primaryColor: true,
              secondaryColor: true,
            },
          },
        },
      },
    },
    orderBy: { draftPick: "asc" },
  });

  const FALLBACK_TEAM = {
    abbr: "—",
    slug: "",
    primaryColor: "#666666",
    secondaryColor: "#444444",
  };

  const tableRows: SortableRow[] = players.map((p) => {
    const ps = p.seasons[0] ?? null;
    const team = ps?.team ?? FALLBACK_TEAM;
    return {
      id: p.id,
      playerSlug: p.slug,
      firstName: p.firstName,
      lastName: p.lastName,
      position: p.position,
      photoUrl: p.photoUrl,
      college: p.college,
      teamAbbr: team.abbr,
      teamSlug: team.slug,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      draftPick: p.draftPick,
      gamesPlayed: ps?.gamesPlayed ?? 0,
      pointsPerGame: ps?.pointsPerGame ?? 0,
      reboundsPerGame: ps?.reboundsPerGame ?? 0,
      assistsPerGame: ps?.assistsPerGame ?? 0,
      trueShooting: ps?.trueShooting ?? null,
    };
  });

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
            {tableRows.length} joueur{tableRows.length !== 1 ? "s" : ""} en
            première saison NBA
          </p>
        </div>
      </FadeIn>

      {tableRows.length === 0 ? (
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
