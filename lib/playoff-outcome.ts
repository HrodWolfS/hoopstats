/**
 * Résultat de playoffs d'une équipe sur une saison.
 *
 * `TeamSeason.playoffResult` ne contient pas ce résultat : c'est le code de
 * qualification ESPN figé en fin de saison régulière (« w » = meilleur bilan
 * de l'Ouest, « x » = qualifié, « pi » = play-in, « o » = éliminé). Le lire
 * comme un résultat ferait passer le meilleur bilan de l'Ouest pour le
 * champion. Le vrai résultat se déduit des séries jouées : le tour le plus
 * avancé atteint et, s'il est terminé, son vainqueur.
 *
 * Module volontairement sans accès base, comme `lib/playoff-series.ts`.
 */

import { hasSeriesStarted, seriesWinnerTeamId } from "./playoff-series";

export type PlayoffOutcomeKind =
  | "champion"
  | "finals"
  | "conference-finals"
  | "conference-semis"
  | "first-round"
  | "in-progress"
  | "play-in"
  | "missed"
  | "pending"
  | "unknown";

export type PlayoffOutcome = {
  kind: PlayoffOutcomeKind;
  label: string;
  /** D'où vient le résultat : séries jouées, code de qualification ESPN, ou rien. */
  basis: "series" | "clinch-code" | "none";
};

export type OutcomeSeries = {
  round: number;
  completed: boolean;
  team1Id: string;
  team2Id: string;
  team1Wins: number;
  team2Wins: number;
};

const ROUND_LABEL: Record<number, string> = {
  1: "Premier tour",
  2: "Demi-finale de conférence",
  3: "Finale de conférence",
  4: "Finale NBA",
};

const ELIMINATED_KIND: Record<number, PlayoffOutcomeKind> = {
  1: "first-round",
  2: "conference-semis",
  3: "conference-finals",
  4: "finals",
};

/** Code ESPN normalisé : « - pi » → « pi ». */
export function clinchCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.replace(/^\s*-\s*/, "").trim().toLowerCase();
  return code === "" ? null : code;
}

/**
 * @param seasonSeries toutes les séries de la saison (vide si non importées)
 * @param isLiveSeason saison en cours : l'absence de séries veut dire « pas encore jouées »
 */
export function teamPlayoffOutcome(
  teamId: string,
  seasonSeries: readonly OutcomeSeries[],
  rawClinchCode: string | null | undefined,
  isLiveSeason: boolean,
): PlayoffOutcome {
  const code = clinchCode(rawClinchCode);

  if (seasonSeries.length === 0) {
    if (isLiveSeason) return { kind: "pending", label: "Saison en cours", basis: "none" };
    // Sans séries, seul « éliminé » reste sûr : un « x » ne dit pas jusqu'où l'équipe est allée.
    if (code === "o") return { kind: "missed", label: "Non qualifié", basis: "clinch-code" };
    return { kind: "unknown", label: "Résultat non disponible", basis: "none" };
  }

  const played = seasonSeries.filter(
    (series) => (series.team1Id === teamId || series.team2Id === teamId) && hasSeriesStarted(series),
  );
  const listed = seasonSeries.filter((series) => series.team1Id === teamId || series.team2Id === teamId);

  if (listed.length === 0) {
    if (code === "pi") return { kind: "play-in", label: "Éliminé au play-in", basis: "clinch-code" };
    if (isLiveSeason && !seasonSeries.some(hasSeriesStarted)) {
      return { kind: "pending", label: "Playoffs à venir", basis: "none" };
    }
    return { kind: "missed", label: "Non qualifié", basis: "series" };
  }

  const deepest = (played.length > 0 ? played : listed).reduce((a, b) => (b.round > a.round ? b : a));
  const winner = seriesWinnerTeamId(deepest);
  const round = ROUND_LABEL[deepest.round] ?? `Tour ${deepest.round}`;

  if (!deepest.completed || winner === null) {
    return { kind: "in-progress", label: `${round} en cours`, basis: "series" };
  }
  if (winner === teamId) {
    if (deepest.round === 4) return { kind: "champion", label: "Champion NBA", basis: "series" };
    // Vainqueur d'un tour dont la suite n'est pas encore importée.
    return { kind: "in-progress", label: `${round} remportée`, basis: "series" };
  }
  return {
    kind: ELIMINATED_KIND[deepest.round] ?? "unknown",
    label: deepest.round === 4 ? "Finaliste NBA" : `Éliminé en ${round.toLowerCase()}`,
    basis: "series",
  };
}

const OUTCOME_SENTENCE: Partial<Record<PlayoffOutcomeKind, string>> = {
  champion: "a remporté le titre NBA",
  finals: "a perdu en finale NBA",
  "conference-finals": "a été éliminée en finale de conférence",
  "conference-semis": "a été éliminée en demi-finale de conférence",
  "first-round": "a été éliminée au premier tour des playoffs",
  "play-in": "a été éliminée au play-in",
  missed: "n'a pas disputé les playoffs",
};

