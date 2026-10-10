/**
 * Chargement de « La nuit NBA en chiffres » (accueil). Les règles et calculs
 * purs vivent dans `night.ts` ; ici, seulement les requêtes.
 */

import { prisma } from "@/lib/prisma";
import { isFrench } from "@/lib/french";
import { currentSeason, previousSeason, referenceDate, SEASON_OPENERS, UPCOMING_SEASON } from "@/lib/nba";
import { COMPETITIVE_PHASES, REGULAR_SEASON_PHASE, type GamePhase } from "@/lib/season-phase";
import {
  activeStreaks,
  BIG_GAME_HORIZON_DAYS,
  daysBetween,
  IN_SEASON_WINDOW_DAYS,
  longestWinStreaks,
  nightKey,
  pickBigGame,
  pickProgression,
  pickStreak,
  played,
  PROGRESSION_MIN_GAMES,
  RECENT_GAMES,
  SEASON_PROGRESSION_MIN_GAMES,
  STREAK_MIN_LENGTH,
  topPerformances,
  weightedAverage,
  winRate,
  gameScore,
  type Streak,
} from "./night";

const DAY_MS = 86_400_000;

/** Ligne vide : `played` ne lit que les minutes et le statut DNP. */
const emptyLine = {
  pts: null, reb: null, oreb: null, dreb: null, ast: null, stl: null, blk: null,
  tov: null, pf: null, fgm: null, fga: null, ftm: null, fta: null,
};

const teamSelect = {
  id: true,
  slug: true,
  abbr: true,
  city: true,
  name: true,
  logoUrl: true,
  primaryColor: true,
  secondaryColor: true,
} as const;

const playerSelect = {
  id: true,
  slug: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  country: true,
} as const;

export type NightTeam = {
  id: string;
  slug: string;
  abbr: string;
  city: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
};

export type NightPlayer = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
};

export type NightGame = {
  id: string;
  gameDate: Date;
  phase: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: NightTeam;
  awayTeam: NightTeam;
};

export type NightPerformance = {
  gameId: string;
  playerName: string;
  player: NightPlayer | null;
  teamAbbr: string;
  opponentAbbr: string;
  gameScore: number;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  minutes: string | null;
  // Champs de BoxLine nécessaires à statLine.
  oreb: number | null;
  dreb: number | null;
  tov: number | null;
  pf: number | null;
  fgm: number | null;
  fga: number | null;
  ftm: number | null;
  fta: number | null;
  didNotPlay: boolean;
};

export type NightProgression = {
  mode: "recent" | "season";
  player: NightPlayer;
  before: number;
  after: number;
  delta: number;
  /** Saison de référence (mode « recent ») ou saison d'arrivée (mode « season »). */
  season: string;
  gamesBefore: number;
};

export type NightStreak = {
  mode: "active" | "season";
  season: string;
  team: NightTeam;
  kind: "W" | "L";
  length: number;
  tied: number;
};

export type NightBigGame =
  | {
      kind: "game";
      id: string;
      gameDate: Date;
      phase: string | null;
      homeTeam: NightTeam;
      awayTeam: NightTeam;
      homeRecord: { wins: number; losses: number } | null;
      awayRecord: { wins: number; losses: number } | null;
      recordSeason: string;
      candidates: number;
    }
  | { kind: "opener"; season: string; date: Date };

export type NightData = {
  key: string;
  /** Jours écoulés depuis cette nuit (0 = la journée NBA du jour). */
  age: number;
  phases: GamePhase[];
  games: NightGame[];
  performances: NightPerformance[];
  french: NightPerformance[];
  hasBoxScores: boolean;
  progression: NightProgression | null;
  streak: NightStreak | null;
  bigGame: NightBigGame | null;
  updatedAt: Date | null;
};

/** Phases publiées sur l'accueil : présaison comprise, matchs d'exhibition exclus. */
const NIGHT_PHASES: GamePhase[] = ["preseason", ...COMPETITIVE_PHASES];

