/**
 * Trophées individuels NBA tels que stockés dans `Award` (scripts/seed-awards.ts).
 * Partagé par la page Trophées et les fiches joueurs.
 */

/** Première saison couverte : avant, aucun trophée n'est en base. */
export const AWARDS_SINCE = "2015-16";

export const INDIVIDUAL_AWARDS: { type: string; label: string; sub: string }[] = [
  { type: "MVP", label: "MVP", sub: "Most Valuable Player" },
  { type: "FMVP", label: "Finals MVP", sub: "MVP des finales NBA" },
  { type: "DPOY", label: "DPOY", sub: "Defensive Player of the Year" },
  { type: "ROY", label: "ROY", sub: "Rookie of the Year" },
  { type: "MIP", label: "MIP", sub: "Most Improved Player" },
  { type: "SMOY", label: "6e homme", sub: "Sixth Man of the Year" },
  { type: "CPOY", label: "Clutch", sub: "Clutch Player of the Year" },
  { type: "NBA_CUP_MVP", label: "Cup MVP", sub: "NBA Cup MVP" },
];

export function individualAward(type: string) {
  return INDIVIDUAL_AWARDS.find((award) => award.type === type) ?? null;
}