/**
 * Phrase de bilan d'une saison, recomposée à partir du bilan, du rang et du
 * résultat tiré des séries. Aucun résultat de playoffs n'y figure quand il
 * n'est pas connu.
 */
export function teamSeasonSummary(input: {
  team: string;
  season: string;
  wins: number;
  losses: number;
  conferenceRank: number | null;
  conference: string;
  playoff: PlayoffOutcome;
}): string {
  const rank = input.conferenceRank
    ? `, ${input.conferenceRank === 1 ? "1re" : `${input.conferenceRank}e`} de la Conférence ${input.conference}`
    : "";
  const base = `${input.team} : bilan de ${input.wins}-${input.losses} en ${input.season}${rank}.`;
  const outcome = OUTCOME_SENTENCE[input.playoff.kind];
  if (outcome) return `${base} L'équipe ${outcome}.`;
  if (input.playoff.kind === "in-progress") return `${base} Playoffs : ${input.playoff.label.toLowerCase()}.`;
  return base;
}

/** Auto-contrôles exécutés par `pnpm health:data`. */
export function validatePlayoffOutcome(): string[] {
  const errors: string[] = [];
  const s = (round: number, t1: string, t2: string, w1: number, w2: number, completed = true): OutcomeSeries => ({
    round,
    completed,
    team1Id: t1,
    team2Id: t2,
    team1Wins: w1,
    team2Wins: w2,
  });

  // 2015-16 : Golden State tête de série, Cleveland champion 4-3.
  const season = [s(1, "GSW", "HOU", 4, 1), s(3, "CLE", "TOR", 4, 2), s(4, "GSW", "CLE", 3, 4), s(1, "CLE", "DET", 4, 0)];
  if (teamPlayoffOutcome("CLE", season, " - e", false).kind !== "champion") {
    errors.push("champion non reconnu quand il n'est pas tête de série en finale");
  }
  if (teamPlayoffOutcome("GSW", season, " - w", false).kind !== "finals") {
    errors.push("code « w » (meilleur bilan) pris pour un titre");
  }
  if (teamPlayoffOutcome("TOR", season, " - x", false).kind !== "conference-finals") {
    errors.push("élimination en finale de conférence non reconnue");
  }
  if (teamPlayoffOutcome("HOU", season, " - x", false).label !== "Éliminé en premier tour") {
    errors.push("élimination au premier tour mal libellée");
  }
  if (teamPlayoffOutcome("ATL", season, " - pi", false).kind !== "play-in") {
    errors.push("élimination au play-in non reconnue");
  }
  if (teamPlayoffOutcome("SAC", season, " - o", false).kind !== "missed") {
    errors.push("non-qualification non reconnue");
  }

  // Saison sans séries importées (2020-21) : on ne devine pas un « x ».
  if (teamPlayoffOutcome("UTA", [], " - w", false).kind !== "unknown") {
    errors.push("résultat inventé pour une saison sans séries");
  }
  if (teamPlayoffOutcome("SAC", [], " - o", false).kind !== "missed") {
    errors.push("code « o » ignoré pour une saison sans séries");
  }
  if (teamPlayoffOutcome("SAC", [], null, true).kind !== "pending") {
    errors.push("saison en cours sans séries non signalée comme en cours");
  }

  // Série en cours : aucun vainqueur supposé.
  if (teamPlayoffOutcome("BOS", [s(2, "BOS", "NYK", 3, 1, false)], " - a", true).kind !== "in-progress") {
    errors.push("série en cours traitée comme terminée");
  }

  const summary = teamSeasonSummary({
    team: "Golden State Warriors",
    season: "2015-16",
    wins: 73,
    losses: 9,
    conferenceRank: 1,
    conference: "Ouest",
    playoff: teamPlayoffOutcome("GSW", season, " - w", false),
  });
  if (summary.includes("titre") || !summary.includes("finale NBA")) {
    errors.push("résumé de saison attribuant le titre au meilleur bilan");
  }
  const unknown = teamSeasonSummary({
    team: "Utah Jazz",
    season: "2020-21",
    wins: 52,
    losses: 20,
    conferenceRank: 1,
    conference: "Ouest",
    playoff: teamPlayoffOutcome("UTA", [], " - w", false),
  });
  if (unknown.includes("playoffs") || unknown.includes("titre")) {
    errors.push("résumé de saison inventant un résultat de playoffs inconnu");
  }

  if (clinchCode(" - pi") !== "pi" || clinchCode(null) !== null || clinchCode("  ") !== null) {
    errors.push("normalisation du code ESPN erronée");
  }

  return errors;
}
