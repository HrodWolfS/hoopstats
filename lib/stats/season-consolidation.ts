/**
 * Ligne consolidée « TOT » : une seule ligne par joueur et par saison
 * (feuille de route § 0.3).
 *
 * `PlayerSeason` stocke une ligne par équipe. Un joueur transféré en a donc
 * plusieurs pour une même saison ; sans regroupement, il apparaît deux fois
 * dans les listes, chaque fois avec une moyenne partielle, et les seuils de
 * matchs l'écartent alors qu'il les atteint sur la saison entière.
 *
 * Règles d'agrégation, par famille de statistiques :
 *
 *  - comptage par match : moyenne pondérée par les matchs joués — exacte,
 *    puisque `moyenne × matchs` reconstitue le total ;
 *  - pourcentages de tir (FG%, 3P%, LF%, TS%) : recalculés sur les totaux de
 *    tentatives des box scores lorsque l'appelant les fournit, `null` sinon.
 *    Moyenner des pourcentages, même pondérés, donnerait un chiffre faux ;
 *  - cumuls (Win Shares, VORP) : additionnés ;
 *  - taux avancés (PER, USG%, ORtg, DRtg, NRtg, BPM) : `null`. Leur
 *    recombinaison exige des volumes de possessions que nous ne stockons pas.
 *
 * Le module est pur : le chargement des totaux de box scores vit dans
 * `season-totals.ts`, côté serveur.
 */

import type { DerivedSeason } from "./season-aggregation";

/** Abréviation conventionnelle d'une saison à plusieurs équipes. */
export const MULTI_TEAM_ABBR = "TOT";

export type ConsolidatableRow = {
  playerId: string;
  gamesPlayed: number;
};

export type Consolidated<T> = T & {
  /** Vrai lorsque la ligne agrège plusieurs passages en équipe. */
  isMultiTeam: boolean;
  /** Passages d'origine, du plus grand nombre de matchs au plus petit. */
  stints: T[];
};

/** Totaux exacts d'un joueur sur la saison, toutes équipes confondues. */
export type ExactSeasonTotals = ReadonlyMap<string, DerivedSeason>;

const COUNTING_KEYS = [
  "minutesPerGame",
  "pointsPerGame",
  "reboundsPerGame",
  "assistsPerGame",
  "stealsPerGame",
  "blocksPerGame",
] as const;

const SHOOTING_KEYS = ["fgPct", "threePtPct", "ftPct", "trueShooting"] as const;

const CUMULATIVE_KEYS = ["winShares", "vorp"] as const;

const NON_AGGREGABLE_KEYS = [
  "per",
  "usageRate",
  "offRating",
  "defRating",
  "netRating",
  "bpm",
] as const;

/**
 * Regroupe les passages d'une même saison en une ligne par joueur.
 *
 * Les lignes doivent toutes appartenir à la même saison. La ligne retournée
 * conserve les champs de son passage principal (le plus grand nombre de
 * matchs : identifiant, joueur, équipe pour les couleurs) ; seules les
 * statistiques sont recalculées. Un joueur resté dans une seule équipe est
 * renvoyé tel quel.
 */
export function consolidatePlayerSeasons<T extends ConsolidatableRow>(
  rows: readonly T[],
  exactTotals?: ExactSeasonTotals,
): Consolidated<T>[] {
  const byPlayer = new Map<string, T[]>();
  for (const row of rows) {
    const stints = byPlayer.get(row.playerId);
    if (stints) stints.push(row);
    else byPlayer.set(row.playerId, [row]);
  }

  return [...byPlayer.values()].map((stints) =>
    consolidateStints(stints, exactTotals?.get(stints[0].playerId)),
  );
}

function consolidateStints<T extends ConsolidatableRow>(
  rows: readonly T[],
  exact: DerivedSeason | undefined,
): Consolidated<T> {
  const stints = [...rows].sort((a, b) => b.gamesPlayed - a.gamesPlayed);
  const [primary] = stints;
  if (stints.length === 1) {
    return { ...primary, isMultiTeam: false, stints };
  }

  const gamesPlayed = stints.reduce(
    (total, row) => total + Math.max(0, row.gamesPlayed),
    0,
  );
  const merged: Record<string, unknown> = { ...primary, gamesPlayed };

  for (const key of COUNTING_KEYS) {
    if (!(key in primary)) continue;
    // Sans match joué, la moyenne vaut 0 comme pour une ligne stockée : le
    // type reste numérique et aucune division par zéro ne produit de NaN.
    merged[key] = weightedByGames(stints, key) ?? 0;
  }
  for (const key of SHOOTING_KEYS) {
    if (!(key in primary)) continue;
    merged[key] = exact?.[key] ?? null;
  }
  for (const key of CUMULATIVE_KEYS) {
    if (!(key in primary)) continue;
    merged[key] = sumOrNull(stints, key);
  }
  for (const key of NON_AGGREGABLE_KEYS) {
    if (key in primary) merged[key] = null;
  }

  return { ...(merged as T), isMultiTeam: true, stints };
}

function numberAt(row: ConsolidatableRow, key: string): number | null {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function weightedByGames(
  stints: readonly ConsolidatableRow[],
  key: string,
): number | null {
  let total = 0;
  let games = 0;
  for (const stint of stints) {
    const value = numberAt(stint, key);
    const played = Math.max(0, stint.gamesPlayed);
    if (value === null || played === 0) continue;
    total += value * played;
    games += played;
  }
  return games === 0 ? null : total / games;
}

function sumOrNull(
  stints: readonly ConsolidatableRow[],
  key: string,
): number | null {
  let total = 0;
  for (const stint of stints) {
    const value = numberAt(stint, key);
    // Un passage sans valeur rendrait la somme partielle, donc fausse.
    if (value === null) return null;
    total += value;
  }
  return total;
}

/** Identifiants des joueurs ayant plusieurs passages dans les lignes. */
export function multiTeamPlayerIds(
  rows: readonly ConsolidatableRow[],
): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.playerId, (counts.get(row.playerId) ?? 0) + 1);
  }
  return [...counts].filter(([, count]) => count > 1).map(([id]) => id);
}

