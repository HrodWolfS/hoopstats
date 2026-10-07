/**
 * Données de la page matchs : une journée NBA ou le calendrier d'une équipe.
 * Les règles (journées, contrôle des scores) vivent dans `lib/schedule.ts`.
 */

import { prisma } from "@/lib/prisma";
import { currentSeason } from "@/lib/nba";
import {
  checkScore,
  dayBounds,
  dayKeyOf,
  linescoreValues,
  monthBounds,
  type ScoreIssue,
} from "@/lib/schedule";

const teamSelect = {
  abbr: true,
  city: true,
  name: true,
  slug: true,
  logoUrl: true,
  primaryColor: true,
} as const;

export type ScheduleTeam = {
  abbr: string;
  city: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
};

export type GameLeader = {
  name: string;
  slug: string | null;
  pts: number;
  reb: number;
  ast: number;
};

export type ScheduleGame = {
  id: string;
  dayKey: string;
  gameDate: Date;
  status: string;
  phase: string | null;
  season: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: ScheduleTeam;
  awayTeam: ScheduleTeam;
  /** Périodes jouées selon le tableau des scores, `null` sans tableau. */
  periods: number | null;
  issues: ScoreIssue[];
  /** Meilleur marqueur de chaque équipe (box score en base). */
  awayLeader: GameLeader | null;
  homeLeader: GameLeader | null;
};

const gameSelect = {
  id: true,
  gameDate: true,
  status: true,
  phase: true,
  season: true,
  homeScore: true,
  awayScore: true,
  homeTeam: { select: teamSelect },
  awayTeam: { select: teamSelect },
  boxScore: { select: { homeLinescores: true, awayLinescores: true } },
  playerBoxScores: {
    where: { didNotPlay: false },
    select: {
      teamAbbr: true,
      playerName: true,
      pts: true,
      reb: true,
      ast: true,
      player: { select: { slug: true } },
    },
  },
} as const;

type RawGame = {
  id: string;
  gameDate: Date;
  status: string;
  phase: string | null;
  season: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: ScheduleTeam;
  awayTeam: ScheduleTeam;
  boxScore: { homeLinescores: unknown; awayLinescores: unknown } | null;
  playerBoxScores: {
    teamAbbr: string;
    playerName: string;
    pts: number | null;
    reb: number | null;
    ast: number | null;
    player: { slug: string } | null;
  }[];
};

type BoxLine = RawGame["playerBoxScores"][number];

/** Plus de points, puis de rebonds, puis de passes ; à égalité parfaite, le premier listé. */
function topScorer(lines: BoxLine[]): GameLeader | null {
  let best: BoxLine | null = null;
  const key = (line: BoxLine) => [line.pts ?? 0, line.reb ?? 0, line.ast ?? 0];
  for (const line of lines) {
    if (line.pts == null) continue;
    if (!best) {
      best = line;
      continue;
    }
    const [a, b] = [key(line), key(best)];
    if (a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])))) best = line;
  }
  if (!best || best.pts == null) return null;
  return { name: best.playerName, slug: best.player?.slug ?? null, pts: best.pts, reb: best.reb ?? 0, ast: best.ast ?? 0 };
}

function toScheduleGame(game: RawGame): ScheduleGame {
  const home = game.playerBoxScores.filter((line) => line.teamAbbr === game.homeTeam.abbr);
  const away = game.playerBoxScores.filter((line) => line.teamAbbr === game.awayTeam.abbr);
  const points = (lines: BoxLine[]) => (lines.length === 0 ? null : lines.reduce((total, line) => total + (line.pts ?? 0), 0));
  const homeLinescores = linescoreValues(game.boxScore?.homeLinescores);
  const awayLinescores = linescoreValues(game.boxScore?.awayLinescores);
  const isFinal = game.status === "final";
  return {
    id: game.id,
    dayKey: dayKeyOf(game.gameDate),
    gameDate: game.gameDate,
    status: game.status,
    phase: game.phase,
    season: game.season,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    periods: homeLinescores && awayLinescores ? Math.max(homeLinescores.length, awayLinescores.length) : null,
    issues: checkScore({
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      homeLinescores,
      awayLinescores,
      homePlayerPoints: points(home),
      awayPlayerPoints: points(away),
    }),
    homeLeader: isFinal ? topScorer(home) : null,
    awayLeader: isFinal ? topScorer(away) : null,
  };
}

