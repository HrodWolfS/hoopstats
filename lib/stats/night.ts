/**
 * « La nuit NBA en chiffres » : règles de l'accueil.
 *
 * Tout ce que l'accueil met en avant sort de ces fonctions, à partir des
 * matchs et box scores en base. Aucune carte n'est saisie à la main ; chacune
 * dit pourquoi elle est là, et la page Sources reprend les mêmes règles
 * (`NIGHT_RULES`).
 */

import { parseMinutes } from "@/lib/stats/season-aggregation";

/** Fuseau des dates de match : une « nuit » est une journée NBA, heure de New York. */
const NBA_TIME_ZONE = "America/New_York";

/** Journée NBA d'un match (« 2026-10-06 »), au fuseau de New York. */
export function nightKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: NBA_TIME_ZONE });
}

/**
 * Nuit vue de France : les matchs du 6 octobre à New York se jouent dans la
 * nuit du 6 au 7. « nuit du 6 au 7 octobre », ou à cheval sur deux mois.
 */
export function nightLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 12));
  const end = new Date(Date.UTC(year, month - 1, day + 1, 12));
  const fmt = (date: Date, withMonth: boolean) =>
    date.toLocaleDateString("fr-FR", {
      day: "numeric",
      ...(withMonth ? { month: "long" } : {}),
      timeZone: "UTC",
    });
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return `nuit du ${fmt(start, !sameMonth)} au ${fmt(end, true)}`;
}

/** Nombre de jours entre deux journées NBA (« 2026-10-01 » → « 2026-10-07 » = 6). */
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / 86_400_000);
}

// ── Performances ─────────────────────────────────────────────────────────────

export type BoxLine = {
  pts: number | null;
  reb: number | null;
  oreb: number | null;
  dreb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  pf: number | null;
  fgm: number | null;
  fga: number | null;
  ftm: number | null;
  fta: number | null;
  minutes: string | null;
  didNotPlay: boolean;
};

/**
 * Game Score de John Hollinger : une note de match sur l'échelle des points.
 * PTS + 0,4 FGM − 0,7 FGA − 0,4 (FTA − FTM) + 0,7 OREB + 0,3 DREB + STL
 * + 0,7 AST + 0,7 BLK − 0,4 PF − TOV. Sans le détail des rebonds, le total
 * compte au tarif défensif.
 */
export function gameScore(line: BoxLine): number {
  const n = (value: number | null) => value ?? 0;
  const rebounds =
    line.oreb == null && line.dreb == null
      ? 0.3 * n(line.reb)
      : 0.7 * n(line.oreb) + 0.3 * n(line.dreb);
  return (
    n(line.pts) +
    0.4 * n(line.fgm) -
    0.7 * n(line.fga) -
    0.4 * (n(line.fta) - n(line.ftm)) +
    rebounds +
    n(line.stl) +
    0.7 * n(line.ast) +
    0.7 * n(line.blk) -
    0.4 * n(line.pf) -
    n(line.tov)
  );
}

/** A joué : pas DNP et au moins une seconde sur le parquet. */
export function played(line: BoxLine): boolean {
  return !line.didNotPlay && parseMinutes(line.minutes) > 0;
}

/**
 * Les `limit` meilleures lignes au Game Score, un seul match par joueur.
 * Égalité : plus de points, puis ordre alphabétique pour un rendu stable.
 */
export function topPerformances<T extends BoxLine & { playerKey: string; playerName: string }>(
  lines: readonly T[],
  limit = 3,
): (T & { gameScore: number })[] {
  const seen = new Set<string>();
  return lines
    .filter(played)
    .map((line) => ({ ...line, gameScore: gameScore(line) }))
    .sort(
      (a, b) =>
        b.gameScore - a.gameScore ||
        (b.pts ?? 0) - (a.pts ?? 0) ||
        a.playerName.localeCompare(b.playerName, "fr"),
    )
    .filter((line) => (seen.has(line.playerKey) ? false : (seen.add(line.playerKey), true)))
    .slice(0, limit);
}