// ── Auto-contrôles ───────────────────────────────────────────────────────────

type TestRow = ConsolidatableRow & {
  team: string;
  pointsPerGame: number;
  fgPct: number | null;
  trueShooting: number | null;
  per: number | null;
  winShares: number | null;
};

function testRow(
  playerId: string,
  team: string,
  gamesPlayed: number,
  pointsPerGame: number,
): TestRow {
  return {
    playerId,
    team,
    gamesPlayed,
    pointsPerGame,
    fgPct: 0.5,
    trueShooting: 0.6,
    per: 18,
    winShares: 2,
  };
}

function near(actual: number | null | undefined, expected: number): boolean {
  return actual != null && Math.abs(actual - expected) < 0.0005;
}

function derived(partial: Partial<DerivedSeason>): DerivedSeason {
  return {
    gamesPlayed: 0,
    minutesPerGame: 0,
    pointsPerGame: 0,
    reboundsPerGame: 0,
    assistsPerGame: 0,
    stealsPerGame: 0,
    blocksPerGame: 0,
    fgPct: null,
    threePtPct: null,
    ftPct: null,
    trueShooting: null,
    ...partial,
  };
}

/** Cas de contrôle de la feuille de route § 0.3, exécutés par `pnpm health:data`. */
export function validateSeasonConsolidation(): string[] {
  const errors: string[] = [];

  // Équipe unique : la ligne ressort intacte, pourcentages et PER compris.
  const [single] = consolidatePlayerSeasons([testRow("a", "SAS", 70, 21)]);
  if (single.isMultiTeam || single.pointsPerGame !== 21 || single.fgPct !== 0.5) {
    errors.push("équipe unique : ligne altérée par la consolidation");
  }
  if (single.per !== 18) {
    errors.push("équipe unique : métrique avancée perdue à tort");
  }

  // Un transfert : une seule ligne, matchs additionnés, moyenne pondérée.
  const traded = consolidatePlayerSeasons([
    testRow("b", "BKN", 60, 20),
    testRow("b", "LAC", 10, 10),
  ]);
  if (traded.length !== 1) {
    errors.push("transfert : le joueur figure plusieurs fois");
  } else {
    const [row] = traded;
    if (!row.isMultiTeam || row.gamesPlayed !== 70) {
      errors.push("transfert : matchs non additionnés");
    }
    if (!near(row.pointsPerGame, 1300 / 70)) {
      errors.push("transfert : moyenne non pondérée par les matchs");
    }
    if (row.team !== "BKN" || row.stints.length !== 2) {
      errors.push("transfert : passage principal mal choisi");
    }
    if (row.fgPct !== null || row.trueShooting !== null) {
      errors.push("transfert : pourcentage recombiné sans les tentatives");
    }
    if (row.per !== null) {
      errors.push("transfert : PER recombiné sans les possessions");
    }
    if (row.winShares !== 4) {
      errors.push("transfert : Win Shares non additionnés");
    }
  }

  // Avec les totaux de box scores, les pourcentages sont recalculés.
  // 45/100 au tir sur la saison : ni 0,5 (BKN) ni la moyenne des passages.
  const [exact] = consolidatePlayerSeasons(
    [testRow("c", "BKN", 60, 20), testRow("c", "LAC", 10, 10)],
    new Map([["c", derived({ fgPct: 0.45, trueShooting: 0.57 })]]),
  );
  if (!near(exact.fgPct, 0.45) || !near(exact.trueShooting, 0.57)) {
    errors.push("transfert : pourcentages exacts des box scores ignorés");
  }

  // Trois équipes ou plus, présentées dans le désordre.
  const [three] = consolidatePlayerSeasons([
    testRow("d", "MIL", 10, 6),
    testRow("d", "DET", 40, 12),
    testRow("d", "GSW", 30, 9),
  ]);
  if (three.gamesPlayed !== 80 || three.team !== "DET") {
    errors.push("trois équipes : matchs ou équipe principale incorrects");
  }
  if (!near(three.pointsPerGame, (10 * 6 + 40 * 12 + 30 * 9) / 80)) {
    errors.push("trois équipes : moyenne incorrecte");
  }

  // Joueur sans match : aucune division par zéro, aucune moyenne inventée.
  const [idle] = consolidatePlayerSeasons([
    testRow("e", "NYK", 0, 0),
    testRow("e", "UTA", 0, 0),
  ]);
  if (idle.gamesPlayed !== 0 || idle.pointsPerGame !== 0) {
    errors.push("aucun match : moyenne non nulle ou NaN");
  }

  // Joueurs distincts : jamais fusionnés.
  if (
    consolidatePlayerSeasons([testRow("f", "BOS", 50, 10), testRow("g", "BOS", 50, 10)])
      .length !== 2
  ) {
    errors.push("joueurs distincts fusionnés à tort");
  }

  if (multiTeamPlayerIds([testRow("h", "A", 1, 1), testRow("h", "B", 1, 1), testRow("i", "A", 1, 1)]).join() !== "h") {
    errors.push("détection des joueurs transférés incorrecte");
  }

  return errors;
}