export async function loadNight(today: string) {
  const latest = await prisma.game.findFirst({
    where: { status: "final", phase: { in: NIGHT_PHASES } },
    orderBy: { gameDate: "desc" },
    select: { gameDate: true },
  });
  if (!latest) return null;
  const key = nightKey(latest.gameDate);
  const window = await prisma.game.findMany({
    where: {
      status: "final",
      phase: { in: NIGHT_PHASES },
      gameDate: { gte: new Date(latest.gameDate.getTime() - 1.5 * DAY_MS), lte: latest.gameDate },
    },
    orderBy: { gameDate: "asc" },
    select: {
      id: true,
      gameDate: true,
      phase: true,
      homeScore: true,
      awayScore: true,
      homeTeam: { select: teamSelect },
      awayTeam: { select: teamSelect },
      playerBoxScores: {
        select: {
          playerId: true,
          espnAthleteId: true,
          playerName: true,
          teamAbbr: true,
          didNotPlay: true,
          minutes: true,
          pts: true,
          reb: true,
          oreb: true,
          dreb: true,
          ast: true,
          stl: true,
          blk: true,
          tov: true,
          pf: true,
          fgm: true,
          fga: true,
          ftm: true,
          fta: true,
          player: { select: playerSelect },
        },
      },
    },
  });
  const games = window.filter((game) => nightKey(game.gameDate) === key);

  const lines = games.flatMap((game) =>
    game.playerBoxScores.map(({ player, playerId, espnAthleteId, ...line }) => ({
      ...line,
      gameId: game.id,
      playerKey: playerId ?? espnAthleteId ?? line.playerName,
      player: player ? { id: player.id, slug: player.slug, firstName: player.firstName, lastName: player.lastName, photoUrl: player.photoUrl } : null,
      french: player ? isFrench(player) : false,
      opponentAbbr: line.teamAbbr === game.homeTeam.abbr ? game.awayTeam.abbr : game.homeTeam.abbr,
    })),
  );
  const toPerformance = (line: (typeof lines)[number]): NightPerformance => ({
    ...line,
    gameScore: gameScore(line),
  });
  const performances = topPerformances(lines, 3).map(toPerformance);
  const french = lines
    .filter((line) => line.french && played(line))
    .map(toPerformance)
    .sort((a, b) => b.gameScore - a.gameScore);

  return {
    key,
    age: daysBetween(key, today),
    phases: [...new Set(games.map((game) => game.phase as GamePhase))],
    games: games.map((game) => ({
      id: game.id,
      gameDate: game.gameDate,
      phase: game.phase,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
    })),
    performances,
    french,
    hasBoxScores: lines.length > 0,
  };
}

/** Dernier match à enjeu terminé, pour savoir si la saison est « en cours ». */
async function latestGame(phases: GamePhase[]) {
  return prisma.game.findFirst({
    where: { status: "final", phase: { in: phases } },
    orderBy: { gameDate: "desc" },
    select: { gameDate: true, season: true },
  });
}

async function loadRecentProgression(season: string, lastGame: Date): Promise<NightProgression | null> {
  const lines = await prisma.playerBoxScore.findMany({
    where: {
      playerId: { not: null },
      game: {
        season,
        status: "final",
        phase: { in: COMPETITIVE_PHASES },
        gameDate: { gte: new Date(lastGame.getTime() - 30 * DAY_MS) },
      },
    },
    select: {
      playerId: true,
      pts: true,
      minutes: true,
      didNotPlay: true,
      game: { select: { gameDate: true } },
    },
  });
  const byPlayer = new Map<string, { at: number; pts: number }[]>();
  for (const line of lines) {
    if (!line.playerId || !played({ ...emptyLine, ...line })) continue;
    const list = byPlayer.get(line.playerId) ?? [];
    list.push({ at: line.game.gameDate.getTime(), pts: line.pts ?? 0 });
    byPlayer.set(line.playerId, list);
  }
  const recent = new Map<string, number>();
  for (const [playerId, list] of byPlayer) {
    if (list.length < RECENT_GAMES) continue;
    const last = list.sort((a, b) => b.at - a.at).slice(0, RECENT_GAMES);
    recent.set(playerId, last.reduce((total, game) => total + game.pts, 0) / RECENT_GAMES);
  }
  const seasons = await prisma.playerSeason.findMany({
    where: { season, playerId: { in: [...recent.keys()] } },
    select: { playerId: true, gamesPlayed: true, pointsPerGame: true },
  });
  const averages = groupAverages(seasons);
  const best = pickProgression(
    [...averages]
      .filter(([playerId, average]) => average.games >= PROGRESSION_MIN_GAMES && recent.has(playerId))
      .map(([playerId, average]) => ({
        playerKey: playerId,
        before: average.value,
        after: recent.get(playerId)!,
        games: average.games,
      })),
  );
  if (!best) return null;
  const player = await prisma.player.findUnique({ where: { id: best.playerKey }, select: playerSelect });
  return player
    ? { mode: "recent", player, before: best.before, after: best.after, delta: best.delta, season, gamesBefore: best.games }
    : null;
}

function groupAverages(rows: readonly { playerId: string; gamesPlayed: number; pointsPerGame: number }[]) {
  const grouped = new Map<string, { value: number; games: number }[]>();
  for (const row of rows) {
    const list = grouped.get(row.playerId) ?? [];
    list.push({ value: row.pointsPerGame, games: row.gamesPlayed });
    grouped.set(row.playerId, list);
  }
  return new Map([...grouped].map(([playerId, list]) => [playerId, weightedAverage(list)]));
}

