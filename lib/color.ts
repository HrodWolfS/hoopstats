/**
 * Retourne "#0A0A0B" ou "#ffffff" selon la luminance du background hex.
 * Utilisé pour assurer le contraste sur les gradients d'équipes.
 */
export function readable(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0A0A0B" : "#ffffff";
}