/** « 31 pts, 12 reb, 8 pd » : points toujours, le reste à partir de 5. */
export function statLine(line: BoxLine): string {
  const parts = [`${line.pts ?? 0} pts`];
  if ((line.reb ?? 0) >= 5) parts.push(`${line.reb} reb`);
  if ((line.ast ?? 0) >= 5) parts.push(`${line.ast} pd`);
  if ((line.stl ?? 0) >= 3) parts.push(`${line.stl} int`);
  if ((line.blk ?? 0) >= 3) parts.push(`${line.blk} ctr`);
  return parts.join(", ");
}

// ── Séries ───────────────────────────────────────────────────────────────────

export type ResultGame = {
  gameDate: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type Streak = { teamId: string; kind: "W" | "L"; length: number; endedAt: Date };

function resultsByTeam(games: readonly ResultGame[]): Map<string, { won: boolean; at: Date }[]> {
  const byTeam = new Map<string, { won: boolean; at: Date }[]>();
  const push = (teamId: string, won: boolean, at: Date) => {
    const list = byTeam.get(teamId) ?? [];
    list.push({ won, at });
    byTeam.set(teamId, list);
  };
  const sorted = [...games]
    .filter((game) => game.homeScore != null && game.awayScore != null && game.homeScore !== game.awayScore)
    .sort((a, b) => a.gameDate.getTime() - b.gameDate.getTime());
  for (const game of sorted) {
    const homeWon = game.homeScore! > game.awayScore!;
    push(game.homeTeamId, homeWon, game.gameDate);
    push(game.awayTeamId, !homeWon, game.gameDate);
  }
  return byTeam;
}

/** Série en cours de chaque équipe, à la date de son dernier match. */
export function activeStreaks(games: readonly ResultGame[]): Streak[] {
  return [...resultsByTeam(games)].map(([teamId, results]) => {
    const last = results[results.length - 1];
    let length = 0;
    for (let i = results.length - 1; i >= 0 && results[i].won === last.won; i--) length++;
    return { teamId, kind: last.won ? "W" : "L", length, endedAt: last.at };
  });
}

/** Plus longue série de victoires de chaque équipe sur l'ensemble des matchs. */
export function longestWinStreaks(games: readonly ResultGame[]): Streak[] {
  return [...resultsByTeam(games)].map(([teamId, results]) => {
    let best: Streak = { teamId, kind: "W", length: 0, endedAt: results[0].at };
    let run = 0;
    for (const result of results) {
      run = result.won ? run + 1 : 0;
      // « >= » : à longueur égale, la série la plus récente.
      if (run > 0 && run >= best.length) best = { teamId, kind: "W", length: run, endedAt: result.at };
    }
    return best;
  });
}

/**
 * Série à mettre en avant : la plus longue, victoires d'abord à longueur
 * égale, puis la plus récente. Renvoie aussi le nombre d'ex aequo.
 */
export function pickStreak(streaks: readonly Streak[], minLength: number): { streak: Streak; tied: number } | null {
  const eligible = streaks
    .filter((streak) => streak.length >= minLength)
    .sort(
      (a, b) =>
        b.length - a.length ||
        (a.kind === b.kind ? 0 : a.kind === "W" ? -1 : 1) ||
        b.endedAt.getTime() - a.endedAt.getTime(),
    );
  const streak = eligible[0];
  if (!streak) return null;
  const tied = eligible.filter((other) => other.length === streak.length && other.kind === streak.kind).length - 1;
  return { streak, tied };
}

// ── Progression ──────────────────────────────────────────────────────────────

export type ProgressionCandidate = {
  playerKey: string;
  before: number;
  after: number;
};

/** Plus forte hausse `after − before`, ou null si personne ne progresse. */
export function pickProgression<T extends ProgressionCandidate>(candidates: readonly T[]): (T & { delta: number }) | null {
  const best = candidates
    .map((candidate) => ({ ...candidate, delta: candidate.after - candidate.before }))
    .sort((a, b) => b.delta - a.delta)[0];
  return best && best.delta > 0 ? best : null;
}

/** Moyenne pondérée par les matchs joués (saison passée dans plusieurs équipes). */
export function weightedAverage(rows: readonly { value: number; games: number }[]): { value: number; games: number } {
  const games = rows.reduce((total, row) => total + row.games, 0);
  if (games === 0) return { value: 0, games: 0 };
  return { value: rows.reduce((total, row) => total + row.value * row.games, 0) / games, games };
}

// ── Affiche à venir ──────────────────────────────────────────────────────────

/** Pourcentage de victoires, null sans match joué. */
export function winRate(wins: number, losses: number): number | null {
  return wins + losses === 0 ? null : wins / (wins + losses);
}

/**
 * Affiche la plus relevée : meilleur bilan cumulé des deux équipes. Une
 * équipe sans bilan compte pour 50 %. Égalité : le match le plus proche.
 */
export function pickBigGame<T extends { gameDate: Date; homeRate: number | null; awayRate: number | null }>(
  games: readonly T[],
): T | null {
  const strength = (game: T) => (game.homeRate ?? 0.5) + (game.awayRate ?? 0.5);
  return (
    [...games].sort((a, b) => strength(b) - strength(a) || a.gameDate.getTime() - b.gameDate.getTime())[0] ?? null
  );
}

// ── Règles publiques ─────────────────────────────────────────────────────────

/** Fenêtre « en cours de saison » : un match à enjeu joué il y a 10 jours au plus. */
export const IN_SEASON_WINDOW_DAYS = 10;
/** Matchs récents comparés à la moyenne de saison. */
export const RECENT_GAMES = 5;
/** Matchs de saison régulière exigés pour comparer à une moyenne. */
export const PROGRESSION_MIN_GAMES = 15;
/** Matchs exigés sur chacune des deux saisons pour la progression d'une saison à l'autre. */
export const SEASON_PROGRESSION_MIN_GAMES = 40;
/** Longueur minimale d'une série en cours pour être citée. */
export const STREAK_MIN_LENGTH = 3;
/** Horizon de l'affiche à venir. */
export const BIG_GAME_HORIZON_DAYS = 7;

export const NIGHT_RULES: { title: string; rule: string }[] = [
  {
    title: "La nuit",
    rule: "La dernière journée NBA terminée (heure de New York), présaison comprise, avec tous ses résultats et leurs box scores.",
  },
  {
    title: "Performances majeures",
    rule: "Les trois meilleurs Game Score (John Hollinger) de cette nuit, un match par joueur : PTS + 0,4 FGM − 0,7 FGA − 0,4 (FTA − FTM) + 0,7 OREB + 0,3 DREB + STL + 0,7 AST + 0,7 BLK − 0,4 PF − TOV.",
  },
  {
    title: "Joueurs français",
    rule: "Tous les joueurs français entrés en jeu cette nuit, classés au Game Score. Est français un joueur dont la fiche NBA.com indique la France, ou un international français que NBA.com rattache à un autre pays (voir les règles du hub Français en NBA).",
  },
  {
    title: "Progression",
    rule: `En saison : plus forte hausse de points entre les ${RECENT_GAMES} derniers matchs à enjeu et la moyenne de saison régulière (${PROGRESSION_MIN_GAMES} matchs minimum). Hors saison : plus forte hausse de points par match d'une saison régulière à la suivante (${SEASON_PROGRESSION_MIN_GAMES} matchs minimum sur chacune).`,
  },
  {
    title: "Série",
    rule: `En saison : la plus longue série en cours en saison régulière (${STREAK_MIN_LENGTH} matchs minimum). Hors saison : la plus longue série de victoires de la dernière saison régulière.`,
  },
  {
    title: "Affiche à venir",
    rule: `Parmi les matchs des ${BIG_GAME_HORIZON_DAYS} prochains jours, celui dont les deux équipes ont le meilleur bilan cumulé sur la saison en cours, ou sur la précédente tant qu'aucun match de la nouvelle saison n'a été joué.`,
  },
];