export type DayData = {
  key: string;
  games: ScheduleGame[];
  /** Journées avec matchs les plus proches, avant et après. */
  previous: string | null;
  next: string | null;
  /** Nombre de matchs par journée du mois affiché. */
  month: Record<string, number>;
};

export async function loadDay(key: string): Promise<DayData> {
  const { gte, lt } = dayBounds(key);
  const month = monthBounds(key);
  const [games, previous, next, monthGames] = await Promise.all([
    prisma.game.findMany({ where: { gameDate: { gte, lt } }, orderBy: { gameDate: "asc" }, select: gameSelect }),
    prisma.game.findFirst({ where: { gameDate: { lt: gte } }, orderBy: { gameDate: "desc" }, select: { gameDate: true } }),
    prisma.game.findFirst({ where: { gameDate: { gte: lt } }, orderBy: { gameDate: "asc" }, select: { gameDate: true } }),
    prisma.game.findMany({ where: { gameDate: { gte: month.gte, lt: month.lt } }, select: { gameDate: true } }),
  ]);
  const counts: Record<string, number> = {};
  for (const game of monthGames) {
    const day = dayKeyOf(game.gameDate);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return {
    key,
    games: games.map(toScheduleGame),
    previous: previous ? dayKeyOf(previous.gameDate) : null,
    next: next ? dayKeyOf(next.gameDate) : null,
    month: counts,
  };
}

/** Premier jour avec matchs d'un mois, pour les flèches du calendrier. */
export async function firstDayOfMonth(key: string, direction: 1 | -1): Promise<string | null> {
  const { gte, lt } = monthBounds(key);
  const game = await prisma.game.findFirst({
    where: direction === 1 ? { gameDate: { gte: lt } } : { gameDate: { lt: gte } },
    orderBy: { gameDate: direction === 1 ? "asc" : "desc" },
    select: { gameDate: true },
  });
  return game ? dayKeyOf(game.gameDate) : null;
}

export type TeamScheduleData = {
  team: ScheduleTeam;
  season: string;
  games: ScheduleGame[];
  /** Matchs programmés d'une saison suivante (présaison d'octobre, par exemple). */
  later: ScheduleGame[];
};

/**
 * Calendrier d'une équipe : toute la saison en cours (présaison et phases
 * finales comprises, chacune signalée), puis les matchs déjà programmés de la
 * saison suivante.
 */
export async function loadTeamSchedule(abbr: string, now: Date): Promise<TeamScheduleData | null> {
  const team = await prisma.team.findUnique({ where: { abbr: abbr.toUpperCase() }, select: { id: true, ...teamSelect } });
  if (!team) return null;
  const involves = { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] };
  const season = currentSeason();
  const [games, later] = await Promise.all([
    prisma.game.findMany({ where: { ...involves, season }, orderBy: { gameDate: "asc" }, select: gameSelect }),
    prisma.game.findMany({
      where: { ...involves, season: { gt: season }, gameDate: { gte: dayBounds(dayKeyOf(now)).gte } },
      orderBy: { gameDate: "asc" },
      select: gameSelect,
    }),
  ]);
  const publicTeam: ScheduleTeam = {
    abbr: team.abbr,
    city: team.city,
    name: team.name,
    slug: team.slug,
    logoUrl: team.logoUrl,
    primaryColor: team.primaryColor,
  };
  return { team: publicTeam, season, games: games.map(toScheduleGame), later: later.map(toScheduleGame) };
}

export async function loadTeams(): Promise<{ abbr: string; city: string; name: string }[]> {
  return prisma.team.findMany({ orderBy: { abbr: "asc" }, select: { abbr: true, city: true, name: true } });
}
