export type PopulationSummary = {
  total: number;
  mean: number | null;
  median: number | null;
};

export type MetricContext = PopulationSummary & {
  rank: number | null;
  percentile: number | null;
  differenceFromMean: number | null;
};

function finiteValues(values: readonly (number | null | undefined)[]): number[] {
  return values.filter(
    (value): value is number => value != null && Number.isFinite(value),
  );
}

export function calculatePopulationSummary(
  values: readonly (number | null | undefined)[],
): PopulationSummary {
  const valid = finiteValues(values).sort((left, right) => left - right);
  if (valid.length === 0) return { total: 0, mean: null, median: null };

  const middle = Math.floor(valid.length / 2);
  const median =
    valid.length % 2 === 0
      ? (valid[middle - 1] + valid[middle]) / 2
      : valid[middle];

  return {
    total: valid.length,
    mean: valid.reduce((sum, value) => sum + value, 0) / valid.length,
    median,
  };
}

export function calculateMetricContext(
  values: readonly (number | null | undefined)[],
  target: number | null | undefined,
  higherIsBetter: boolean,
): MetricContext {
  const valid = finiteValues(values);
  const summary = calculatePopulationSummary(valid);
  if (target == null || !Number.isFinite(target) || summary.total === 0) {
    return {
      ...summary,
      rank: null,
      percentile: null,
      differenceFromMean: null,
    };
  }

  const better = valid.filter((value) =>
    higherIsBetter ? value > target : value < target,
  ).length;
  const worse = valid.filter((value) =>
    higherIsBetter ? value < target : value > target,
  ).length;

  return {
    ...summary,
    rank: better + 1,
    percentile: Math.round((worse / summary.total) * 100),
    differenceFromMean: target - summary.mean!,
  };
}

export function validateStatisticalContext(): string[] {
  const errors: string[] = [];
  const higher = calculateMetricContext([10, 20, 30, 40], 30, true);
  const lower = calculateMetricContext([100, 110, 120, 130], 110, false);
  const empty = calculateMetricContext([], null, true);

  if (higher.rank !== 2 || higher.percentile !== 50) {
    errors.push("classement des métriques croissantes invalide");
  }
  if (lower.rank !== 2 || lower.percentile !== 50) {
    errors.push("classement des métriques décroissantes invalide");
  }
  if (higher.mean !== 25 || higher.median !== 25) {
    errors.push("moyenne ou médiane invalide");
  }
  if (empty.rank !== null || empty.total !== 0) {
    errors.push("cohorte vide mal gérée");
  }
  return errors;
}
