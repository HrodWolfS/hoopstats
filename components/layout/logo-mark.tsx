// Symbole hoopstats, version petite taille sur fond sombre (design/logo/final/symbole-petit-couleur-fond-sombre.svg),
// recadré au plus près des formes.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="11 12 228 228" className={className} aria-hidden="true">
      <path fill="#F97316" d="M18 70 A46 46 0 1 0 110 70 A46 46 0 1 0 18 70 Z" />
      <path fill="#FFFFFF" d="M43.79 228 L80.74 228 L196.21 28 L159.26 28 Z" />
      <path
        fill="#FFFFFF"
        fillRule="evenodd"
        d="M128 196 A52 32 0 1 0 232 196 A52 32 0 1 0 128 196 Z M150 196 A30 14 0 1 0 210 196 A30 14 0 1 0 150 196 Z"
      />
    </svg>
  );
}
