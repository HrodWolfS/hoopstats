/**
 * Formulaire « Quelle statistique cherchez-vous ? ».
 * Catégorie dans une liste fermée, texte libre facultatif, page d'origine.
 * Ni nom ni e-mail : un texte contenant une adresse e-mail est refusé.
 */

export const STAT_REQUEST_CATEGORIES = [
  { value: "tendances", label: "Forme et tendances récentes" },
  { value: "splits", label: "Splits (domicile, extérieur, mois, adversaire)" },
  { value: "records", label: "Records et historique" },
  { value: "face-a-face", label: "Face-à-face entre joueurs ou équipes" },
  { value: "francais", label: "Joueurs français" },
  { value: "lineups", label: "Cinq de départ et associations" },
  { value: "tirs", label: "Tirs et zones de tir" },
  { value: "clutch", label: "Fins de match serrées" },
  { value: "fantasy", label: "Fantasy et TTFL" },
  { value: "autre", label: "Autre" },
] as const;

export type StatRequestCategory = (typeof STAT_REQUEST_CATEGORIES)[number]["value"];

export const STAT_REQUEST_TEXT_MAX = 280;
export const STAT_REQUEST_RETENTION_DAYS = 365;

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;

export function statRequestCategoryLabel(value: string): string {
  return STAT_REQUEST_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

export type StatRequestInput = { category: StatRequestCategory; text: string | null; page: string };

export function validateStatRequest(
  body: unknown,
): { ok: true; value: StatRequestInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Demande invalide." };
  const { category, text, page } = body as Record<string, unknown>;
  if (!STAT_REQUEST_CATEGORIES.some((entry) => entry.value === category)) {
    return { ok: false, error: "Choisissez une catégorie." };
  }
  if (text !== undefined && text !== null && typeof text !== "string") {
    return { ok: false, error: "Texte invalide." };
  }
  const cleaned = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
  if (cleaned.length > STAT_REQUEST_TEXT_MAX) {
    return { ok: false, error: `${STAT_REQUEST_TEXT_MAX} caractères au plus.` };
  }
  if (EMAIL.test(cleaned)) {
    return { ok: false, error: "Retirez l’adresse e-mail : le formulaire n’en conserve aucune." };
  }
  return {
    ok: true,
    value: { category: category as StatRequestCategory, text: cleaned || null, page: sanitizeRequestPage(page) },
  };
}

/** Garde seulement un chemin interne du site, sans paramètres ni fragment. */
export function sanitizeRequestPage(value: unknown): string {
  if (typeof value !== "string") return "inconnue";
  const path = value.split(/[?#]/)[0];
  return /^\/[a-z0-9/_-]{0,120}$/i.test(path) ? path.toLowerCase() : "inconnue";
}

export function statRequestCutoff(now: Date): Date {
  return new Date(now.getTime() - STAT_REQUEST_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export function validateStatRequests(): string[] {
  const errors: string[] = [];
  const ok = validateStatRequest({ category: "splits", text: "  Splits   domicile ", page: "/fr/joueurs/x?saison=2026" });
  if (!ok.ok || ok.value.text !== "Splits domicile" || ok.value.page !== "/fr/joueurs/x") {
    errors.push("demande valide mal nettoyée");
  }
  if (validateStatRequest({ category: "inconnue" }).ok) errors.push("catégorie hors liste acceptée");
  if (validateStatRequest({ category: "autre", text: "écrivez-moi a.b@exemple.fr" }).ok) {
    errors.push("adresse e-mail acceptée");
  }
  if (validateStatRequest({ category: "autre", text: "x".repeat(STAT_REQUEST_TEXT_MAX + 1) }).ok) {
    errors.push("texte trop long accepté");
  }
  const empty = validateStatRequest({ category: "clutch", text: "   " });
  if (!empty.ok || empty.value.text !== null || empty.value.page !== "inconnue") {
    errors.push("texte vide ou page absente mal gérés");
  }
  if (sanitizeRequestPage("https://ailleurs.example/x") !== "inconnue") errors.push("URL externe conservée");
  return errors;
}
