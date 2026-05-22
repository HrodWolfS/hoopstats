/** Formate une stat avec N décimales. Retourne "—" si null/undefined. */
export function stat(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return value.toFixed(decimals);
}

/** Formate un pourcentage (0.584 → "58.4"). */
export function pct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return (value * 100).toFixed(decimals);
}

/** Formate un bilan W-L. */
export function record(wins: number, losses: number): string {
  return `${wins}–${losses}`;
}

/** Win percentage (0–100). */
export function winPct(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "0.0";
  return ((wins / total) * 100).toFixed(1);
}
