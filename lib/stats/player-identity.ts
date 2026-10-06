import { aliasKey, resolveNameAlias, PLAYER_NAME_ALIASES } from "./player-aliases";

/**
 * Forme relâchée : accents, ponctuation et suffixes retirés.
 *
 * Retirer le suffixe permet de rattacher « Gary Trent » à Gary Trent Jr.,
 * mais fait aussi entrer en collision un père et son fils. Cette forme n'est
 * donc utilisée qu'en dernier recours, et seulement si elle ne désigne qu'un
 * seul joueur.
 */
export function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

function fullName(candidate: IdentityCandidate): string {
  return `${candidate.firstName} ${candidate.lastName}`;
}

/**
 * Rattache une ligne de box score à une fiche joueur.
 *
 * L'ordre compte : du signal le plus sûr au plus permissif.
 *
 *  1. l'identifiant ESPN, quand la source le fournit ;
 *  2. le nom exact, suffixe compris — « Jaren Jackson Jr. » désigne le fils,
 *     « Jaren Jackson » le père, et les deux ont une fiche ;
 *  3. la table d'alias, pour les surnoms et les ordres de nom ;
 *  4. la forme relâchée, uniquement si elle ne désigne qu'un seul joueur.
 *
 * Quand la ligne porte un identifiant ESPN, une fiche liée à un autre
 * identifiant est une autre personne : un rookie homonyme d'un joueur déjà
 * en base ne doit pas hériter de sa fiche.
 */
export function resolvePlayerIdentity(
  athleteId: string | null,
  playerName: string,
  allCandidates: readonly IdentityCandidate[],
): IdentityCandidate | null {
  let candidates = allCandidates;
  if (athleteId) {
    const byEspnId = candidates.find((candidate) => candidate.espnId === athleteId);
    if (byEspnId) return byEspnId;
    candidates = candidates.filter((candidate) => candidate.espnId === null);
  }

  const exact = matchExact(playerName, candidates);
  if (exact) return exact;

  const canonical = resolveNameAlias(playerName);
  if (canonical) {
    const aliased = matchExact(canonical, candidates);
    if (aliased) return aliased;
  }

  const normalized = normalizePlayerName(playerName);
  if (!normalized) return null;

  const loose = candidates.filter(
    (candidate) => normalizePlayerName(fullName(candidate)) === normalized,
  );
  return loose.length === 1 ? loose[0] : null;
}

/** Correspondance sur le nom complet, suffixe conservé. */
function matchExact(
  name: string,
  candidates: readonly IdentityCandidate[],
): IdentityCandidate | null {
  const key = aliasKey(name);
  if (!key) return null;

  const matches = candidates.filter(
    (candidate) => aliasKey(fullName(candidate)) === key,
  );
  return matches.length === 1 ? matches[0] : null;
}

export function validatePlayerIdentityResolver(): string[] {
  const candidates: IdentityCandidate[] = [
    { id: "1", espnId: "10", firstName: "Nikola", lastName: "Jokić" },
    { id: "2", espnId: null, firstName: "Gary", lastName: "Trent Jr." },
    // Père et fils : leurs formes relâchées sont identiques.
    { id: "3", espnId: null, firstName: "Jaren", lastName: "Jackson Jr." },
    { id: "4", espnId: null, firstName: "Jaren", lastName: "Jackson" },
    { id: "5", espnId: null, firstName: "Nah'Shon", lastName: "Hyland" },
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

  // Le suffixe départage le fils du père ; sans lui, aucune supposition.
  if (resolvePlayerIdentity(null, "Jaren Jackson Jr.", candidates)?.id !== "3") {
    errors.push("suffixe ignoré : le fils n'est pas distingué du père");
  }
  if (resolvePlayerIdentity(null, "Jaren Jackson", candidates)?.id !== "4") {
    errors.push("nom exact ignoré : le père n'est pas distingué du fils");
  }
  if (resolvePlayerIdentity(null, "Jaren Jackson Sr.", candidates) !== null) {
    errors.push("suffixe inconnu rattaché à tort");
  }

  // Un homonyme déjà lié à un autre identifiant ESPN n'est pas rattaché.
  if (resolvePlayerIdentity("99", "Nikola Jokić", candidates) !== null) {
    errors.push("homonyme rattaché malgré un identifiant ESPN différent");
  }
  if (resolvePlayerIdentity("99", "Gary Trent Jr.", candidates)?.id !== "2") {
    errors.push("fiche sans identifiant ESPN non rattachée par le nom");
  }

  // Surnom d'usage traité par la table d'alias.
  if (resolvePlayerIdentity(null, "Bones Hyland", candidates)?.id !== "5") {
    errors.push("alias de surnom non appliqué");
  }

  // Chaque alias doit désigner un nom que le résolveur sait retrouver.
  for (const [observed, canonical] of Object.entries(PLAYER_NAME_ALIASES)) {
    const [firstName, ...rest] = canonical.split(" ");
    const single: IdentityCandidate[] = [
      { id: "x", espnId: null, firstName, lastName: rest.join(" ") },
    ];
    if (resolvePlayerIdentity(null, observed, single)?.id !== "x") {
      errors.push(`alias non résolu : ${observed} → ${canonical}`);
    }
  }

  return errors;
}
