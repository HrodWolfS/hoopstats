import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isSeasonParam } from "@/lib/query-routes";
import { prisma } from "@/lib/prisma";
import { currentSeason, seasonsThrough } from "@/lib/nba";
import { frDecimal, signed, winPct } from "@/lib/format";
import { hasSeriesStarted, seriesWinnerTeamId } from "@/lib/playoff-series";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";
import { SourceNote } from "@/components/ui/source-note";
import { TeamMono } from "@/components/ui/team-mono";
import { teamSeasonHref } from "@/lib/team-links";
import { SeasonScope } from "@/components/layout/season-scope";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Classement NBA par conférence — hoopstats",
  description:
    "Classement NBA des conférences Est et Ouest, saison par saison : bilans, écarts, Net Rating, places de playoffs et de play-in.",
  alternates: { canonical: "/fr/classements" },
};

// ─── Zones de qualification ──────────────────────────────────────────────────

/** Premier exercice avec un play-in (places 7 à 10) : 2020-21. */
const FIRST_PLAY_IN_SEASON = "2020-21";

type Cutoff = { after: number; label: string; className: string };

/**
 * Traits de séparation sous la dernière place de chaque zone. Depuis 2020-21 :
 * 6 qualifiés directs, puis le play-in jusqu'à la 10e place. Avant : les 8
 * premiers allaient en playoffs.
 */
function cutoffsFor(season: string): Cutoff[] {
  const playoffs = { label: "Playoffs", className: "text-emerald-300/70" };
  if (season < FIRST_PLAY_IN_SEASON) return [{ after: 8, ...playoffs }];
  return [
    { after: 6, ...playoffs },
    { after: 10, label: "Play-in", className: "text-sky-300/70" },
  ];
}

function rankClass(rank: number, season: string): string {
  const direct = season < FIRST_PLAY_IN_SEASON ? 8 : 6;
  if (rank <= direct) return "text-emerald-300";
  if (season >= FIRST_PLAY_IN_SEASON && rank <= 10) return "text-sky-300";
  return "text-white/30";
}

// ─── Badge depuis les séries playoff réelles ─────────────────────────────────

type Badge = { label: string; className: string };

const BADGE_PILL =
  "inline-flex items-center px-1.5 py-px rounded-full text-[10px] font-medium border whitespace-nowrap";

/**
 * Construit une map teamId → badge à partir des PlayoffSeries de la saison.
 *
 * Pour chaque équipe, on cherche le round le plus profond où elle apparaît.
 * Le vainqueur se lit dans le décompte des victoires : `team1` est la tête de
 * série, pas la gagnante. Une série encore en cours ne désigne personne.
 *
 * Rounds : 1 = 1er tour · 2 = Demi-finale conf. · 3 = Finale conf. · 4 = Finale NBA
 */
function buildPlayoffBadges(
  series: {
    round: number;
    team1Id: string;
    team2Id: string;
    completed: boolean;
    team1Wins: number;
    team2Wins: number;
  }[],
): Map<string, Badge> {
  const depth = new Map<string, { maxRound: number; isWinner: boolean }>();

  for (const s of series) {
    if (!hasSeriesStarted(s)) continue;
    const winnerId = seriesWinnerTeamId(s);
    const update = (teamId: string, round: number, winner: boolean) => {
      const prev = depth.get(teamId);
      if (!prev || round > prev.maxRound) {
        depth.set(teamId, { maxRound: round, isWinner: winner });
      }
    };
    update(s.team1Id, s.round, winnerId === s.team1Id);
    update(s.team2Id, s.round, winnerId === s.team2Id);
  }

  const badges = new Map<string, Badge>();
  for (const [teamId, { maxRound, isWinner }] of depth) {
    let badge: Badge;
    if (maxRound === 4 && isWinner) {
      badge = { label: "Champion 🏆", className: `${BADGE_PILL} bg-amber-500/20 border-amber-500/30 text-amber-300` };
    } else if (maxRound === 4) {
      badge = { label: "Finaliste NBA", className: `${BADGE_PILL} bg-white/[0.08] border-white/20 text-white/60` };
    } else if (maxRound === 3) {
      badge = { label: "Finale Conf.", className: `${BADGE_PILL} bg-orange-500/15 border-orange-500/25 text-orange-300` };
    } else if (maxRound === 2) {
      badge = { label: "Demi-finale Conf.", className: `${BADGE_PILL} bg-emerald-500/10 border-emerald-500/20 text-emerald-400` };
    } else {
      badge = { label: "1er tour", className: `${BADGE_PILL} bg-white/[0.04] border-white/10 text-white/40` };
    }
    badges.set(teamId, badge);
  }
  return badges;
}

