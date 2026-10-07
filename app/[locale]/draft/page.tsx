import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ALL_HISTORY_SEASONS, UPCOMING_SEASON } from "@/lib/nba";
import {
  DRAFT_2026,
  DRAFT_2026_SOURCE,
  type DraftPick2026,
} from "@/lib/draft-2026";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";
import { SeasonScope } from "@/components/layout/season-scope";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ saison?: string }>;
}): Promise<Metadata> {
  const { saison } = await params;
  // Chaque draft passée est une page à part entière : elle se déclare canonique.
  if (saison === undefined || saison === UPCOMING_SEASON || !ALL_HISTORY_SEASONS.includes(saison)) {
    return {
      title: "Draft NBA — résultats par saison | hoopstats",
      description:
        "Consultez les résultats des Drafts NBA par saison : choix, joueurs, équipes et parcours.",
      alternates: { canonical: "/fr/draft" },
    };
  }
  const year = seasonToDraftYear(saison);
  return {
    title: `Draft NBA ${year} — tous les choix | hoopstats`,
    description: `Résultats de la Draft NBA ${year} (saison ${saison}) : choix par choix, joueurs, équipes et parcours.`,
    alternates: { canonical: `/fr/draft?saison=${saison}` },
  };
}

type DraftRow = DraftPick2026 & {
  slug?: string;
};

function seasonToDraftYear(season: string): number {
  return Number.parseInt(season.split("-")[0], 10);
}

async function getDraft(season: string): Promise<DraftRow[]> {
  const draftYear = seasonToDraftYear(season);

  if (draftYear === 2026) return DRAFT_2026;

  const players = await prisma.player.findMany({
    where: { draftYear, draftPick: { not: null } },
    orderBy: { draftPick: "asc" },
    select: {
      slug: true,
      firstName: true,
      lastName: true,
      draftPick: true,
      college: true,
      seasons: {
        where: { season },
        take: 1,
        select: { team: { select: { abbr: true, city: true, name: true } } },
      },
    },
  });

  return players.map((player) => {
    const team = player.seasons[0]?.team;
    return {
      pick: player.draftPick as number,
      player: `${player.firstName} ${player.lastName}`,
      slug: player.slug,
      origin: player.college ?? undefined,
      team: team ? `${team.city} ${team.name}` : "Équipe non renseignée",
      teamAbbr: team?.abbr ?? "—",
    };
  });
}

function DraftRound({
  rows,
  start,
  end,
  locale,
  teamLabel,
}: {
  rows: DraftRow[];
  start: number;
  end: number;
  locale: string;
  teamLabel: string;
}) {
  const picks = rows.filter((row) => row.pick >= start && row.pick <= end);
  if (picks.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display font-semibold text-xl tracking-tight">
          {start === 1 ? "Premier tour" : "Deuxième tour"}
        </h2>
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/30">
          Choix {start}–{end}
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111114]">
        <div className="hidden grid-cols-[4rem_1.25fr_1fr_1fr] gap-4 border-b border-white/[0.06] px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-white/30 sm:grid">
          <span>Pick</span>
          <span>Joueur</span>
          <span>{teamLabel}</span>
          <span>Parcours</span>
        </div>
        <ol className="divide-y divide-white/[0.05]">
          {picks.map((pick) => (
            <li
              key={`${pick.pick}-${pick.player}`}
              className="grid grid-cols-[3rem_1fr] gap-x-3 gap-y-1 px-4 py-4 sm:grid-cols-[4rem_1.25fr_1fr_1fr] sm:items-center sm:gap-4 sm:px-5"
            >
              <span
                className={`font-display text-xl font-bold tabular-nums ${pick.pick <= 3 ? "text-orange-300" : "text-white/35"}`}
              >
                #{pick.pick}
              </span>
              <div className="min-w-0">
                {pick.slug ? (
                  <Link
                    href={`/${locale}/joueurs/${pick.slug}`}
                    className="font-display font-semibold text-white hover:text-orange-300"
                  >
                    {pick.player}
                  </Link>
                ) : (
                  <div className="font-display font-semibold text-white">
                    {pick.player}
                  </div>
                )}
                {pick.trade && (
                  <div className="mt-0.5 text-[11px] text-orange-300/70 sm:hidden">
                    {pick.trade}
                  </div>
                )}
              </div>
              <div className="col-start-2 text-sm text-white/55 sm:col-start-auto">
                <span className="mr-2 font-mono text-[11px] text-white/30">
                  {pick.teamAbbr}
                </span>
                <span className="hidden lg:inline">{pick.team}</span>
              </div>
              <div className="col-start-2 min-w-0 text-xs text-white/35 sm:col-start-auto">
                <div>{pick.origin ?? "—"}</div>
                {pick.trade && (
                  <div className="mt-0.5 hidden text-orange-300/70 sm:block">
                    {pick.trade}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
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
  const season = saison ?? UPCOMING_SEASON;
  const draftYear = seasonToDraftYear(season);
  const rows = await getDraft(season);
  const firstPick = rows.find((row) => row.pick === 1);

  return (
    <div className="space-y-8">
      <FadeIn>
      <SeasonScope seasons={ALL_HISTORY_SEASONS} season={season} defaultSeason={UPCOMING_SEASON} />
        <Crumbs
          items={[
            { label: "Accueil", href: `/${locale}` },
            { label: `Draft ${draftYear}` },
          ]}
        />
        <div className="mt-4 rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#111114] to-[#111114] p-6 sm:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-orange-300">
            Saison {season} · Draft NBA {draftYear}
          </div>
          <h1 className="font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
            Draft {draftYear}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">
            Utilisez le sélecteur de saison pour parcourir les différentes
            classes de Draft disponibles.
          </p>
          <div className="mt-6 flex flex-wrap gap-5">
            {firstPick && (
              <div>
                <div className="font-display text-3xl font-bold text-orange-300">
                  {firstPick.player}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                  N°1 · {firstPick.teamAbbr}
                </div>
              </div>
            )}
            <div>
              <div className="font-display text-3xl font-bold">
                {rows.length}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                joueurs répertoriés
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {rows.length > 0 ? (
        <>
          <FadeIn delay={0.08}>
            <DraftRound
              rows={rows}
              start={1}
              end={30}
              locale={locale}
              teamLabel={draftYear === 2026 ? "Équipe à la Draft" : "Équipe rookie"}
            />
          </FadeIn>
          <FadeIn delay={0.12}>
            <DraftRound
              rows={rows}
              start={31}
              end={60}
              locale={locale}
              teamLabel={draftYear === 2026 ? "Équipe à la Draft" : "Équipe rookie"}
            />
          </FadeIn>
        </>
      ) : (
        <p className="py-12 text-center text-sm font-mono text-white/40">
          Aucune donnée de Draft disponible pour la saison {season}.
        </p>
      )}

      {draftYear === 2026 && (
        <p className="text-center text-xs text-white/30">
          Source :{" "}
          <Link
            href={DRAFT_2026_SOURCE}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-orange-300"
          >
            NBA.com — résultats officiels
          </Link>
          . Les équipes indiquées sont celles ayant effectué le choix ; les
          transferts sont précisés séparément.
        </p>
      )}
    </div>
  );
}
