import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ALL_HISTORY_SEASONS, currentSeason, draftYearOf, UPCOMING_SEASON } from "@/lib/nba";
import { DRAFT_2026, DRAFT_2026_SOURCE, type DraftPick2026 } from "@/lib/draft-2026";
import { MULTI_TEAM_ABBR } from "@/lib/stats/season-consolidation";
import { consolidateSeasonRows } from "@/lib/stats/season-totals";
import { foldName } from "@/lib/stats/player-query";
import { getPlayerMetric } from "@/lib/stats/metrics";
import { playerStatsOrigin } from "@/lib/data-sources";
import { tableUpdatedAt } from "@/lib/data-updates";
import { csvFilename, isExportable } from "@/lib/export";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";
import { SeasonScope } from "@/components/layout/season-scope";
import { ShareButton } from "@/components/analytics/share-button";
import {
  SortablePlayerTable,
  type SortableRow,
} from "@/components/ui/sortable-player-table";

export const revalidate = 21600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ saison?: string }>;
}): Promise<Metadata> {
  const { saison } = await params;
  // Chaque draft passée est une page à part entière : elle se déclare canonique.
  if (saison === undefined || saison === UPCOMING_SEASON || !ALL_HISTORY_SEASONS.includes(saison)) {
    return {
      title: "Draft et rookies NBA — hoopstats",
      description:
        "Chaque classe de draft NBA, choix par choix, avec les statistiques de ses joueurs dans leur saison de rookie.",
      alternates: { canonical: "/fr/draft" },
    };
  }
  const year = draftYearOf(saison);
  return {
    title: `Draft NBA ${year} et rookies ${saison} | hoopstats`,
    description: `La Draft NBA ${year} choix par choix et les statistiques de ses rookies en ${saison}.`,
    alternates: { canonical: `/fr/draft?saison=${saison}` },
  };
}

const FALLBACK_TEAM = {
  abbr: "—",
  slug: "",
  primaryColor: "#666666",
  secondaryColor: "#444444",
};

/** Liste officielle connue sans passer par la base (la draft 2026 avant ses premiers matchs). */
function staticPicks(draftYear: number): DraftPick2026[] {
  return draftYear === 2026 ? DRAFT_2026 : [];
}

/**
 * Classe affichée sans paramètre : la dernière draft, dès qu'on en connaît les
 * choix (en base ou dans la liste officielle) ; sinon la classe précédente.
 */
async function defaultDraftSeason(): Promise<string> {
  for (const season of [UPCOMING_SEASON, currentSeason()]) {
    const draftYear = draftYearOf(season);
    if (staticPicks(draftYear).length > 0) return season;
    if ((await prisma.player.count({ where: { draftYear } })) > 0) return season;
  }
  return ALL_HISTORY_SEASONS[ALL_HISTORY_SEASONS.indexOf(currentSeason()) + 1] ?? currentSeason();
}

