import { type Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";
import { stat, pct, record } from "@/lib/format";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TeamMono } from "@/components/ui/team-mono";
import { FadeIn } from "@/components/ui/fade-in";

export const metadata: Metadata = {
  title: "hoopstats — Stats NBA en français",
  description:
    "Stats NBA complètes en français. Joueurs, équipes, saison 2025-26.",
};

export const revalidate = 21600;

// ── Types internes ────────────────────────────────────────────────────────────

type LeaderRow = {
  slug: string;
  firstName: string;
  lastName: string;
  position: string | null;
  photoUrl: string | null;
  teamAbbr: string;
  primaryColor: string;
  secondaryColor: string;
  value: number;
};

type StandingRow = {
  slug: string;
  abbr: string;
  city: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  wins: number;
  losses: number;
  conferenceRank: number | null;
};

// ── Data ─────────────────────────────────────────────────────────────────────

async function getLeaders(
  orderBy: "pointsPerGame" | "reboundsPerGame" | "assistsPerGame",
  limit = 5,
): Promise<LeaderRow[]> {
  const rows = await prisma.playerSeason.findMany({
    where: { season: CURRENT_SEASON, gamesPlayed: { gte: 10 } },
    orderBy: { [orderBy]: "desc" },
    take: limit,
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
  return rows.map((r) => ({
    slug: r.player.slug,
    firstName: r.player.firstName,
    lastName: r.player.lastName,
    position: r.player.position,
    photoUrl: r.player.photoUrl,
    teamAbbr: r.team.abbr,
    primaryColor: r.team.primaryColor,
    secondaryColor: r.team.secondaryColor,
    value: r[orderBy] as number,
  }));
}

async function getTsLeaders(limit = 5): Promise<LeaderRow[]> {
  const rows = await prisma.playerSeason.findMany({
    where: {
      season: CURRENT_SEASON,
      gamesPlayed: { gte: 20 },
      trueShooting: { not: null },
    },
    orderBy: { trueShooting: "desc" },
    take: limit,
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
  return rows.map((r) => ({
    slug: r.player.slug,
    firstName: r.player.firstName,
    lastName: r.player.lastName,
    position: r.player.position,
    photoUrl: r.player.photoUrl,
    teamAbbr: r.team.abbr,
    primaryColor: r.team.primaryColor,
    secondaryColor: r.team.secondaryColor,
    value: r.trueShooting as number,
  }));
}

type RecentGameRow = {
  id: string;
  gameDate: Date;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: {
    abbr: string;
    logoUrl: string | null;
    primaryColor: string;
    slug: string;
  };
  awayTeam: {
    abbr: string;
    logoUrl: string | null;
    primaryColor: string;
    slug: string;
  };
};

async function getRecentGames(limit = 6): Promise<RecentGameRow[]> {
  return prisma.game.findMany({
    where: { status: "final", season: CURRENT_SEASON },
    orderBy: { gameDate: "desc" },
    take: limit,
    select: {
      id: true,
      gameDate: true,
      homeScore: true,
      awayScore: true,
      homeTeam: {
        select: { abbr: true, logoUrl: true, primaryColor: true, slug: true },
      },
      awayTeam: {
        select: { abbr: true, logoUrl: true, primaryColor: true, slug: true },
      },
    },
  });
}

async function getStandings(
  conference: "East" | "West",
  limit = 5,
): Promise<StandingRow[]> {
  const rows = await prisma.teamSeason.findMany({
    where: { season: CURRENT_SEASON, team: { conference } },
    orderBy: [{ wins: "desc" }, { losses: "asc" }],
    take: limit,
    include: {
      team: {
        select: {
          slug: true,
          abbr: true,
          city: true,
          name: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
        },
      },
    },
  });
  return rows.map((r, i) => ({
    slug: r.team.slug,
    abbr: r.team.abbr,
    city: r.team.city,
    name: r.team.name,
    primaryColor: r.team.primaryColor,
    secondaryColor: r.team.secondaryColor,
    logoUrl: r.team.logoUrl,
    wins: r.wins,
    losses: r.losses,
    conferenceRank: r.conferenceRank ?? i + 1,
  }));
}

async function getCounts() {
  const [playersCount, teamsCount, gamesCount] = await Promise.all([
    prisma.playerSeason.count({
      where: { season: CURRENT_SEASON, gamesPlayed: { gte: 1 } },
    }),
    prisma.teamSeason.count({ where: { season: CURRENT_SEASON } }),
    prisma.game.count({ where: { season: CURRENT_SEASON, status: "final" } }),
  ]);
  return { playersCount, teamsCount, gamesCount };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LeadersPanel({
  title,
  unit,
  rows,
  format,
  locale,
}: {
  title: string;
  unit: string;
  rows: LeaderRow[];
  format: (v: number) => string;
  locale: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-baseline justify-between">
        <h3 className="font-display font-semibold text-base tracking-tight">
          {title}
        </h3>
        <span className="text-[11px] text-white/30 uppercase tracking-wider">
          {unit}
        </span>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {rows.map((row, i) => {
          const isTop = i === 0;
          return (
            <li key={row.slug}>
              <Link
                href={`/${locale}/joueurs/${row.slug}`}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition group ${
                  isTop ? "bg-orange-500/[0.04]" : ""
                }`}
              >
                <span
                  className={`w-4 text-xs tabular-nums font-mono ${
                    isTop ? "text-orange-400 font-bold" : "text-white/20"
                  }`}
                >
                  {i + 1}
                </span>
                <PlayerAvatar
                  firstName={row.firstName}
                  lastName={row.lastName}
                  primaryColor={row.primaryColor}
                  secondaryColor={row.secondaryColor}
                  photoUrl={row.photoUrl}
                  size="xs"
                  showNum={false}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight truncate group-hover:text-orange-300 transition">
                    {row.firstName} {row.lastName}
                  </div>
                  <div className="text-[11px] text-white/30 font-sans">
                    {row.teamAbbr}
                    {row.position ? ` · ${row.position}` : ""}
                  </div>
                </div>
                <span
                  className={`font-mono font-semibold text-sm tabular-nums ${
                    isTop ? "text-orange-300" : ""
                  }`}
                >
                  {format(row.value)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StandingsPanel({
  title,
  rows,
  locale,
}: {
  title: string;
  rows: StandingRow[];
  locale: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <h3 className="font-display font-semibold text-base tracking-tight">
          {title}
        </h3>
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {rows.map((row) => (
          <li key={row.slug}>
            <Link
              href={`/${locale}/equipes/${row.slug}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition group"
            >
              <span className="text-xs text-white/20 w-4 tabular-nums font-mono">
                {row.conferenceRank}
              </span>
              <TeamMono
                abbr={row.abbr}
                primaryColor={row.primaryColor}
                secondaryColor={row.secondaryColor}
                logoUrl={row.logoUrl}
                size="xs"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight truncate group-hover:text-orange-300 transition">
                  {row.city} <span className="text-white/40">{row.name}</span>
                </div>
              </div>
              <span className="font-mono text-xs tabular-nums text-white/60">
                {record(row.wins, row.losses)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpotlightCard({
  leader,
  locale,
}: {
  leader: LeaderRow;
  locale: string;
}) {
  return (
    <Link
      href={`/${locale}/joueurs/${leader.slug}`}
      className="group relative block overflow-hidden rounded-3xl border border-white/[0.06] bg-[#111114] hover:border-white/[0.12] transition"
    >
      {/* Glow équipe + orange */}
      <div
        aria-hidden
        className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-30 transition group-hover:opacity-50"
        style={{ background: leader.primaryColor }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-20 h-64 w-64 rounded-full blur-3xl opacity-10 bg-orange-500"
      />

      <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-6 p-6 sm:p-8">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[10px] font-mono uppercase tracking-widest mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
            Top scorer · saison {CURRENT_SEASON}
          </div>
          <h3 className="font-display font-bold text-3xl sm:text-4xl tracking-tight leading-[1.05] mb-2 group-hover:text-orange-300 transition">
            {leader.firstName}
            <br />
            <span className="text-white/80">{leader.lastName}</span>
          </h3>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: leader.primaryColor }}
            />
            {leader.teamAbbr}
            {leader.position ? ` · ${leader.position}` : ""}
          </div>

          <div className="mt-6">
            <div className="font-display font-bold text-5xl sm:text-6xl tabular-nums tracking-tight bg-gradient-to-br from-white to-orange-300 bg-clip-text text-transparent">
              {stat(leader.value)}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono mt-1">
              Points par match
            </div>
          </div>
        </div>

        <div className="shrink-0 self-end">
          <PlayerAvatar
            firstName={leader.firstName}
            lastName={leader.lastName}
            primaryColor={leader.primaryColor}
            secondaryColor={leader.secondaryColor}
            photoUrl={leader.photoUrl}
            size="xl"
            showNum={false}
          />
        </div>
      </div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const [
    ptsLeaders,
    rebLeaders,
    astLeaders,
    tsLeaders,
    eastStandings,
    westStandings,
    recentGames,
    counts,
  ] = await Promise.all([
    getLeaders("pointsPerGame"),
    getLeaders("reboundsPerGame"),
    getLeaders("assistsPerGame"),
    getTsLeaders(),
    getStandings("East"),
    getStandings("West"),
    getRecentGames(),
    getCounts(),
  ]);

  const topScorer = ptsLeaders[0];

  return (
    <div className="space-y-8">
      {/* ── Status bar : saison + ticker stats sur une ligne ─────────────── */}
      <FadeIn>
        <section className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] font-medium uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
            Saison {CURRENT_SEASON} · En cours
          </div>
          <div className="flex items-center gap-x-6 text-sm text-white/40">
            <span>
              <span className="font-display font-semibold text-white tabular-nums">
                {counts.playersCount}
              </span>{" "}
              joueurs
            </span>
            <span className="text-white/15">·</span>
            <span>
              <span className="font-display font-semibold text-white tabular-nums">
                {counts.teamsCount}
              </span>{" "}
              franchises
            </span>
            <span className="text-white/15">·</span>
            <span>
              <span className="font-display font-semibold text-white tabular-nums">
                {counts.gamesCount}
              </span>{" "}
              matchs joués
            </span>
          </div>
        </section>
      </FadeIn>

      {/* ── Spotlight Top Scorer (vraie vitrine) ──────────────────────────── */}
      {topScorer && (
        <FadeIn delay={0.05}>
          <SpotlightCard leader={topScorer} locale={locale} />
        </FadeIn>
      )}

      {/* ── Résultats récents ─────────────────────────────────────────────── */}
      {recentGames.length > 0 && (
        <FadeIn delay={0.16}>
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display font-semibold text-xl tracking-tight">
                Résultats récents{" "}
                <span className="text-white/25 font-normal text-base">
                  derniers matchs
                </span>
              </h2>
              <Link
                href={`/${locale}/matchs`}
                className="text-[11px] text-white/40 hover:text-orange-300 transition font-mono uppercase tracking-widest"
              >
                Tous →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {recentGames.map((g) => {
                const homeWon = (g.homeScore ?? 0) > (g.awayScore ?? 0);
                const awayWon = (g.awayScore ?? 0) > (g.homeScore ?? 0);
                return (
                  <Link
                    key={g.id}
                    href={`/${locale}/matchs/${g.id}`}
                    className="relative rounded-2xl border border-white/[0.06] bg-[#111114] px-4 py-3.5 flex items-center gap-3 hover:border-white/[0.12] hover:bg-[#16161a] transition group overflow-hidden"
                  >
                    <div
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-0.5 transition-all group-hover:w-1"
                      style={{ background: g.homeTeam.primaryColor }}
                    />

                    {/* Équipe away */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {g.awayTeam.logoUrl && (
                        <Image
                          src={g.awayTeam.logoUrl}
                          alt={g.awayTeam.abbr}
                          width={28}
                          height={28}
                          className="object-contain shrink-0"
                          unoptimized
                        />
                      )}
                      <span
                        className={`text-xs font-mono truncate ${awayWon ? "text-white" : "text-white/50"}`}
                      >
                        {g.awayTeam.abbr}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="text-center shrink-0">
                      <div className="font-mono font-semibold tabular-nums text-sm">
                        <span
                          className={awayWon ? "text-white" : "text-white/40"}
                        >
                          {g.awayScore ?? "–"}
                        </span>
                        <span className="text-white/20 mx-1.5">–</span>
                        <span
                          className={homeWon ? "text-white" : "text-white/40"}
                        >
                          {g.homeScore ?? "–"}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/25 font-mono mt-0.5">
                        {new Date(g.gameDate).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>

                    {/* Équipe home */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span
                        className={`text-xs font-mono truncate text-right ${homeWon ? "text-white" : "text-white/50"}`}
                      >
                        {g.homeTeam.abbr}
                      </span>
                      {g.homeTeam.logoUrl && (
                        <Image
                          src={g.homeTeam.logoUrl}
                          alt={g.homeTeam.abbr}
                          width={28}
                          height={28}
                          className="object-contain shrink-0"
                          unoptimized
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </FadeIn>
      )}

      {/* ── Leaders ──────────────────────────────────────────────────────── */}
      <FadeIn delay={0.24}>
        <section>
          <h2 className="font-display font-semibold text-xl tracking-tight mb-4">
            Leaders de la saison{" "}
            <span className="text-white/25 font-normal text-base">
              {CURRENT_SEASON}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <LeadersPanel
              title="Points"
              unit="PPG"
              rows={ptsLeaders}
              format={(v) => stat(v)}
              locale={locale}
            />
            <LeadersPanel
              title="Rebonds"
              unit="RPG"
              rows={rebLeaders}
              format={(v) => stat(v)}
              locale={locale}
            />
            <LeadersPanel
              title="Passes décisives"
              unit="APG"
              rows={astLeaders}
              format={(v) => stat(v)}
              locale={locale}
            />
            <LeadersPanel
              title="True Shooting"
              unit="TS% · min. 20MJ"
              rows={tsLeaders}
              format={(v) => `${pct(v)}%`}
              locale={locale}
            />
          </div>
        </section>
      </FadeIn>

      {/* ── Standings ────────────────────────────────────────────────────── */}
      <FadeIn delay={0.32}>
        <section>
          <h2 className="font-display font-semibold text-xl tracking-tight mb-4">
            Classement{" "}
            <span className="text-white/25 font-normal text-base">
              top 5 par conférence
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StandingsPanel
              title="Conférence Est"
              rows={eastStandings}
              locale={locale}
            />
            <StandingsPanel
              title="Conférence Ouest"
              rows={westStandings}
              locale={locale}
            />
          </div>
        </section>
      </FadeIn>
    </div>
  );
}
