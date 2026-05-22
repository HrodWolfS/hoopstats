/**
 * Génère un slug URL-safe à partir d'une chaîne quelconque.
 * Gère les accents (Jokić → jokic), les espaces, la ponctuation.
 *
 * @example
 * toSlug("Nikola Jokić")      // → "nikola-jokic"
 * toSlug("Los Angeles Lakers") // → "los-angeles-lakers"
 * toSlug("Philadelphia 76ers") // → "philadelphia-76ers"
 */
export function toSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Génère le slug d'un joueur à partir de son prénom + nom.
 * En cas de collision, ajouter l'année de naissance via suffixe externe.
 */
export function playerSlug(firstName: string, lastName: string): string {
  return toSlug(`${firstName} ${lastName}`);
}