async function getDraftClass(season: string): Promise<SortableRow[]> {
  // Depuis Player : tous les draftés, même ceux qui n'ont pas encore joué.
  const players = await prisma.player.findMany({
    where: { draftYear: draftYearOf(season) },
    include: {
      seasons: {
        where: { season },
        include: {
          team: {
            select: { abbr: true, slug: true, primaryColor: true, secondaryColor: true },
          },
        },
      },
    },
    orderBy: { draftPick: "asc" },
  });

  // Un rookie transféré en cours de saison : une seule ligne, saison entière.
  const rookieSeasons = new Map(
    (await consolidateSeasonRows(season, players.flatMap((p) => p.seasons))).map(
      (row) => [row.playerId, row],
    ),
  );

  return players.map((p) => {
    const ps = rookieSeasons.get(p.id) ?? null;
    const team = ps?.team ?? FALLBACK_TEAM;
    return {
      id: p.id,
      playerSlug: p.slug,
      firstName: p.firstName,
      lastName: p.lastName,
      position: p.position,
      photoUrl: p.photoUrl,
      college: p.college,
      teamAbbr: ps?.isMultiTeam ? MULTI_TEAM_ABBR : team.abbr,
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
}

const COLUMNS = [
  { key: "pick" as const, label: "Pick" },
  { key: "gamesPlayed" as const, label: getPlayerMetric("gamesPlayed").shortLabel },
  { key: "pointsPerGame" as const, label: getPlayerMetric("pointsPerGame").shortLabel },
  { key: "reboundsPerGame" as const, label: getPlayerMetric("reboundsPerGame").shortLabel },
  { key: "assistsPerGame" as const, label: getPlayerMetric("assistsPerGame").shortLabel, show: "sm" as const },
  { key: "trueShooting" as const, label: getPlayerMetric("trueShooting").shortLabel, show: "sm" as const },
];

/** Choix de la liste officielle absents de la base : pas encore de fiche NBA. */
function PendingPicks({ picks }: { picks: DraftPick2026[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display font-semibold text-xl tracking-tight">
          Pas encore en NBA
        </h2>
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/30">
          {picks.length} choix
        </span>
      </div>
      <p className="text-xs text-white/35">
        Draftés mais sans match NBA cette saison (G League, Europe, université ou non signés).
      </p>
      <ol className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111114]">
        {picks.map((pick) => (
          <li
            key={pick.pick}
            className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-3 px-4 py-3 sm:px-5"
          >
            <span className="font-display font-bold tabular-nums text-white/35">#{pick.pick}</span>
            <div className="min-w-0">
              <div className="font-display font-semibold text-white/80 truncate">{pick.player}</div>
              <div className="text-[11px] text-white/35 truncate">
                {pick.origin ?? "—"}
                {pick.trade && <span className="text-orange-300/70"> · {pick.trade}</span>}
              </div>
            </div>
            <span className="font-mono text-[11px] text-white/40">{pick.teamAbbr}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function DraftPage({
  params,
}: {
  params: Promise<{ locale: string; saison?: string }>;
}) {
  const { locale, saison } = await params;
  if (saison !== undefined && !ALL_HISTORY_SEASONS.includes(saison)) notFound();
  const defaultSeason = await defaultDraftSeason();
  const season = saison ?? defaultSeason;
  const draftYear = draftYearOf(season);
  const rows = await getDraftClass(season);

  // Un choix est connu par son numéro, ou par son nom (apostrophes droites ou typographiques).
  const fold = (name: string) => foldName(name).replace(/[’']/g, "");
  const knownPicks = new Set(rows.map((row) => row.draftPick));
  const knownNames = new Set(rows.map((row) => fold(`${row.firstName} ${row.lastName}`)));
  const pending = staticPicks(draftYear).filter(
    (pick) => !knownPicks.has(pick.pick) && !knownNames.has(fold(pick.player)),
  );
  const firstPick =
    rows.find((row) => row.draftPick === 1) ?? staticPicks(draftYear).find((pick) => pick.pick === 1);
  const firstPickName = firstPick
    ? "player" in firstPick ? firstPick.player : `${firstPick.firstName} ${firstPick.lastName}`
    : null;
  const played = rows.filter((row) => row.gamesPlayed > 0).length;

  const origin = playerStatsOrigin(season);
  const csv = isExportable([origin])
    ? {
        title: `Draft NBA ${draftYear} · rookies ${season} · saison régulière, par match`,
        filename: csvFilename(["draft", season]),
        dimension: "draft",
        updatedAt: await tableUpdatedAt([origin]),
      }
    : undefined;

  return (
    <div className="space-y-8">
      <SeasonScope seasons={ALL_HISTORY_SEASONS} season={season} defaultSeason={defaultSeason} />
      <FadeIn>
        <div className="flex items-center justify-between gap-3">
          <Crumbs
            items={[
              { label: "Accueil", href: `/${locale}` },
              { label: `Draft ${draftYear}` },
            ]}
          />
          <ShareButton dimension="draft" />
        </div>
        <div className="mt-4 rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#111114] to-[#111114] p-6 sm:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-orange-300">
            Classe {draftYear} · rookies {season}
          </div>
          <h1 className="font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
            Draft {draftYear}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">
            Les choix de la draft et ce qu&apos;ils donnent dans leur saison de
            rookie. Triez par colonne ; le sélecteur de saison change de classe.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
            {firstPickName && (
              <div>
                <div className="font-display text-3xl font-bold text-orange-300">{firstPickName}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                  Choix n°1
                </div>
              </div>
            )}
            <div>
              <div className="font-display text-3xl font-bold">{rows.length + pending.length}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                joueurs de la classe
              </div>
            </div>
            <div>
              <div className="font-display text-3xl font-bold">{played}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                ont joué en {season}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {rows.length > 0 && (
        <FadeIn delay={0.08}>
          <SortablePlayerTable
            rows={rows}
            columns={COLUMNS}
            defaultSort="pick"
            defaultDir="asc"
            locale={locale}
            season={season}
            liveSeason={currentSeason()}
            showCollege
            csv={csv}
            footerNote={`Classe ${draftYear} · statistiques de la saison ${season} · cliquer sur une colonne pour trier`}
          />
        </FadeIn>
      )}

      {pending.length > 0 && (
        <FadeIn delay={0.12}>
          <PendingPicks picks={pending} />
        </FadeIn>
      )}

      {rows.length === 0 && pending.length === 0 && (
        <p className="py-12 text-center text-sm font-mono text-white/40">
          Aucune donnée de draft disponible pour la saison {season}.
        </p>
      )}

      {staticPicks(draftYear).length > 0 && (
        <p className="text-center text-xs text-white/30">
          Liste des choix :{" "}
          <Link
            href={DRAFT_2026_SOURCE}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-orange-300"
          >
            NBA.com — résultats officiels
          </Link>
          . Équipe affichée : celle qui a drafté ; les transferts sont précisés.
        </p>
      )}
    </div>
  );
}
