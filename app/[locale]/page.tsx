import { type Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { scaledMinimumGames } from "@/lib/stats/leaders";
import { MULTI_TEAM_ABBR } from "@/lib/stats/season-consolidation";
import { consolidateSeasonRows } from "@/lib/stats/season-totals";
import {
  SEASON_OPENERS,
  currentSeason,
  draftYearOf,
  espnSeasonYear,
  previousSeason,
} from "@/lib/nba";
import { stat, pct, record } from "@/lib/format";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TeamMono } from "@/components/ui/team-mono";
import { FadeIn } from "@/components/ui/fade-in";
import { COMPETITIVE_PHASES, REGULAR_SEASON_PHASE } from "@/lib/season-phase";

export const metadata: Metadata = {
  title: "hoopstats — Stats NBA en français",
  description:
    "Stats NBA complètes en français : joueurs, équipes, classements et matchs, mis à jour chaque jour.",
  alternates: { canonical: "/fr" },
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

type FinalsSpotlightRow = {
  player: {
    slug: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
  };
  team: {
    slug: string;
    abbr: string;
    city: string;
    name: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
  };
  notes: string | null;
};

// ── Data ─────────────────────────────────────────────────────────────────────

/**
 * Sans seuil de volume, le TS% sacre des pivots à 3 tirs par match (Sims,
 * Kalkbrenner) ou un vétéran qui tire à peine. 20 minutes et 10 points par
 * match réservent ce classement aux joueurs dont l'efficacité porte une attaque.
 */
const TS_MIN_MINUTES = 20;
const TS_MIN_POINTS = 10;

/** Matchs minimum une fois la saison bien lancée. */
const LEADER_MIN_GAMES = 10;
const TS_MIN_GAMES = 20;

type SeasonLeaders = {
  points: LeaderRow[];
  rebounds: LeaderRow[];
  assists: LeaderRow[];
  trueShooting: LeaderRow[];
};

/**
 * Leaders de la saison, une ligne par joueur : les passages d'un joueur
 * transféré sont regroupés avant d'appliquer les seuils et de trier.
 */
async function getSeasonLeaders(
  season: string,
  minGames: number,
  tsMinGames: number,
  limit = 5,
): Promise<SeasonLeaders> {
  const stints = await prisma.playerSeason.findMany({
    where: { season },
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
  const rows = await consolidateSeasonRows(season, stints);

  function top(
    eligible: (row: (typeof rows)[number]) => boolean,
    value: (row: (typeof rows)[number]) => number | null,
  ): LeaderRow[] {
    return rows
      .filter(eligible)
      .map((row) => ({ row, value: value(row) }))
      .filter((entry): entry is typeof entry & { value: number } => entry.value != null)
      .sort((left, right) => right.value - left.value)
      .slice(0, limit)
      .map(({ row, value }) => ({
        slug: row.player.slug,
        firstName: row.player.firstName,
        lastName: row.player.lastName,
        position: row.player.position,
        photoUrl: row.player.photoUrl,
        teamAbbr: row.isMultiTeam ? MULTI_TEAM_ABBR : row.team.abbr,
        primaryColor: row.team.primaryColor,
        secondaryColor: row.team.secondaryColor,
        value,
      }));
  }

  const qualified = (row: (typeof rows)[number]) => row.gamesPlayed >= minGames;
  return {
    points: top(qualified, (row) => row.pointsPerGame),
    rebounds: top(qualified, (row) => row.reboundsPerGame),
    assists: top(qualified, (row) => row.assistsPerGame),
    trueShooting: top(
      (row) =>
        row.gamesPlayed >= tsMinGames &&
        row.minutesPerGame >= TS_MIN_MINUTES &&
        row.pointsPerGame >= TS_MIN_POINTS,
      (row) => row.trueShooting,
    ),
  };
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

async function getRecentGames(
  season: string,
  limit = 6,
): Promise<RecentGameRow[]> {
  return prisma.game.findMany({
    where: {
      status: "final",
      season,
      phase: { in: COMPETITIVE_PHASES },
    },
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
  season: string,
  conference: "East" | "West",
  limit = 5,
): Promise<StandingRow[]> {
  const rows = await prisma.teamSeason.findMany({
    where: { season, team: { conference } },
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

async function getCounts(season: string) {
  const [playersCount, teamsCount, gamesCount] = await Promise.all([
    prisma.playerSeason.count({
      where: { season, gamesPlayed: { gte: 1 } },
    }),
    prisma.teamSeason.count({ where: { season } }),
    prisma.game.count({
      where: { season, status: "final", phase: REGULAR_SEASON_PHASE },
    }),
  ]);
  return { playersCount, teamsCount, gamesCount };
}

async function getFinalsSpotlight(
  season: string,
): Promise<FinalsSpotlightRow | null> {
  const award = await prisma.award.findFirst({
    where: {
      type: "FMVP",
      season,
      playerId: { not: null },
      teamId: { not: null },
    },
    select: {
      notes: true,
      player: {
        select: { slug: true, firstName: true, lastName: true, photoUrl: true },
      },
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
  return award?.player && award.team
    ? { player: award.player, team: award.team, notes: award.notes }
    : null;
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
  season,
  locale,
}: {
  leader: LeaderRow;
  season: string;
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
            Top scorer · saison {season}
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

/**
 * Récit éditorial des Finales, rédigé à la main pour la saison concernée.
 * Sans récit, l'encart se construit à partir du trophée de MVP des Finales.
 */
const FINALS_STORIES: Record<string, { headline: string; text: string }> = {
  "2025-26": {
    headline: "Les Knicks au sommet",
    text: "New York décroche son premier titre depuis 1973. Jalen Brunson remporte le trophée Bill Russell avec 32,6 points de moyenne en Finales.",
  },
};

function FinalsSpotlight({
  spotlight,
  season,
  locale,
}: {
  spotlight: FinalsSpotlightRow;
  season: string;
  locale: string;
}) {
  const { player, team } = spotlight;
  const story = FINALS_STORIES[season];
  const headline = story?.headline ?? `Les ${team.name} champions`;
  const text = story?.text ?? spotlight.notes;
  const playerName = `${player.firstName} ${player.lastName}`;
  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/[0.08]"
      style={{
        background: `linear-gradient(125deg, ${team.primaryColor}32 0%, #111114 55%, #111114 100%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute -right-24 -top-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ background: team.primaryColor }}
      />
      <div className="relative grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-orange-300">
            Saison terminée · Champions NBA {espnSeasonYear(season)}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
            {headline},
            <span className="block text-white/65">
              {player.lastName} MVP des Finales
            </span>
          </h1>
          {text && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
              {text}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/joueurs/${player.slug}`}
              className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-orange-400"
            >
              Voir {playerName}
            </Link>
            <Link
              href={`/${locale}/trophees`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/20 hover:text-white"
            >
              Palmarès {season}
            </Link>
            <Link
              href={`/${locale}/draft`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/20 hover:text-white"
            >
              Draft {espnSeasonYear(season)} →
            </Link>
          </div>
        </div>
        <div className="flex items-end justify-center gap-2 sm:justify-end">
          {team.logoUrl && (
            <Image
              src={team.logoUrl}
              alt={`Logo ${team.city} ${team.name}`}
              width={104}
              height={104}
              className="h-20 w-20 object-contain opacity-90 sm:h-24 sm:w-24"
              loading="eager"
              unoptimized
            />
          )}
          <PlayerAvatar
            firstName={player.firstName}
            lastName={player.lastName}
            primaryColor={team.primaryColor}
            secondaryColor={team.secondaryColor}
            photoUrl={player.photoUrl}
            size="xl"
            showNum={false}
          />
        </div>
      </div>
    </section>
  );
}

/** Premier match de la saison, en heure de Paris : « mardi 20 octobre ». */
function openerLabel(season: string): string | null {
  const opener = SEASON_OPENERS[season];
  if (!opener) return null;
  return new Date(opener).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });
}

/** Encart des premiers jours, tant qu'aucun match de saison régulière n'est joué. */
function SeasonOpenerCard({
  season,
  locale,
}: {
  season: string;
  locale: string;
}) {
  const previous = previousSeason(season);
  const opener = openerLabel(season);
  return (
    <section className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#111114] to-[#111114] p-6 sm:p-8">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-orange-300">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
        Reprise de la saison {season}
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">
        La NBA est de retour
        {opener && (
          <span className="block text-white/65">
            Premiers matchs le {opener}
          </span>
        )}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
        Classements, leaders et fiches joueurs se remplissent après chaque nuit
        de matchs. Les statistiques {previous} restent consultables avec le
        sélecteur de saison.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/${locale}/matchs`}
          className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-orange-400"
        >
          Voir les matchs
        </Link>
        <Link
          href={`/${locale}/draft?saison=${season}`}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/20 hover:text-white"
        >
          Draft {draftYearOf(season)}
        </Link>
        <Link
          href={`/${locale}/trophees`}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/20 hover:text-white"
        >
          Palmarès {previous}
        </Link>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const season = currentSeason();

  const counts = await getCounts(season);
  // Chaque match compte pour deux équipes : moyenne de matchs joués par équipe.
  const teamGames = (counts.gamesCount * 2) / 30;
  const leaderMinGames = scaledMinimumGames(teamGames, LEADER_MIN_GAMES);
  const tsMinGames = scaledMinimumGames(teamGames, TS_MIN_GAMES);

  const [
    leaders,
    eastStandings,
    westStandings,
    recentGames,
    finalsSpotlight,
  ] = await Promise.all([
    getSeasonLeaders(season, leaderMinGames, tsMinGames),
    getStandings(season, "East"),
    getStandings(season, "West"),
    getRecentGames(season),
    getFinalsSpotlight(season),
  ]);

  const {
    points: ptsLeaders,
    rebounds: rebLeaders,
    assists: astLeaders,
    trueShooting: tsLeaders,
  } = leaders;
  const topScorer = ptsLeaders[0];
  const hasLeaders = ptsLeaders.length > 0;
  const hasStandings = eastStandings.length > 0 || westStandings.length > 0;
  const seasonStatus = finalsSpotlight
    ? "Terminée"
    : counts.gamesCount === 0
      ? "Reprise"
      : "En cours";

  return (
    <div className="space-y-8">
      {/* ── Status bar : saison + ticker stats sur une ligne ─────────────── */}
      <FadeIn>
        <section className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] font-medium uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
            Saison {season} · {seasonStatus}
          </div>
          {counts.gamesCount > 0 && (
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
          )}
        </section>
      </FadeIn>

      {/* ── À la une : le fait majeur de la saison, puis leader en fallback ── */}
      <FadeIn delay={0.05}>
        {finalsSpotlight ? (
          <FinalsSpotlight
            spotlight={finalsSpotlight}
            season={season}
            locale={locale}
          />
        ) : topScorer && counts.gamesCount > 0 ? (
          <SpotlightCard leader={topScorer} season={season} locale={locale} />
        ) : (
          <SeasonOpenerCard season={season} locale={locale} />
        )}
      </FadeIn>

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
      {hasLeaders && (
        <FadeIn delay={0.24}>
          <section>
            <h2 className="font-display font-semibold text-xl tracking-tight mb-4">
              Leaders de la saison{" "}
              <span className="text-white/25 font-normal text-base">
                {season}
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
                unit={`TS% · min. ${tsMinGames}MJ, ${TS_MIN_MINUTES} min, ${TS_MIN_POINTS} pts`}
                rows={tsLeaders}
                format={(v) => `${pct(v)}%`}
                locale={locale}
              />
            </div>
          </section>
        </FadeIn>
      )}

      {/* ── Standings ────────────────────────────────────────────────────── */}
      {hasStandings && (
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
      )}
    </div>
  );
}
