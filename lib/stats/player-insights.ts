export type PlayerInsightInput = {
  label: string;
  percentile: number;
  value: string;
};

export type PlayerInsight = {
  title: string;
  finding: string;
  tone: "strength" | "watch" | "profile";
};

export function buildPlayerInsights(
  stats: readonly PlayerInsightInput[],
  cohortLabel: string,
): PlayerInsight[] {
  if (stats.length === 0) return [];
  const ordered = [...stats].sort((left, right) => right.percentile - left.percentile);
  const insights: PlayerInsight[] = [];
  const best = ordered[0];
  if (best.percentile >= 75) {
    insights.push({
      title: "Force principale",
      finding: `${best.label} ressort au percentile ${best.percentile} (${best.value}) face aux ${cohortLabel}.`,
      tone: "strength",
    });
  }
  const weakest = ordered[ordered.length - 1];
  if (weakest.percentile <= 25) {
    insights.push({
      title: "Axe en retrait",
      finding: `${weakest.label} se situe au percentile ${weakest.percentile} (${weakest.value}) dans cette même cohorte.`,
      tone: "watch",
    });
  }
  const aboveMedian = stats.filter((item) => item.percentile >= 50).length;
  insights.push({
    title: "Lecture du profil",
    finding: `${aboveMedian} des ${stats.length} indicateurs observés sont au-dessus de la médiane des ${cohortLabel}.`,
    tone: "profile",
  });
  return insights.slice(0, 3);
}
