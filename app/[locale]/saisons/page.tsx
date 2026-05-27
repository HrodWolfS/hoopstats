import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";
import { stat } from "@/lib/format";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Saisons NBA — hoopstats",
  description:
    "Classements NBA par saison : conférences Est et Ouest, stats avancées et leaders statistiques.",
};

// ─── Badge depuis les séries playoff réelles ─────────────────────────────────

type Badge = { label: string; className: string };

const BADGE_PILL =
  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border";

/**
 * Construit une map teamId → badge à partir des PlayoffSeries de la saison.
 *
 * Pour chaque équipe, on cherche le round le plus profond où elle apparaît.
 * team1 = gagnant de la série, team2 = perdant.
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
  // depth : { maxRound, isWinner } — on garde le round le plus profond
  const depth = new Map<string, { maxRound: number; isWinner: boolean }>();

  for (const s of series) {
    // Série commencée (au moins 1 victoire) ou terminée
    const started = s.completed || s.team1Wins + s.team2Wins > 0;
    if (!started) continue;

    const update = (teamId: string, round: number, winner: boolean) => {
      const prev = depth.get(teamId);
      if (!prev || round > prev.maxRound) {
        depth.set(teamId, { maxRound: round, isWinner: winner });
      }
    };

    update(s.team1Id, s.round, true);
    update(s.team2Id, s.round, false);
  }

  const badges = new Map<string, Badge>();

  for (const [teamId, { maxRound, isWinner }] of depth) {
    let badge: Badge;

    if (maxRound === 4 && isWinner) {
      badge = {
        label: "Champion 🏆",
        className: `${BADGE_PILL} bg-amber-500/20 border-amber-500/30 text-amber-300`,
      };
    } else if (maxRound === 4) {
      badge = {
        label: "Finaliste NBA",
        className: `${BADGE_PILL} bg-white/[0.08] border-white/20 text-white/60`,
      };
    } else if (maxRound === 3) {
      badge = {
        label: "Finale Conférence",
        className: `${BADGE_PILL} bg-orange-500/15 border-orange-500/25 text-orange-300`,
      };
    } else if (maxRound === 2) {
      badge = {
        label: "Demi-Finale Conf.",
        className: `${BADGE_PILL} bg-emerald-500/10 border-emerald-500/20 text-emerald-400`,
      };
    } else {
      badge = {
        label: "1er Tour",
        className: `${BADGE_PILL} bg-white/[0.04] border-white/10 text-white/40`,
      };
    }

    badges.set(teamId, badge);
  }

  return badges;
}

/** Fallback si pas de données PlayoffSeries : Play-In depuis le code ESPN. */
function fallbackBadge(playoffResult: string | null): Badge | null {
  if (!playoffResult) return null;
  const code = playoffResult
    .replace(/^\s*-\s*/, "")
    .trim()
    .toLowerCase();
  if (code === "pi") {
    return {
      label: "Play-In",
      className: `${BADGE_PILL} bg-blue-500/15 border-blue-500/25 text-blue-300`,
    };
  }
  if (code === "o" || code === "") return null;
  return {
    label: "Playoffs",
    className: `${BADGE_PILL} bg-emerald-500/10 border-emerald-500/20 text-emerald-400`,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TeamSeasonRow = {
  teamId: string;
  rank: number;
  teamName: string;
  teamCity: string;
  teamSlug: string;
  wins: number;
  losses: number;
  netRating: number | null;
  playoffResult: string | null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SaisonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const { locale } = await params;
  const { saison } = await searchParams;
  const season = saison ?? CURRENT_SEASON;

  // Fetch en parallèle : standings + séries playoff + leaders stats
  const [teamSeasons, playoffSeries, playerSeasons] = await Promise.all([
    prisma.teamSeason.findMany({
      where: { season },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            city: true,
            slug: true,
            conference: true,
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
    prisma.playerSeason.findMany({
      where: { season },
      include: {
        player: { select: { firstName: true, lastName: true, slug: true } },
      },
      orderBy: { pointsPerGame: "desc" },
    }),
  ]);

  // Badges depuis les vraies séries
  const playoffBadges = buildPlayoffBadges(playoffSeries);

  // Leaders
  const ppgLeader = playerSeasons[0] ?? null;
  const rpgLeader =
    playerSeasons.length > 0
      ? [...playerSeasons].sort(
          (a, b) => b.reboundsPerGame - a.reboundsPerGame,
        )[0]
      : null;
  const apgLeader =
    playerSeasons.length > 0
      ? [...playerSeasons].sort(
          (a, b) => b.assistsPerGame - a.assistsPerGame,
        )[0]
      : null;

  // Tri par conférence + classement
  function sortConference(rows: typeof teamSeasons): TeamSeasonRow[] {
    return [...rows]
      .sort((a, b) => {
        if (a.conferenceRank != null && b.conferenceRank != null)
          return a.conferenceRank - b.conferenceRank;
        if (a.conferenceRank != null) return -1;
        if (b.conferenceRank != null) return 1;
        return b.wins - a.wins;
      })
      .map((ts, i) => ({
        teamId: ts.team.id,
        rank: ts.conferenceRank ?? i + 1,
        teamName: ts.team.name,
        teamCity: ts.team.city,
        teamSlug: ts.team.slug,
        wins: ts.wins,
        losses: ts.losses,
        netRating: ts.netRating,
        playoffResult: ts.playoffResult,
      }));
  }

  const westTeams = sortConference(
    teamSeasons.filter((ts) => ts.team.conference === "West"),
  );
  const eastTeams = sortConference(
    teamSeasons.filter((ts) => ts.team.conference === "East"),
  );

  const hasData = teamSeasons.length > 0;
  const hasLeaders = playerSeasons.length > 0;

  return (
    <div className="space-y-6">
      <FadeIn>
        <Crumbs
          items={[
            { label: "Accueil", href: `/${locale}` },
            { label: "Saisons" },
          ]}
        />
        <div className="mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] font-medium uppercase tracking-wider mb-4">
            Classements {season}
          </div>
          <h1 className="font-display font-semibold text-4xl md:text-5xl tracking-[-0.03em] mb-2">
            Saisons
            <span className="text-white/30 ml-3 font-normal text-3xl">
              {season}
            </span>
          </h1>
        </div>
      </FadeIn>

      {/* Leaders statistiques */}
      {hasLeaders && (
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Points / match",
                value: stat(ppgLeader?.pointsPerGame),
                player: ppgLeader?.player,
              },
              {
                label: "Rebonds / match",
                value: stat(rpgLeader?.reboundsPerGame),
                player: rpgLeader?.player,
              },
              {
                label: "Passes / match",
                value: stat(apgLeader?.assistsPerGame),
                player: apgLeader?.player,
              },
            ].map((leader) => (
              <div
                key={leader.label}
                className="rounded-2xl border border-white/[0.06] bg-[#111114] p-4"
              >
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                  {leader.label}
                </p>
                <p className="text-2xl font-semibold tabular-nums mb-1">
                  {leader.value}
                </p>
                {leader.player && (
                  <Link
                    href={`/${locale}/joueurs/${leader.player.slug}`}
                    className="text-xs text-white/50 hover:text-white/90 transition truncate block"
                  >
                    {leader.player.firstName} {leader.player.lastName}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Tableaux de conférences */}
      {!hasData ? (
        <FadeIn delay={0.1}>
          <p className="text-white/40 text-sm font-mono py-12 text-center">
            Aucune donnée disponible pour la saison {season}.
          </p>
        </FadeIn>
      ) : (
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "CONFÉRENCE OUEST", rows: westTeams },
              { label: "CONFÉRENCE EST", rows: eastTeams },
            ].map(({ label, rows }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden"
              >
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                    {label}
                  </p>
                </div>
                {rows.length === 0 ? (
                  <p className="text-white/40 text-xs px-4 pb-4">
                    Aucune équipe.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-[11px] uppercase tracking-wider text-white/40 font-medium text-left px-4 py-2 w-8">
                          Rg
                        </th>
                        <th className="text-[11px] uppercase tracking-wider text-white/40 font-medium text-left px-2 py-2">
                          Équipe
                        </th>
                        <th className="text-[11px] uppercase tracking-wider text-white/40 font-medium text-center px-2 py-2 w-8">
                          V
                        </th>
                        <th className="text-[11px] uppercase tracking-wider text-white/40 font-medium text-center px-2 py-2 w-8">
                          D
                        </th>
                        <th className="text-[11px] uppercase tracking-wider text-white/40 font-medium text-center px-2 py-2 w-12 hidden sm:table-cell">
                          %
                        </th>
                        <th className="text-[11px] uppercase tracking-wider text-white/40 font-medium text-center px-2 py-2 w-12 hidden sm:table-cell">
                          Net
                        </th>
                        <th className="text-[11px] uppercase tracking-wider text-white/40 font-medium text-left px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {rows.map((row) => {
                        // Priorité : badge depuis séries réelles, sinon fallback ESPN code
                        const badge =
                          playoffBadges.get(row.teamId) ??
                          fallbackBadge(row.playoffResult);

                        const total = row.wins + row.losses;
                        const pctStr =
                          total === 0
                            ? "—"
                            : ((row.wins / total) * 100).toFixed(1);
                        const netStr =
                          row.netRating == null
                            ? "—"
                            : row.netRating >= 0
                              ? `+${row.netRating.toFixed(1)}`
                              : row.netRating.toFixed(1);
                        const isPlayoffSpot = row.rank <= 8;

                        return (
                          <tr
                            key={row.teamSlug}
                            className={`transition-colors hover:bg-white/[0.02] ${isPlayoffSpot ? "" : "opacity-60"}`}
                          >
                            <td className="px-4 py-2.5 text-white/40 text-xs tabular-nums">
                              {row.rank}
                            </td>
                            <td className="px-2 py-2.5">
                              <Link
                                href={`/${locale}/equipes/${row.teamSlug}`}
                                className="hover:text-white/90 transition text-white/80"
                              >
                                {row.teamCity} {row.teamName}
                              </Link>
                            </td>
                            <td className="px-2 py-2.5 text-center tabular-nums text-white/70">
                              {row.wins}
                            </td>
                            <td className="px-2 py-2.5 text-center tabular-nums text-white/70">
                              {row.losses}
                            </td>
                            <td className="px-2 py-2.5 text-center tabular-nums text-white/50 text-xs hidden sm:table-cell">
                              {pctStr}
                            </td>
                            <td
                              className={`px-2 py-2.5 text-center tabular-nums text-xs hidden sm:table-cell ${
                                row.netRating == null
                                  ? "text-white/30"
                                  : row.netRating >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                              }`}
                            >
                              {netStr}
                            </td>
                            <td className="px-2 py-2.5 text-right">
                              {badge && (
                                <span className={badge.className}>
                                  {badge.label}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
