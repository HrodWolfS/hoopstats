/**
 * Noms sous lesquels ESPN désigne un joueur autrement que notre fiche.
 *
 * Trois familles, toutes vérifiées joueur par joueur :
 *
 *  1. Surnoms d'usage — ESPN publie le nom de scène, la fiche porte l'état
 *     civil : « Bones Hyland » pour Nah'Shon Hyland, « Ace Bailey » pour
 *     Airious Bailey.
 *  2. Prénoms abrégés — « Nic Claxton » pour Nicolas Claxton.
 *  3. Ordre du nom — « Yang Hansen » pour Hansen Yang, dont le nom de famille
 *     est Yang.
 *  4. Noms composés — ESPN publie le nom complet (« Nigel Hayes-Davis »,
 *     « David Jones Garcia »), la fiche le nom d'usage.
 *
 * Sans cette table, ces joueurs n'ont aucune ligne de box score rattachée :
 * leurs moyennes de saison seraient calculées sur zéro match.
 *
 * N'y placer que des cas où la fiche cible est certaine. Une correspondance
 * approximative rattacherait les statistiques d'un joueur à un autre — pire
 * qu'une absence de rattachement, qui se voit.
 */

/** Nom observé → nom complet exact de la fiche joueur. */
export const PLAYER_NAME_ALIASES: Readonly<Record<string, string>> = {
  "Bones Hyland": "Nah'Shon Hyland",
  "Bub Carrington": "Carlton Carrington",
  "Ace Bailey": "Airious Bailey",
  "Nic Claxton": "Nicolas Claxton",
  "Yang Hansen": "Hansen Yang",
  "Alex Sarr": "Alexandre Sarr",
  "Mitch Mascari": "Mitchell Mascari",
  "Eli Ndiaye": "Eli John Ndiaye",
  "Nigel Hayes-Davis": "Nigel Hayes",
  "David Jones Garcia": "David Jones",
};

/**
 * Joueurs vus en box score sans fiche correspondante.
 *
 * Aucun alias ne peut les rattacher : la fiche n'existe pas. Les lister ici
 * documente qu'ils ont été examinés et distingue « pas encore importé » de
 * « alias manquant ».
 */
export const PLAYERS_WITHOUT_RECORD = [
  "Alex O'Connell",
  "Fanbo Zeng",
] as const;

const ALIAS_LOOKUP = new Map(
  Object.entries(PLAYER_NAME_ALIASES).map(([observed, canonical]) => [
    aliasKey(observed),
    canonical,
  ]),
);

/** Clé de comparaison : accents, ponctuation et casse neutralisés. */
export function aliasKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Nom de fiche correspondant à un nom observé, s'il en existe un. */
export function resolveNameAlias(observedName: string): string | null {
  return ALIAS_LOOKUP.get(aliasKey(observedName)) ?? null;
}

/** Auto-contrôles exécutés par `pnpm health:data`. */
export function validatePlayerAliases(): string[] {
  const errors: string[] = [];
  const targets = new Set<string>();

  for (const [observed, canonical] of Object.entries(PLAYER_NAME_ALIASES)) {
    if (aliasKey(observed) === aliasKey(canonical)) {
      errors.push(`${observed} : alias identique à sa cible`);
    }
    if (targets.has(canonical)) {
      errors.push(`${canonical} : deux alias pointent vers la même fiche`);
    }
    targets.add(canonical);

    if (!canonical.includes(" ")) {
      errors.push(`${observed} : la cible « ${canonical} » n'est pas un nom complet`);
    }
  }

  // Un nom sans fiche ne doit pas figurer aussi comme alias : il serait à la
  // fois déclaré rattachable et déclaré absent.
  for (const missing of PLAYERS_WITHOUT_RECORD) {
    if (resolveNameAlias(missing)) {
      errors.push(`${missing} : déclaré sans fiche mais pourvu d'un alias`);
    }
  }

  return errors;
}
