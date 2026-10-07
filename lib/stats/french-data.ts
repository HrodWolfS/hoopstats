/**
 * Données du hub « Français en NBA ». La règle d'inclusion vit dans
 * `lib/french.ts` ; ici, seulement les requêtes et l'assemblage.
 */

import { prisma } from "@/lib/prisma";
import { currentSeason, previousSeason, referenceDate } from "@/lib/nba";
import { FRENCH_PLAYER_WHERE, FRENCH_SCHEDULE_DAYS } from "@/lib/french";
import { computeCareerAverages, type CareerAverages } from "@/lib/stats/career";
import { MULTI_TEAM_ABBR } from "@/lib/stats/season-consolidation";
import { consolidateSeasonRows } from "@/lib/stats/season-totals";
import { loadNight, type NightPerformance } from "@/lib/stats/night-data";
import { nightKey } from "@/lib/stats/night";
import { loadTrends, trendSeasons, type TrendRow } from "@/lib/stats/trends-data";
import { DEFAULT_TREND_WINDOW } from "@/lib/stats/trends";

const DAY_MS = 86_400_000;

const teamSelect = { abbr: true, slug: true, primaryColor: true, secondaryColor: true } as const;

export type FrenchTeam = { abbr: string; slug: string; primaryColor: string; secondaryColor: string };

export type FrenchPlayer = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  position: string | null;
  photoUrl: string | null;
};

export type FrenchSeasonRow = {
  player: FrenchPlayer;
  /** Équipe principale de la saison (le plus de matchs). */
  team: FrenchTeam;
  isMultiTeam: boolean;
  gamesPlayed: number;
  minutesPerGame: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  trueShooting: number | null;
};

export type FrenchCareerRow = {
  player: FrenchPlayer;
  first: string;
  last: string;
  career: CareerAverages;
  active: boolean;
};

export type FrenchGame = {
  id: string;
  gameDate: Date;
  phase: string | null;
  homeTeam: FrenchTeam;
  awayTeam: FrenchTeam;
  players: FrenchPlayer[];
};

export type FrenchHubData = {
  season: string;
  seasonRows: FrenchSeasonRow[];
  history: FrenchCareerRow[];
  night: { key: string; performances: NightPerformance[] } | null;
  schedule: FrenchGame[];
  trends: { season: string; window: number; rows: TrendRow[] } | null;
  /** Équipe du dernier match en base de chaque actif, par id joueur. */
  currentTeams: Record<string, FrenchTeam>;
};

export async function loadFrenchHub(): Promise<FrenchHubData> {
  const players = await prisma.player.findMany({
    where: FRENCH_PLAYER_WHERE,
    select: {
      id: true,
      slug: true,
      firstName: true,
      lastName: true,
      position: true,
      photoUrl: true,
      seasons: {
        select: {
          playerId: true,
          season: true,
          gamesPlayed: true,
          minutesPerGame: true,
          pointsPerGame: true,
          reboundsPerGame: true,
          assistsPerGame: true,
          stealsPerGame: true,
          blocksPerGame: true,
          fgPct: true,
          threePtPct: true,
          ftPct: true,
          trueShooting: true,
          team: { select: teamSelect },
        },
      },
    },
  });
  const played = players.filter((player) => player.seasons.some((row) => row.gamesPlayed > 0));
  const identity = (player: (typeof played)[number]): FrenchPlayer => ({
    id: player.id,
    slug: player.slug,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    photoUrl: player.photoUrl,
  });
  const byId = new Map(played.map((player) => [player.id, identity(player)]));

  // Saison affichée : la saison en cours, ou la précédente tant qu'aucun Français n'y a joué.
  const live = currentSeason();
  const hasRows = (season: string) => played.some((player) => player.seasons.some((row) => row.season === season));
  const season = hasRows(live) ? live : previousSeason(live);

  const seasonStints = played.flatMap((player) => player.seasons.filter((row) => row.season === season && row.gamesPlayed > 0));
  const seasonRows: FrenchSeasonRow[] = (await consolidateSeasonRows(season, seasonStints)).map((row) => ({
    player: byId.get(row.playerId)!,
    team: row.team,
    isMultiTeam: row.isMultiTeam,
    gamesPlayed: row.gamesPlayed,
    minutesPerGame: row.minutesPerGame,
    pointsPerGame: row.pointsPerGame,
    reboundsPerGame: row.reboundsPerGame,
    assistsPerGame: row.assistsPerGame,
    trueShooting: row.trueShooting,
  }));
  const activeIds = new Set(seasonRows.map((row) => row.player.id));

  const history: FrenchCareerRow[] = played
    .map((player) => {
      const stints = player.seasons.filter((row) => row.gamesPlayed > 0);
      const seasons = stints.map((row) => row.season).sort();
      return {
        player: identity(player),
        first: seasons[0],
        last: seasons[seasons.length - 1],
        career: computeCareerAverages(stints.map((row) => ({ ...row, teamAbbr: row.team.abbr }))),
        active: activeIds.has(player.id),
      };
    })
    .sort((a, b) => a.first.localeCompare(b.first) || a.player.lastName.localeCompare(b.player.lastName, "fr"));

  const now = referenceDate();
  const [currentTeams, night, trends] = await Promise.all([
    loadCurrentTeams([...activeIds], seasonRows),
    loadNight(nightKey(now)),
    loadFrenchTrends(season, activeIds),
  ]);
  const schedule = await loadSchedule(now, currentTeams, byId);

  return {
    season,
    seasonRows,
    history,
    night: night ? { key: night.key, performances: night.french } : null,
    schedule,
    trends,
    currentTeams,
  };
}

