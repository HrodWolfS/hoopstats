import Link from "next/link";

type CrumbItem = {
  label: string;
  href?: string;
};

type CrumbsProps = {
  items: CrumbItem[];
};

/**
 * Fil d'Ariane sur une ligne. Le dernier libellé (souvent un nom long,
 * « Giannis Antetokounmpo ») se tronque au lieu de pousser hors de l'écran
 * ce qui est à côté (bouton Partager) à 320 px.
 */
export function Crumbs({ items }: CrumbsProps) {
  return (
    <nav className="flex min-w-0 items-center gap-1.5 text-xs text-white/40">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className={`flex items-center gap-1.5 ${last ? "min-w-0" : "shrink-0"}`}>
            {item.href ? (
              <Link href={item.href} className="truncate hover:text-white/80 transition">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "truncate text-white/80" : ""} title={last ? item.label : undefined}>
                {item.label}
              </span>
            )}
            {!last && <span className="text-white/20">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
