/**
 * Statut d'un match et correspondance avec les états publiés par ESPN.
 *
 * Le fourre-tout historique — « tout ce qui n'est ni terminé ni programmé est
 * en cours » — classait les matchs reportés parmi les matchs en cours. Un
 * report survenu il y a six mois s'affichait alors comme une rencontre live.
 */

export const GAME_STATUSES = [
  "scheduled",
  "in_progress",
  "final",
  "postponed",
] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

/** États ESPN signalant un match qui ne sera pas joué à la date prévue. */
const ESPN_POSTPONED = new Set([
  "STATUS_POSTPONED",
  "STATUS_CANCELED",
  "STATUS_SUSPENDED",
  "STATUS_DELAYED",
  "STATUS_RAIN_DELAY",
]);

/**
 * Traduit un `status.type.name` ESPN en statut interne.
 *
 * Un nom inconnu est traité comme « en cours » : c'est le seul état dont
 * l'affichage se corrige de lui-même à la synchronisation suivante, tant que
 * le match est récent. Les reports, eux, ne sont jamais revisités.
 */
export function gameStatusFromEspn(statusName: string | null | undefined): GameStatus {
  if (statusName === "STATUS_FINAL") return "final";
  if (statusName === "STATUS_SCHEDULED") return "scheduled";
  if (statusName != null && ESPN_POSTPONED.has(statusName)) return "postponed";
  return "in_progress";
}

/** Libellé français court, pour les listes et les fiches match. */
export function gameStatusLabel(status: string): string | null {
  switch (status) {
    case "final":
      return "Final";
    case "in_progress":
      return "En cours";
    case "postponed":
      return "Reporté";
    default:
      return null;
  }
}

/**
 * Un match dont la date est passée devrait être terminé ou reporté.
 *
 * La marge absorbe les rencontres en cours au moment de la synchronisation :
 * un match commencé la veille peut légitimement être encore `in_progress`.
 */
export function isStaleStatus(
  status: string,
  gameDate: Date,
  now: Date,
  graceHours = 24,
): boolean {
  if (status === "final" || status === "postponed") return false;
  return now.getTime() - gameDate.getTime() > graceHours * 60 * 60 * 1000;
}

/** Auto-contrôles exécutés par `pnpm health:data`. */
export function validateGameStatus(): string[] {
  const errors: string[] = [];

  if (gameStatusFromEspn("STATUS_POSTPONED") !== "postponed") {
    errors.push("un match reporté n'est pas reconnu comme tel");
  }
  if (gameStatusFromEspn("STATUS_FINAL") !== "final") {
    errors.push("un match terminé n'est pas reconnu comme tel");
  }
  if (gameStatusFromEspn("STATUS_SCHEDULED") !== "scheduled") {
    errors.push("un match programmé n'est pas reconnu comme tel");
  }
  if (gameStatusFromEspn("STATUS_HALFTIME") !== "in_progress") {
    errors.push("la mi-temps devrait rester un match en cours");
  }
  if (gameStatusFromEspn(null) !== "in_progress") {
    errors.push("un statut absent devrait rester un match en cours");
  }

  const now = new Date("2026-08-05T12:00:00Z");
  const oldGame = new Date("2026-01-09T00:00:00Z");
  const justPlayed = new Date("2026-08-05T02:00:00Z");

  if (!isStaleStatus("in_progress", oldGame, now)) {
    errors.push("un match en cours depuis des mois devrait être signalé");
  }
  if (isStaleStatus("in_progress", justPlayed, now)) {
    errors.push("un match de la nuit ne doit pas être signalé comme obsolète");
  }
  if (isStaleStatus("postponed", oldGame, now)) {
    errors.push("un match reporté ne doit pas être signalé comme obsolète");
  }

  return errors;
}
