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

/** Fond des cartes sombres du site, référence des calculs de contraste. */
const DARK_SURFACE = "#111114";

/** Contraste minimal WCAG pour un élément graphique ou un grand texte. */
const MIN_ACCENT_CONTRAST = 3;

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((start) => parseInt(h.slice(start, start + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(
  a: [number, number, number],
  b: [number, number, number],
) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Couleur d'équipe utilisable en texte ou en trait sur fond sombre.
 *
 * Certaines couleurs officielles sont noires ou presque (Spurs, Nets) : telles
 * quelles, un chiffre ou un radar disparaît sur le fond du site. La teinte est
 * éclaircie vers le blanc jusqu'au contraste minimal, sans changer les
 * couleurs déjà lisibles.
 */
export function accentOnDark(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const surface = channels(DARK_SURFACE);
  const base = channels(hex);
  for (let mix = 0; mix <= 1; mix += 0.05) {
    const mixed = base.map((value) =>
      Math.round(value + (255 - value) * mix),
    ) as [number, number, number];
    if (contrastRatio(mixed, surface) >= MIN_ACCENT_CONTRAST) {
      return mix === 0
        ? hex
        : `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    }
  }
  return "#ffffff";
}

/** Auto-contrôles exécutés par `pnpm health:data`. */
export function validateAccentOnDark(): string[] {
  const errors: string[] = [];
  const surface = channels(DARK_SURFACE);
  if (accentOnDark("#ED174C") !== "#ED174C") {
    errors.push("couleur déjà lisible modifiée à tort");
  }
  for (const hex of ["#000000", "#061922", "#0C2340"]) {
    if (
      contrastRatio(channels(accentOnDark(hex)), surface) < MIN_ACCENT_CONTRAST
    ) {
      errors.push(`couleur sombre ${hex} toujours illisible`);
    }
  }
  return errors;
}
