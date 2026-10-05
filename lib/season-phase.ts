/**
 * Saison et phase d'un match, lues sur l'événement ESPN.
 *
 * La synchronisation rangeait chaque match dans la constante `CURRENT_SEASON`,
 * sans distinguer les phases : présaison, play-in, playoffs et finale de la
 * NBA Cup se retrouvaient dans les moyennes de saison régulière. Un joueur
 * pouvait ainsi afficher 98 matchs joués sur une saison de 82.
 *
 * ESPN publie pour chaque événement l'année de fin de saison et son type ; on
 * s'appuie sur ces deux champs plutôt que sur des bornes de dates à maintenir.
 */

export const GAME_PHASES = [
  "preseason",
  "regular",
  "cup_final",
  "play_in",
  "playoffs",
  "other",
] as const;

export type GamePhase = (typeof GAME_PHASES)[number];

/** Seule phase comptée dans les moyennes de saison, comme le fait la NBA. */
export const REGULAR_SEASON_PHASE: GamePhase = "regular";

/** Phases jouées pour un enjeu : affichées comme résultats, contrairement à la présaison. */
export const COMPETITIVE_PHASES: GamePhase[] = [
  "regular",
  "cup_final",
  "play_in",
  "playoffs",
];

export const GAME_PHASE_LABELS: Record<GamePhase, string> = {
  preseason: "Présaison",
  regular: "Saison régulière",
  cup_final: "Finale NBA Cup",
  play_in: "Play-in",
  playoffs: "Playoffs",
  other: "Hors compétition",
};

export type EspnSeasonInfo = {
  season?: { year?: number; type?: number };
  competitions?: Array<{ type?: { abbreviation?: string } }>;
};

/** Année de fin ESPN → saison au format du site : 2027 → "2026-27". */
export function seasonFromEspnYear(year: number): string {
  return `${year - 1}-${String(year).slice(-2)}`;
}

/**
 * Phase d'un événement ESPN.
 *
 * La finale de la NBA Cup est publiée en saison régulière (type 2) mais ne
 * compte pas dans les statistiques officielles : seul le type de compétition
 * « CC » permet de la distinguer.
 */
export function gamePhaseFromEspn(event: EspnSeasonInfo): GamePhase {
  switch (event.season?.type) {
    case 1:
      return "preseason";
    case 2:
      return event.competitions?.[0]?.type?.abbreviation === "CC"
        ? "cup_final"
        : "regular";
    case 3:
      return "playoffs";
    case 5:
      return "play_in";
    default:
      return "other";
  }
}

/** Saison et phase d'un événement, ou null si ESPN n'indique pas la saison. */
export function seasonAndPhaseFromEspn(
  event: EspnSeasonInfo,
): { season: string; phase: GamePhase } | null {
  const year = event.season?.year;
  if (!year || !Number.isInteger(year)) return null;
  return { season: seasonFromEspnYear(year), phase: gamePhaseFromEspn(event) };
}

export function validateSeasonPhase(): string[] {
  const errors: string[] = [];
  if (seasonFromEspnYear(2027) !== "2026-27") {
    errors.push("année ESPN mal convertie en saison");
  }
  if (seasonFromEspnYear(2000) !== "1999-00") {
    errors.push("passage de siècle mal converti");
  }
  if (gamePhaseFromEspn({ season: { year: 2027, type: 1 } }) !== "preseason") {
    errors.push("présaison non reconnue");
  }
  if (
    gamePhaseFromEspn({
      season: { year: 2026, type: 2 },
      competitions: [{ type: { abbreviation: "CC" } }],
    }) !== "cup_final"
  ) {
    errors.push("finale NBA Cup comptée en saison régulière");
  }
  if (gamePhaseFromEspn({ season: { year: 2026, type: 5 } }) !== "play_in") {
    errors.push("play-in non reconnu");
  }
  if (gamePhaseFromEspn({ season: { year: 2026, type: 3 } }) !== "playoffs") {
    errors.push("playoffs non reconnus");
  }
  if (seasonAndPhaseFromEspn({}) !== null) {
    errors.push("événement sans saison accepté");
  }
  return errors;
}
