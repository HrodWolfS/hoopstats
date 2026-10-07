/**
 * Tendances récentes : les N derniers matchs d'un joueur face à sa saison.
 *
 * Module pur : il reçoit les lignes de box score déjà filtrées sur une saison
 * régulière et rend, pour chaque fenêtre, les joueurs comparables. Les règles
 * publiques (`TREND_RULES`) sont reprises telles quelles par la page Sources.
 */

import { parseMinutes } from "@/lib/stats/season-aggregation";

export const TREND_WINDOWS = [5, 10, 20] as const;
export type TrendWindow = (typeof TREND_WINDOWS)[number];
export const DEFAULT_TREND_WINDOW: TrendWindow = 10;

/** Une fenêtre ne couvre jamais plus de la moitié des matchs joués de la saison. */
export const SEASON_GAMES_FACTOR = 2;
/** Temps de jeu minimal, sur la fenêtre ou sur la saison : écarte les fins de banc. */
export const MIN_MINUTES = 15;
/** Tentatives de tir vraies (FGA + 0,44 FTA) par match exigées pour juger l'efficacité. */
export const MIN_TS_ATTEMPTS_PER_GAME = 5;
/** Un joueur absent depuis plus longtemps n'a pas de forme « récente ». */
export const RECENT_DAYS = 14;

export type TrendLine = {
  playerId: string;
  gameDate: Date;
  teamAbbr: string;
  starter: boolean;
  didNotPlay: boolean;
  minutes: string | null;
  pts: number | null;
  fga: number | null;
  fta: number | null;
};

export type TrendTotals = {
  games: number;
  minutes: number;
  pts: number;
  fga: number;
  fta: number;
  starts: number;
};

export type TrendAverages = {
  min: number;
  pts: number;
  fga: number;
  /** Null sous le seuil de volume : une adresse sur 3 tirs ne dit rien. */
  ts: number | null;
  startRate: number;
};

export type PlayerTrend = {
  playerId: string;
  window: TrendWindow;
  /** Équipe du dernier match joué. */
  teamAbbr: string;
  /** Plusieurs équipes sur la saison (transfert). */
  multiTeam: boolean;
  from: Date;
  to: Date;
  recent: TrendAverages;
  season: TrendAverages & { games: number };
};

/** Le joueur était sur le parquet : pas DNP, au moins une seconde jouée. */
export function playedLine(line: Pick<TrendLine, "didNotPlay" | "minutes">): boolean {
  return !line.didNotPlay && parseMinutes(line.minutes) > 0;
}

export function sumLines(lines: readonly TrendLine[]): TrendTotals {
  const totals: TrendTotals = { games: 0, minutes: 0, pts: 0, fga: 0, fta: 0, starts: 0 };
  for (const line of lines) {
    totals.games += 1;
    totals.minutes += parseMinutes(line.minutes);
    totals.pts += line.pts ?? 0;
    totals.fga += line.fga ?? 0;
    totals.fta += line.fta ?? 0;
    if (line.starter) totals.starts += 1;
  }
  return totals;
}

export function averages(totals: TrendTotals): TrendAverages {
  const games = totals.games || 1;
  const tsAttempts = totals.fga + 0.44 * totals.fta;
  return {
    min: totals.minutes / games,
    pts: totals.pts / games,
    fga: totals.fga / games,
    ts: tsAttempts >= MIN_TS_ATTEMPTS_PER_GAME * totals.games && tsAttempts > 0 ? totals.pts / (2 * tsAttempts) : null,
    startRate: totals.starts / games,
  };
}

/**
 * Tendances d'une fenêtre pour tous les joueurs. `lastGameDate` est la
 * dernière journée de saison régulière en base : la référence du « récent ».
 */
