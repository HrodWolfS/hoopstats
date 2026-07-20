export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export type IdentityCandidate = {
  id: string;
  espnId: string | null;
  firstName: string;
  lastName: string;
};

export function resolvePlayerIdentity(
  athleteId: string | null,
  playerName: string,
  candidates: readonly IdentityCandidate[],
): IdentityCandidate | null {
  if (athleteId) {
    const byEspnId = candidates.find((candidate) => candidate.espnId === athleteId);
    if (byEspnId) return byEspnId;
  }
  const normalized = normalizePlayerName(playerName);
  if (!normalized) return null;
  const matches = candidates.filter(
    (candidate) =>
      normalizePlayerName(`${candidate.firstName}${candidate.lastName}`) === normalized,
  );
  return matches.length === 1 ? matches[0] : null;
}

export function validatePlayerIdentityResolver(): string[] {
  const candidates: IdentityCandidate[] = [
    { id: "1", espnId: "10", firstName: "Nikola", lastName: "Jokić" },
    { id: "2", espnId: null, firstName: "Gary", lastName: "Trent Jr." },
  ];
  const errors: string[] = [];
  if (resolvePlayerIdentity("10", "nom différent", candidates)?.id !== "1") {
    errors.push("résolution par identifiant ESPN invalide");
  }
  if (resolvePlayerIdentity(null, "Nikola Jokic", candidates)?.id !== "1") {
    errors.push("normalisation des accents invalide");
  }
  if (resolvePlayerIdentity(null, "Gary Trent", candidates)?.id !== "2") {
    errors.push("normalisation des suffixes invalide");
  }
  if (resolvePlayerIdentity(null, "—", candidates) !== null) {
    errors.push("identité vide incorrectement résolue");
  }
  return errors;
}
