/**
 * Journées NBA et contrôle des scores, sans accès à la base.
 *
 * Une journée suit la date de New York, comme le calendrier officiel : les
 * matchs du 6 octobre se jouent dans la nuit du 6 au 7 vue de France. La page
 * matchs bascule sur la journée suivante à midi à New York (18 h à Paris) :
 * le matin, un visiteur français retrouve donc les résultats de la nuit.
 */

import { REGULATION_PERIODS } from "./game-status";

export const NBA_TIME_ZONE = "America/New_York";

/** Heure de New York à laquelle la page passe à la journée suivante. */
export const DAY_SWITCH_HOUR = 12;

const DAY_FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;
const HOUR_MS = 3_600_000;

/** Journée NBA au format des adresses : « 2026-10-20 ». */
export function isDayKey(value: string): boolean {
  const match = DAY_FORMAT.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1946 &&
    year <= 2100 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Journée NBA d'un instant : sa date à New York. */
export function dayKeyOf(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: NBA_TIME_ZONE });
}

/** Journée affichée par défaut : la veille jusqu'à midi à New York. */
export function defaultDayKey(now: Date): string {
  return dayKeyOf(new Date(now.getTime() - DAY_SWITCH_HOUR * HOUR_MS));
}

export function shiftDay(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Décalage de New York par rapport à UTC, en heures (−5 l'hiver, −4 l'été). */
const NEW_YORK_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: NBA_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

function newYorkOffsetHours(instant: Date): number {
  const parts = Object.fromEntries(NEW_YORK_PARTS.formatToParts(instant).map((part) => [part.type, Number(part.value)]));
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return Math.round((wall - instant.getTime()) / HOUR_MS);
}

/** Bornes UTC d'une journée de New York, changement d'heure compris. */
export function dayBounds(key: string): { gte: Date; lt: Date } {
  // Premier essai avec le décalage de midi, corrigé par celui de minuit : les
  // jours de changement d'heure, les deux diffèrent.
  const start = (dayKey: string) => {
    const utcMidnight = Date.parse(`${dayKey}T00:00:00Z`);
    const guess = utcMidnight - newYorkOffsetHours(new Date(`${dayKey}T12:00:00Z`)) * HOUR_MS;
    return new Date(utcMidnight - newYorkOffsetHours(new Date(guess)) * HOUR_MS);
  };
  return { gte: start(key), lt: start(shiftDay(key, 1)) };
}

/** Bornes UTC d'un mois de journées : du 1er au dernier jour inclus. */
export function monthBounds(key: string): { gte: Date; lt: Date; first: string } {
  const first = `${key.slice(0, 7)}-01`;
  const [year, month] = first.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  return { gte: dayBounds(first).gte, lt: dayBounds(next).gte, first };
}

/** « mardi 20 octobre 2026 » */
export function dayTitle(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** « 20 oct. » pour les boutons précédent / suivant. */
export function dayShort(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** « mar. 20 oct. » pour les listes de matchs. */
export function dayWithWeekday(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Majuscule initiale seulement : « Mardi 20 octobre », pas « Mardi 20 Octobre ». */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** « octobre 2026 » */
export function monthTitle(key: string): string {
  return new Date(`${key.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Grille d'un mois, semaines du lundi au dimanche. `null` pour les cases qui
 * précèdent le 1er ou suivent le dernier jour.
 */
export function monthGrid(key: string): (string | null)[][] {
  const first = `${key.slice(0, 7)}-01`;
  const [year, month] = first.split("-").map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, index) => shiftDay(first, index)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** « Prol. », « 2 prol. » : `null` sans prolongation ou sans tableau des scores. */
export function overtimeLabel(periods: number | null): string | null {
  if (periods == null || periods <= REGULATION_PERIODS) return null;
  const overtimes = periods - REGULATION_PERIODS;
  return overtimes === 1 ? "Prol." : `${overtimes} prol.`;
}

/** Liste de points par période lue dans le JSON du tableau des scores. */
export function linescoreValues(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const numbers = value.map(Number);
  return numbers.every((n) => Number.isFinite(n)) ? numbers : null;
}

// ── Contrôle des scores ───────────────────────────────────────────────────────

export type ScoreCheckInput = {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeLinescores?: number[] | null;
  awayLinescores?: number[] | null;
  /** Somme des points des joueurs de chaque équipe, si le box score en a. */
  homePlayerPoints?: number | null;
  awayPlayerPoints?: number | null;
};

export type ScoreIssue =
  | "missing_score"
  | "negative_score"
  | "tie"
  | "linescore_mismatch"
  | "linescore_length"
  | "player_points_mismatch";

/**
 * Un score faux ne doit pas s'afficher comme un résultat sûr. Les problèmes
 * bloquants concernent le score lui-même ; un écart de points joueurs vient
 * d'un box score incomplet à la source, le score final reste juste.
 */
export const BLOCKING_SCORE_ISSUES: readonly ScoreIssue[] = [
  "missing_score",
  "negative_score",
  "tie",
  "linescore_mismatch",
  "linescore_length",
];

export const SCORE_ISSUE_LABELS: Record<ScoreIssue, string> = {
  missing_score: "score final absent",
  negative_score: "score négatif",
  tie: "égalité impossible en NBA",
  linescore_mismatch: "la somme des quarts-temps ne donne pas le score final",
  linescore_length: "les deux équipes n'ont pas le même nombre de périodes",
  player_points_mismatch: "les points des joueurs ne donnent pas le score de l'équipe (box score incomplet à la source)",
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Incohérences d'un match terminé ; liste vide pour un match à venir ou cohérent. */
export function checkScore(game: ScoreCheckInput): ScoreIssue[] {
  if (game.status !== "final") return [];
  const { homeScore, awayScore } = game;
  if (homeScore == null || awayScore == null) return ["missing_score"];

  const issues: ScoreIssue[] = [];
  if (homeScore < 0 || awayScore < 0) issues.push("negative_score");
  if (homeScore === awayScore) issues.push("tie");

  const home = game.homeLinescores ?? null;
  const away = game.awayLinescores ?? null;
  if (home && away) {
    if (home.length !== away.length || home.length < REGULATION_PERIODS) issues.push("linescore_length");
    if (sum(home) !== homeScore || sum(away) !== awayScore) issues.push("linescore_mismatch");
  }

  const playerMismatch = (points: number | null | undefined, score: number) =>
    points != null && points > 0 && points !== score;
  if (playerMismatch(game.homePlayerPoints, homeScore) || playerMismatch(game.awayPlayerPoints, awayScore)) {
    issues.push("player_points_mismatch");
  }
  return issues;
}

export function hasBlockingIssue(issues: readonly ScoreIssue[]): boolean {
  return issues.some((issue) => BLOCKING_SCORE_ISSUES.includes(issue));
}

// ── Meilleurs du match ────────────────────────────────────────────────────────

export const LEADER_STATS = [
  { key: "pts", label: "Points" },
  { key: "reb", label: "Rebonds" },
  { key: "ast", label: "Passes" },
] as const;

export type LeaderStat = (typeof LEADER_STATS)[number]["key"];

export type LeaderLine = { name: string; slug: string | null } & Record<LeaderStat, number | null>;

/**
 * Meilleur joueur d'une équipe dans chaque catégorie. Les ex aequo sont tous
 * cités, dans l'ordre du box score ; une catégorie vide (personne au-dessus
 * de zéro) n'a pas de leader.
 */
export function pickLeaders<T extends LeaderLine>(lines: readonly T[]): Record<LeaderStat, { value: number; players: T[] } | null> {
  const result = {} as Record<LeaderStat, { value: number; players: T[] } | null>;
  for (const { key } of LEADER_STATS) {
    const best = Math.max(0, ...lines.map((line) => line[key] ?? 0));
    result[key] = best > 0 ? { value: best, players: lines.filter((line) => line[key] === best) } : null;
  }
  return result;
}

/** Règles publiées sur /sources#matchs. */
export const SCHEDULE_RULES: { title: string; rule: string }[] = [
  {
    title: "Journée NBA",
    rule: "Une journée suit la date de New York, comme le calendrier officiel : les matchs du 9 janvier se jouent dans la nuit du 9 au 10 vue de France. Les heures sont affichées à l'heure de Paris.",
  },
  {
    title: "Journée affichée par défaut",
    rule: `La page bascule sur la journée suivante à midi à New York (18 h à Paris, 17 h pendant les quelques semaines où les changements d'heure ne tombent pas le même jour) : le matin, on retrouve les résultats de la nuit. Les flèches sautent à la journée avec matchs la plus proche.`,
  },
  {
    title: "Statuts",
    rule: "À venir (heure de Paris), en cours, terminé, reporté. Un match passé sans résultat est marqué « résultat en attente » plutôt que « en cours » : hoopstats ne suit pas les matchs en direct, les résultats arrivent à la synchronisation du matin.",
  },
  {
    title: "Prolongations et meilleurs marqueurs",
    rule: "« Prol. » signale un tableau des scores de plus de quatre périodes. Sous chaque score : le meilleur marqueur de chaque équipe (à égalité de points, le plus de rebonds puis de passes). La fiche match détaille les meilleurs en points, rebonds et passes, ex aequo compris.",
  },
  {
    title: "Contrôle des scores",
    rule: "Avant affichage, chaque score final est vérifié : score présent et positif, pas d'égalité, même nombre de périodes pour les deux équipes, somme des quarts-temps égale au score. En cas d'écart, le score est marqué « à vérifier » et aucun vainqueur n'est désigné. Si seuls les points des joueurs ne donnent pas le score (ligne manquante dans le box score ESPN), le score reste valide et la fiche le signale.",
  },
  {
    title: "Calendrier d'une équipe",
    rule: "Toute la saison en cours, présaison et phases finales comprises (chacune signalée), puis les matchs déjà programmés de la saison suivante. Le bilan affiché ne compte que la saison régulière.",
  },
];
