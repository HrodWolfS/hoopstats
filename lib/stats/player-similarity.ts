export type SimilarityVector = {
  id: string;
  values: readonly (number | null | undefined)[];
};

export type SimilarityResult = { id: string; similarity: number };

export function findSimilarPlayers(
  target: SimilarityVector,
  candidates: readonly SimilarityVector[],
  limit = 4,
): SimilarityResult[] {
  const population = [target, ...candidates];
  const dimensions = target.values.map((_, index) => {
    const values = population
      .map((row) => row.values[index])
      .filter((value): value is number => value != null && Number.isFinite(value));
    const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(values.length, 1);
    return { mean, deviation: Math.sqrt(variance) };
  });

  return candidates
    .filter((candidate) => candidate.id !== target.id)
    .map((candidate) => {
      const distances = dimensions.flatMap((dimension, index) => {
        const targetValue = target.values[index];
        const candidateValue = candidate.values[index];
        if (targetValue == null || candidateValue == null || dimension.deviation === 0) return [];
        return [((targetValue - candidateValue) / dimension.deviation) ** 2];
      });
      const distance = Math.sqrt(
        distances.reduce((sum, value) => sum + value, 0) / Math.max(distances.length, 1),
      );
      return { id: candidate.id, similarity: Math.round(100 / (1 + distance)) };
    })
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit);
}

export function validatePlayerSimilarity(): string[] {
  const target = { id: "a", values: [20, 5, 5] };
  const results = findSimilarPlayers(target, [
    { id: "b", values: [20.1, 5, 5] },
    { id: "c", values: [5, 15, 1] },
  ]);
  return results[0]?.id === "b" && results[0].similarity > results[1].similarity
    ? []
    : ["classement de similarité invalide"];
}