/** Équipe du dernier match en base (présaison comprise), sinon équipe principale de la saison. */
async function loadCurrentTeams(ids: string[], seasonRows: FrenchSeasonRow[]): Promise<Record<string, FrenchTeam>> {
  const teams: Record<string, FrenchTeam> = {};
  for (const row of seasonRows) if (!row.isMultiTeam) teams[row.player.id] = row.team;
  if (ids.length === 0) return teams;
  const lines = await prisma.playerBoxScore.findMany({
    where: { playerId: { in: ids }, game: { status: "final" } },
    select: { playerId: true, teamAbbr: true, game: { select: { gameDate: true } } },
    orderBy: { game: { gameDate: "desc" } },
  });
  const latest = new Map<string, string>();
  for (const line of lines) if (line.playerId && !latest.has(line.playerId)) latest.set(line.playerId, line.teamAbbr);
  const byAbbr = new Map(
    (await prisma.team.findMany({ where: { abbr: { in: [...new Set(latest.values())] } }, select: teamSelect })).map(
      (team) => [team.abbr, team],
    ),
  );
  for (const [playerId, abbr] of latest) {
    const team = byAbbr.get(abbr);
    if (team) teams[playerId] = team;
  }
  return teams;
}

async function loadSchedule(
  now: Date,
  currentTeams: Record<string, FrenchTeam>,
  players: Map<string, FrenchPlayer>,
): Promise<FrenchGame[]> {
  const playersByTeam = new Map<string, FrenchPlayer[]>();
  for (const [playerId, team] of Object.entries(currentTeams)) {
    const player = players.get(playerId);
    if (!player) continue;
    playersByTeam.set(team.abbr, [...(playersByTeam.get(team.abbr) ?? []), player]);
  }
  if (playersByTeam.size === 0) return [];
  const abbrs = [...playersByTeam.keys()];
  const games = await prisma.game.findMany({
    where: {
      status: "scheduled",
      gameDate: { gte: now, lte: new Date(now.getTime() + FRENCH_SCHEDULE_DAYS * DAY_MS) },
      OR: [{ homeTeam: { abbr: { in: abbrs } } }, { awayTeam: { abbr: { in: abbrs } } }],
    },
    orderBy: { gameDate: "asc" },
    select: { id: true, gameDate: true, phase: true, homeTeam: { select: teamSelect }, awayTeam: { select: teamSelect } },
  });
  const byName = (a: FrenchPlayer, b: FrenchPlayer) => a.lastName.localeCompare(b.lastName, "fr");
  return games.map((game) => ({
    ...game,
    players: [...(playersByTeam.get(game.awayTeam.abbr) ?? []), ...(playersByTeam.get(game.homeTeam.abbr) ?? [])].sort(byName),
  }));
}

async function loadFrenchTrends(season: string, ids: Set<string>): Promise<FrenchHubData["trends"]> {
  if (!(await trendSeasons()).includes(season)) return null;
  const data = await loadTrends(season);
  const rows = data.windows[DEFAULT_TREND_WINDOW]
    .filter((row) => ids.has(row.playerId))
    .sort((a, b) => b.recent.pts - b.season.pts - (a.recent.pts - a.season.pts));
  return { season, window: DEFAULT_TREND_WINDOW, rows };
}

export { MULTI_TEAM_ABBR };
