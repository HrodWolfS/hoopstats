/**
 * Règle d'arrondi commune (DECISIONS.md, 013) : cartes, tableaux, graphiques,
 * images de partage et exports CSV passent tous par ces fonctions.
 *
 * - moyennes par match, notes et écarts : 1 décimale (`stat`, `signed`) ;
 * - pourcentages : sur 100, 1 décimale (`pct`) ;
 * - totaux et compteurs : entier, milliers séparés (`count`) ;
 * - on calcule sur les valeurs brutes et on n'arrondit qu'à l'affichage ;
 * - virgule décimale, vrai signe moins, « — » pour une valeur absente.
 *
 * Sorties d'affichage uniquement : ne pas les relire comme des nombres.
 */

/** Formate une stat avec N décimales, virgule à la française (« 19,6 »). */
export function stat(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  // « -0,0 » n'a pas de sens : une valeur qui s'arrondit à zéro perd son signe.
  const fixed = Number(value.toFixed(decimals)) === 0 ? (0).toFixed(decimals) : value.toFixed(decimals);
  return minus(frDecimal(fixed));
}

/** Décimale à la française : « 32.7 » → « 32,7 ». Laisse « — » tel quel. */
export function frDecimal(formatted: string): string {
  return formatted.replace(".", ",");
}

/** Formate un pourcentage (0.584 → "58,4"). */
export function pct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return stat(value * 100, decimals);
}

/** Entier en notation française (« 1 234 »), ou tiret. */
export function count(value: number | null | undefined): string {
  if (value == null) return "—";
  return Math.round(value).toLocaleString("fr-FR").replace("-", "−");
}

/**
 * Écart signé (« +3,2 », « −1,0 »). Un écart qui s'arrondit à zéro s'écrit
 * « 0,0 », sans signe : afficher « +0,0 » ferait croire à une hausse.
 */
export function signed(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  const text = stat(Math.abs(value), decimals);
  if (Number(Math.abs(value).toFixed(decimals)) === 0) return text;
  return `${value > 0 ? "+" : "−"}${text}`;
}

/** Formate un bilan W-L. */
export function record(wins: number, losses: number): string {
  return `${wins}–${losses}`;
}

/** Win percentage (0–100). */
export function winPct(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "0,0";
  return stat((wins / total) * 100);
}

/** Vrai signe moins (U+2212) à la place du trait d'union. */
function minus(text: string): string {
  return text.startsWith("-") ? `−${text.slice(1)}` : text;
}