export function computeTrends(lines: readonly TrendLine[], window: TrendWindow, lastGameDate: Date): PlayerTrend[] {
  const byPlayer = new Map<string, TrendLine[]>();
  for (const line of lines) {
    if (!playedLine(line)) continue;
    const list = byPlayer.get(line.playerId) ?? [];
    list.push(line);
    byPlayer.set(line.playerId, list);
  }

  const recentLimit = lastGameDate.getTime() - RECENT_DAYS * 86_400_000;
  const trends: PlayerTrend[] = [];
  for (const [playerId, played] of byPlayer) {
    if (played.length < SEASON_GAMES_FACTOR * window) continue;
    played.sort((a, b) => b.gameDate.getTime() - a.gameDate.getTime());
    if (played[0].gameDate.getTime() < recentLimit) continue;

    const windowLines = played.slice(0, window);
    const recent = averages(sumLines(windowLines));
    const season = averages(sumLines(played));
    if (Math.max(recent.min, season.min) < MIN_MINUTES) continue;

    trends.push({
      playerId,
      window,
      teamAbbr: played[0].teamAbbr,
      multiTeam: new Set(played.map((line) => line.teamAbbr)).size > 1,
      from: windowLines[windowLines.length - 1].gameDate,
      to: windowLines[0].gameDate,
      recent,
      season: { ...season, games: played.length },
    });
  }
  return trends;
}

// ── Tri ──────────────────────────────────────────────────────────────────────

export const TREND_SORTS = ["pts", "min", "fga", "ts"] as const;
export type TrendSort = (typeof TREND_SORTS)[number];
export type TrendDirection = "hausse" | "baisse";

export const TREND_SORT_LABELS: Record<TrendSort, { short: string; long: string; family: string }> = {
  pts: { short: "PTS", long: "Points par match", family: "Volume" },
  fga: { short: "TIRS", long: "Tirs tentés par match", family: "Volume" },
  ts: { short: "TS%", long: "True shooting %", family: "Efficacité" },
  min: { short: "MIN", long: "Minutes par match", family: "Temps de jeu" },
};

/** Écart fenêtre − saison, null si l'une des deux valeurs manque. */
export function trendDelta(trend: Pick<PlayerTrend, "recent" | "season">, sort: TrendSort): number | null {
  const recent = trend.recent[sort];
  const season = trend.season[sort];
  return recent == null || season == null ? null : recent - season;
}

/** Plus forte hausse (ou baisse) d'abord ; les écarts inconnus sont écartés. */
export function sortTrends<T extends Pick<PlayerTrend, "recent" | "season"> & { name: string }>(
  trends: readonly T[],
  sort: TrendSort,
  direction: TrendDirection,
): T[] {
  const sign = direction === "hausse" ? -1 : 1;
  return trends
    .filter((trend) => trendDelta(trend, sort) != null)
    .sort((a, b) => sign * (trendDelta(a, sort)! - trendDelta(b, sort)!) || a.name.localeCompare(b.name, "fr"));
}

export function parseTrendWindow(value: string | null): TrendWindow {
  const window = Number(value);
  return (TREND_WINDOWS as readonly number[]).includes(window) ? (window as TrendWindow) : DEFAULT_TREND_WINDOW;
}

export function parseTrendSort(value: string | null): TrendSort {
  return (TREND_SORTS as readonly string[]).includes(value ?? "") ? (value as TrendSort) : "pts";
}

export function parseTrendDirection(value: string | null): TrendDirection {
  return value === "baisse" ? "baisse" : "hausse";
}

// ── Règles publiques ─────────────────────────────────────────────────────────

export const TREND_RULES: { title: string; rule: string }[] = [
  {
    title: "Fenêtres",
    rule: `Les ${TREND_WINDOWS.join(", ")} derniers matchs joués en saison régulière, comparés à la moyenne de tous les matchs joués de la même saison, calculées sur les box scores.`,
  },
  {
    title: "Matchs non joués",
    rule: "Un match où le joueur n'est pas entré en jeu (DNP, absence, blessure) ne compte ni dans la fenêtre ni dans la saison : la fenêtre remonte jusqu'à réunir N matchs joués.",
  },
  {
    title: "Échantillon minimal",
    rule: `Au moins ${SEASON_GAMES_FACTOR} fois la fenêtre en matchs joués sur la saison, ${MIN_MINUTES} minutes par match sur la fenêtre ou sur la saison, et un dernier match joué moins de ${RECENT_DAYS} jours avant la dernière journée de saison régulière en base.`,
  },
  {
    title: "Efficacité",
    rule: `True shooting % = PTS / (2 × (FGA + 0,44 FTA)), affiché seulement à partir de ${MIN_TS_ATTEMPTS_PER_GAME} tentatives par match sur la période : une adresse sur trois tirs ne dit rien.`,
  },
  {
    title: "Transferts",
    rule: "Les matchs de toutes les équipes de la saison sont cumulés. L'équipe affichée est celle du dernier match joué ; « 2 éq. » signale un transfert en cours de saison.",
  },
];
