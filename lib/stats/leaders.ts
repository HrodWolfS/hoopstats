import type { PlayerSeason } from "@prisma/client";
import type { PlayerMetricKey } from "@/lib/stats/metrics";

export const LEADERBOARDS = [
  { slug: "points", metric: "pointsPerGame", label: "Points par match" },
  { slug: "rebonds", metric: "reboundsPerGame", label: "Rebonds par match" },
  { slug: "passes", metric: "assistsPerGame", label: "Passes par match" },
  { slug: "interceptions", metric: "stealsPerGame", label: "Interceptions par match" },
  { slug: "true-shooting", metric: "trueShooting", label: "True Shooting" },
  { slug: "net-rating", metric: "netRating", label: "Net Rating" },
] as const satisfies readonly {
  slug: string;
  metric: PlayerMetricKey;
  label: string;
}[];

export type LeaderboardDefinition = (typeof LEADERBOARDS)[number];

export function getLeaderboard(slug: string): LeaderboardDefinition | null {
  return LEADERBOARDS.find((leaderboard) => leaderboard.slug === slug) ?? null;
}

export function leaderboardValue(
  row: PlayerSeason,
  metric: PlayerMetricKey,
): number | null {
  const value = row[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Métriques de comptage : agrégables exactement en pondérant par les matchs. */
const COUNTING_METRICS = new Set<PlayerMetricKey>([
  "minutesPerGame",
  "pointsPerGame",
  "reboundsPerGame",
  "assistsPerGame",
  "stealsPerGame",
  "blocksPerGame",
]);

type RankableRow = {
  playerId: string;
  gamesPlayed: number;
};

/**
 * Ramène une saison transférée à une seule entrée de classement.
 *
 * Depuis que les agrégats sont dérivés des box scores, un joueur transféré
 * possède une ligne par équipe : sans regroupement, il apparaîtrait deux fois
 * au classement, chaque fois avec une moyenne partielle.
 *
 * La valeur retenue dépend de la métrique :
 *
 *  - comptage : moyenne pondérée par les matchs, exacte ;
 *  - taux (TS%, Net Rating) : `null`. Les recombiner exigerait les volumes de
 *    tirs et de possessions, que `PlayerSeason` ne stocke pas. Le joueur sort
 *    du classement concerné plutôt que d'y figurer avec un chiffre inventé.
 */
export function consolidateForRanking<T extends RankableRow>(
  rows: readonly T[],
  metric: PlayerMetricKey,
  value: (row: T) => number | null,
): { row: T; gamesPlayed: number; value: number | null }[] {
  const byPlayer = new Map<string, T[]>();
  for (const row of rows) {
    const stints = byPlayer.get(row.playerId);
    if (stints) stints.push(row);
    else byPlayer.set(row.playerId, [row]);
  }

  return [...byPlayer.values()].map((stints) => {
    // La ligne représentative est celle du plus grand nombre de matchs :
    // c'est l'équipe sous laquelle le joueur est le plus identifiable.
    const primary = [...stints].sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0];
    const gamesPlayed = stints.reduce((total, row) => total + row.gamesPlayed, 0);

    if (stints.length === 1) {
      return { row: primary, gamesPlayed, value: value(primary) };
    }
    if (!COUNTING_METRICS.has(metric)) {
      return { row: primary, gamesPlayed, value: null };
    }

    let weighted = 0;
    let counted = 0;
    for (const row of stints) {
      const current = value(row);
      if (current === null) continue;
      weighted += current * row.gamesPlayed;
      counted += row.gamesPlayed;
    }
    return {
      row: primary,
      gamesPlayed,
      value: counted === 0 ? null : weighted / counted,
    };
  });
}

/**
 * Seuil de matchs adapté à l'avancement de la saison. Un seuil fixe de 10
 * matchs viderait les classements pendant les trois premières semaines : on
 * exige 70 % des matchs déjà joués par une équipe, plafonné au seuil normal.
 */
export function scaledMinimumGames(teamGames: number, cap: number): number {
  return Math.min(cap, Math.max(1, Math.ceil(teamGames * 0.7)));
}

/** Auto-contrôles exécutés par `pnpm health:data`. */
export function validateLeaderboardConsolidation(): string[] {
  const errors: string[] = [];
  const stints = [
    { playerId: "p1", gamesPlayed: 44, pts: 20 },
    { playerId: "p1", gamesPlayed: 46, pts: 25 },
    { playerId: "p2", gamesPlayed: 70, pts: 30 },
  ];

  const points = consolidateForRanking(stints, "pointsPerGame", (row) => row.pts);
  if (points.length !== 2) {
    errors.push("saison transférée non regroupée : le joueur figure deux fois");
  }

  const traded = points.find((entry) => entry.row.playerId === "p1");
  if (traded?.gamesPlayed !== 90) {
    errors.push("matchs des deux équipes non additionnés");
  }
  if (Math.abs((traded?.value ?? 0) - (44 * 20 + 46 * 25) / 90) > 0.0005) {
    errors.push("moyenne de comptage non pondérée par les matchs");
  }

  const rates = consolidateForRanking(stints, "trueShooting", (row) => row.pts);
  if (rates.find((entry) => entry.row.playerId === "p1")?.value !== null) {
    errors.push("taux recombiné sans les volumes nécessaires");
  }
  if (rates.find((entry) => entry.row.playerId === "p2")?.value !== 30) {
    errors.push("saison en équipe unique altérée par le regroupement");
  }

  return errors;
}
