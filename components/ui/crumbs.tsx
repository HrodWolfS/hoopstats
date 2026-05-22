import Link from "next/link";

type CrumbItem = {
  label: string;
  href?: string;
};

type CrumbsProps = {
  items: CrumbItem[];
};

export function Crumbs({ items }: CrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-white/40">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="hover:text-white/80 transition">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "text-white/80" : ""}>{item.label}</span>
            )}
            {!last && <span className="text-white/20">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