/** Fallback si pas de données PlayoffSeries : Play-In depuis le code ESPN. */
function fallbackBadge(playoffResult: string | null): Badge | null {
  if (!playoffResult) return null;
  const code = playoffResult.replace(/^\s*-\s*/, "").trim().toLowerCase();
  if (code === "pi") {
    return { label: "Play-in", className: `${BADGE_PILL} bg-sky-500/15 border-sky-500/25 text-sky-300` };
  }
  if (code === "o" || code === "") return null;
  return { label: "Playoffs", className: `${BADGE_PILL} bg-emerald-500/10 border-emerald-500/20 text-emerald-400` };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type StandingRow = {
  teamId: string;
  rank: number;
  abbr: string;
  teamName: string;
  teamCity: string;
  teamSlug: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  wins: number;
  losses: number;
  gamesBehind: number;
  netRating: number | null;
  playoffResult: string | null;
};

const TH = "text-[10px] uppercase tracking-wider text-white/35 font-medium py-2";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClassementPage({
  params,
}: {
  params: Promise<{ locale: string; saison?: string }>;
}) {
  const { locale, saison } = await params;
  if (saison !== undefined && !isSeasonParam(saison)) notFound();
  const liveSeason = currentSeason();
  const season = saison ?? liveSeason;

  const [teamSeasons, playoffSeries] = await Promise.all([
    prisma.teamSeason.findMany({
      where: { season },
      select: {
        wins: true,
        losses: true,
        conferenceRank: true,
        netRating: true,
        playoffResult: true,
        team: {
          select: {
            id: true,
            abbr: true,
            name: true,
            city: true,
            slug: true,
            conference: true,
            primaryColor: true,
            secondaryColor: true,
            logoUrl: true,
          },
        },
      },
    }),
    prisma.playoffSeries.findMany({
      where: { season },
      select: {
        round: true,
        team1Id: true,
        team2Id: true,
        completed: true,
        team1Wins: true,
        team2Wins: true,
      },
    }),
  ]);

  const playoffBadges = buildPlayoffBadges(playoffSeries);
  const cutoffs = cutoffsFor(season);

  function sortConference(rows: typeof teamSeasons): StandingRow[] {
    const sorted = [...rows].sort((a, b) => {
      if (a.conferenceRank != null && b.conferenceRank != null)
        return a.conferenceRank - b.conferenceRank;
      if (a.conferenceRank != null) return -1;
      if (b.conferenceRank != null) return 1;
      return b.wins - a.wins;
    });
    const leader = sorted[0];
    return sorted.map((ts, i) => ({
      teamId: ts.team.id,
      rank: ts.conferenceRank ?? i + 1,
      abbr: ts.team.abbr,
      teamName: ts.team.name,
      teamCity: ts.team.city,
      teamSlug: ts.team.slug,
      primaryColor: ts.team.primaryColor,
      secondaryColor: ts.team.secondaryColor,
      logoUrl: ts.team.logoUrl,
      wins: ts.wins,
      losses: ts.losses,
      // Écart au premier : demi-somme des victoires et défaites qui manquent.
      gamesBehind: (leader.wins - ts.wins + (ts.losses - leader.losses)) / 2,
      netRating: ts.netRating,
      playoffResult: ts.playoffResult,
    }));
  }

  const conferences = [
    { label: "Conférence Ouest", rows: sortConference(teamSeasons.filter((ts) => ts.team.conference === "West")) },
    { label: "Conférence Est", rows: sortConference(teamSeasons.filter((ts) => ts.team.conference === "East")) },
  ];
  const hasData = teamSeasons.length > 0;

  return (
    <div className="space-y-6">
      <SeasonScope seasons={seasonsThrough(liveSeason)} season={season} defaultSeason={liveSeason} />
      <FadeIn>
        <Crumbs items={[{ label: "Accueil", href: `/${locale}` }, { label: "Classement" }]} />
        <div className="mt-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400/70">
            Saison régulière {season}
          </p>
          <h1 className="font-display font-semibold text-4xl md:text-5xl tracking-[-0.03em]">
            Classement
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/40">
            Les deux conférences, du premier au quinzième.
            {season >= FIRST_PLAY_IN_SEASON
              ? " Les six premiers vont en playoffs, les places 7 à 10 passent par le play-in."
              : " Les huit premiers vont en playoffs."}
          </p>
        </div>
      </FadeIn>

      {!hasData ? (
        <FadeIn delay={0.05}>
          <p className="text-white/40 text-sm font-mono py-12 text-center">
            Aucune donnée disponible pour la saison {season}.
          </p>
        </FadeIn>
      ) : (
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {conferences.map(({ label, rows }) => (
              <section
                key={label}
                aria-label={label}
                className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden"
              >
                <h2 className="px-4 pt-4 pb-2 font-display text-lg font-semibold text-white/85">
                  {label}
                </h2>
                {rows.length === 0 ? (
                  <p className="text-white/40 text-xs px-4 pb-4">Aucune équipe.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className={`${TH} text-center w-9 pl-2`}>
                          <span className="sr-only">Rang</span>#
                        </th>
                        <th className={`${TH} text-left px-2`}>Équipe</th>
                        <th className={`${TH} text-center w-9`}>V</th>
                        <th className={`${TH} text-center w-9`}>D</th>
                        <th className={`${TH} text-center w-12 hidden sm:table-cell`}>%</th>
                        <th className={`${TH} text-center w-12`}>
                          <abbr title="Matchs de retard sur le premier" className="no-underline">Écart</abbr>
                        </th>
                        <th className={`${TH} text-center w-14 pr-3 hidden sm:table-cell`}>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => {
                        const badge = playoffBadges.get(row.teamId) ?? fallbackBadge(row.playoffResult);
                        const cutoff = cutoffs.find((c) => c.after === row.rank && index < rows.length - 1);
                        const total = row.wins + row.losses;
                        return [
                          <tr
                            key={row.teamSlug}
                            className="border-t border-white/[0.04] first:border-t-0 transition-colors hover:bg-white/[0.03]"
                          >
                            <td className={`pl-2 py-2 text-center text-xs font-mono tabular-nums ${rankClass(row.rank, season)}`}>
                              {row.rank}
                            </td>
                            <td className="px-2 py-2 min-w-0">
                              <Link
                                href={teamSeasonHref(locale, row.teamSlug, season, liveSeason)}
                                className="group flex items-center gap-2.5 min-w-0"
                              >
                                <TeamMono
                                  abbr={row.abbr}
                                  primaryColor={row.primaryColor}
                                  secondaryColor={row.secondaryColor}
                                  logoUrl={row.logoUrl}
                                  size="xs"
                                  className="shrink-0"
                                />
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-white/85 group-hover:text-white transition">
                                    <span className="hidden sm:inline">{row.teamCity} </span>
                                    {row.teamName}
                                  </span>
                                  {badge && (
                                    <span className="mt-0.5 flex">
                                      <span className={badge.className}>{badge.label}</span>
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </td>
                            <td className="py-2 text-center tabular-nums text-white/85 font-medium">{row.wins}</td>
                            <td className="py-2 text-center tabular-nums text-white/55">{row.losses}</td>
                            <td className="py-2 text-center tabular-nums text-white/45 text-xs hidden sm:table-cell">
                              {total === 0 ? "—" : winPct(row.wins, row.losses)}
                            </td>
                            <td className="py-2 text-center tabular-nums text-white/45 text-xs">
                              {row.gamesBehind <= 0 ? "—" : frDecimal(row.gamesBehind.toFixed(row.gamesBehind % 1 ? 1 : 0))}
                            </td>
                            <td
                              className={`py-2 pr-3 text-center tabular-nums text-xs hidden sm:table-cell ${
                                row.netRating == null
                                  ? "text-white/30"
                                  : row.netRating >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                              }`}
                            >
                              {signed(row.netRating)}
                            </td>
                          </tr>,
                          cutoff && (
                            <tr key={`${row.teamSlug}-cutoff`} aria-hidden>
                              <td colSpan={7} className="p-0">
                                <div className={`flex items-center gap-2 px-3 ${cutoff.className}`}>
                                  <span className="h-0 flex-1 border-t border-dashed border-current" />
                                  <span className="py-0.5 text-[9px] font-mono uppercase tracking-[0.18em]">
                                    ↑ {cutoff.label}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ),
                        ];
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            ))}
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/35">
            <span><span className="text-emerald-300">●</span> Qualifiés pour les playoffs</span>
            {season >= FIRST_PLAY_IN_SEASON && (
              <span><span className="text-sky-300">●</span> Play-in</span>
            )}
            <span>Écart : matchs de retard sur le premier</span>
          </p>
        </FadeIn>
      )}
      <SourceNote origins={["standings", "playoffs"]} locale={locale} />
    </div>
  );
}
