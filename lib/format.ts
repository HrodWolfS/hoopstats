/**
 * Formate une stat avec N décimales, virgule à la française (« 19,6 »).
 * Retourne "—" si null/undefined. Sortie d'affichage uniquement : ne pas la
 * relire comme un nombre.
 */
export function stat(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return frDecimal(value.toFixed(decimals));
}

/** Décimale à la française : « 32.7 » → « 32,7 ». Laisse « — » tel quel. */
export function frDecimal(formatted: string): string {
  return formatted.replace(".", ",");
}

/** Formate un pourcentage (0.584 → "58,4"). */
export function pct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return frDecimal((value * 100).toFixed(decimals));
}

/** Formate un bilan W-L. */
export function record(wins: number, losses: number): string {
  return `${wins}–${losses}`;
}

/** Win percentage (0–100). */
export function winPct(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "0,0";
  return frDecimal(((wins / total) * 100).toFixed(1));
}
