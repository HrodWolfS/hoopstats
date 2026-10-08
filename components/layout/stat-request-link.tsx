"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Lien vers le formulaire de demande, qui transmet la page courante. */
export function StatRequestLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const href = pathname && !pathname.endsWith("/demande") ? `/fr/demande?depuis=${encodeURIComponent(pathname)}` : "/fr/demande";
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
