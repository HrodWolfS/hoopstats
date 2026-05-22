import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";
import { stat, pct, record } from "@/lib/format";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TeamMono } from "@/components/ui/team-mono";

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
    wins: r.wins,
    losses: r.losses,
    conferenceRank: r.conferenceRank ?? i + 1,
  }));
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
        {rows.map((row, i) => (
          <li key={row.slug}>
            <Link
              href={`/${locale}/joueurs/${row.slug}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition group"
            >
              <span className="text-xs text-white/20 w-4 tabular-nums font-mono">
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
                <div className="text-sm font-medium leading-tight truncate group-hover:text-violet-300 transition">
                  {row.firstName} {row.lastName}
                </div>
                <div className="text-[11px] text-white/30 font-sans">
                  {row.teamAbbr}
                  {row.position ? ` · ${row.position}` : ""}
                </div>
              </div>
              <span className="font-mono font-semibold text-sm tabular-nums">
                {format(row.value)}
              </span>
            </Link>
          </li>
        ))}
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
                size="xs"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight truncate group-hover:text-violet-300 transition">
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
  ] = await Promise.all([
    getLeaders("pointsPerGame"),
    getLeaders("reboundsPerGame"),
    getLeaders("assistsPerGame"),
    getTsLeaders(),
    getStandings("East"),
    getStandings("West"),
  ]);

  return (
    <div className="space-y-10">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-4 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-medium uppercase tracking-wider mb-5">
          Saison {CURRENT_SEASON} · En cours
        </div>
        <h1 className="font-display font-semibold text-5xl md:text-7xl tracking-[-0.04em] leading-[0.9] mb-5">
          Stats NBA
          <br />
          <span className="text-white/25">en français</span>
        </h1>
        <p className="text-white/40 text-base max-w-lg leading-relaxed mb-7">
          Joueurs, équipes, stats carrière et stats avancées — toute la ligue,
          saison {CURRENT_SEASON}.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${locale}/joueurs`}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition"
          >
            Joueurs →
          </Link>
          <Link
            href={`/${locale}/equipes`}
            className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.09] text-white text-sm font-medium transition"
          >
            Équipes →
          </Link>
        </div>
      </section>

      {/* ── Leaders ──────────────────────────────────────────────────────── */}
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

      {/* ── Standings ────────────────────────────────────────────────────── */}
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
    </div>
  );
}