async function loadSeasonProgression(season: string): Promise<NightProgression | null> {
  const before = previousSeason(season);
  const rows = await prisma.playerSeason.findMany({
    where: { season: { in: [before, season] } },
    select: { playerId: true, season: true, gamesPlayed: true, pointsPerGame: true },
  });
  const previous = groupAverages(rows.filter((row) => row.season === before));
  const current = groupAverages(rows.filter((row) => row.season === season));
  const best = pickProgression(
    [...current]
      .filter(([playerId, average]) => {
        const old = previous.get(playerId);
        return average.games >= SEASON_PROGRESSION_MIN_GAMES && old != null && old.games >= SEASON_PROGRESSION_MIN_GAMES;
      })
      .map(([playerId, average]) => ({
        playerKey: playerId,
        before: previous.get(playerId)!.value,
        after: average.value,
        games: previous.get(playerId)!.games,
      })),
  );
  if (!best) return null;
  const player = await prisma.player.findUnique({ where: { id: best.playerKey }, select: playerSelect });
  return player
    ? { mode: "season", player, before: best.before, after: best.after, delta: best.delta, season, gamesBefore: best.games }
    : null;
}

async function loadStreak(season: string, active: boolean): Promise<NightStreak | null> {
  const games = await prisma.game.findMany({
    where: { season, status: "final", phase: REGULAR_SEASON_PHASE },
    select: { gameDate: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  });
  let mode: NightStreak["mode"] = "active";
  let picked: { streak: Streak; tied: number } | null = active ? pickStreak(activeStreaks(games), STREAK_MIN_LENGTH) : null;
  if (!picked) {
    mode = "season";
    picked = pickStreak(longestWinStreaks(games), 1);
  }
  if (!picked) return null;
  const team = await prisma.team.findUnique({ where: { id: picked.streak.teamId }, select: teamSelect });
  return team ? { mode, season, team, kind: picked.streak.kind, length: picked.streak.length, tied: picked.tied } : null;
}

async function loadBigGame(now: Date): Promise<NightBigGame | null> {
  let recordSeason = currentSeason(now);
  const upcoming = await prisma.game.findMany({
    where: { status: "scheduled", gameDate: { gte: now, lte: new Date(now.getTime() + BIG_GAME_HORIZON_DAYS * DAY_MS) } },
    select: {
      id: true,
      gameDate: true,
      phase: true,
      homeTeam: { select: teamSelect },
      awayTeam: { select: teamSelect },
    },
  });
  if (upcoming.length === 0) {
    const opener = SEASON_OPENERS[UPCOMING_SEASON];
    return opener && Date.parse(opener) > now.getTime()
      ? { kind: "opener", season: UPCOMING_SEASON, date: new Date(opener) }
      : null;
  }
  const teamIds = [...new Set(upcoming.flatMap((game) => [game.homeTeam.id, game.awayTeam.id]))];
  const recordsOf = async (season: string) =>
    new Map(
      (
        await prisma.teamSeason.findMany({
          where: { season, teamId: { in: teamIds } },
          select: { teamId: true, wins: true, losses: true },
        })
      ).map((row) => [row.teamId, { wins: row.wins, losses: row.losses }]),
    );
  // Avant le premier match de la saison, tous les bilans sont vides ou à 0-0 :
  // on départage sur la saison précédente.
  let records = await recordsOf(recordSeason);
  if (![...records.values()].some((r) => r.wins + r.losses > 0)) {
    recordSeason = previousSeason(recordSeason);
    records = await recordsOf(recordSeason);
  }
  const rate = (teamId: string) => {
    const record = records.get(teamId);
    return record ? winRate(record.wins, record.losses) : null;
  };
  const best = pickBigGame(
    upcoming.map((game) => ({ ...game, homeRate: rate(game.homeTeam.id), awayRate: rate(game.awayTeam.id) })),
  );
  if (!best) return null;
  return {
    kind: "game",
    id: best.id,
    gameDate: best.gameDate,
    phase: best.phase,
    homeTeam: best.homeTeam,
    awayTeam: best.awayTeam,
    homeRecord: records.get(best.homeTeam.id) ?? null,
    awayRecord: records.get(best.awayTeam.id) ?? null,
    recordSeason,
    candidates: upcoming.length,
  };
}

export async function loadNightData(): Promise<NightData | null> {
  const now = referenceDate();
  const today = nightKey(now);
  const [night, competitive, regular, bigGame, lastSync] = await Promise.all([
    loadNight(today),
    latestGame(COMPETITIVE_PHASES),
    latestGame([REGULAR_SEASON_PHASE]),
    loadBigGame(now),
    prisma.syncLog.findFirst({
      where: { source: { in: ["sync-daily", "sync-box-scores"] }, status: { in: ["success", "partial"] } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
  ]);
  if (!night) return null;

  const isRecent = (game: { gameDate: Date } | null) =>
    game != null && daysBetween(nightKey(game.gameDate), today) <= IN_SEASON_WINDOW_DAYS;
  const [progression, streak] = await Promise.all([
    competitive && isRecent(competitive)
      ? loadRecentProgression(competitive.season, competitive.gameDate)
      : regular
        ? loadSeasonProgression(regular.season)
        : null,
    regular ? loadStreak(regular.season, isRecent(regular)) : null,
  ]);

  return { ...night, progression, streak, bigGame, updatedAt: lastSync?.completedAt ?? null };
}
