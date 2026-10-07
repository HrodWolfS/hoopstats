"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Rangée de pastilles défilante qui amène la pastille active
 * (`aria-current="page"`) au centre. Sur mobile, une saison ancienne serait
 * sinon hors écran. Seul le défilement horizontal de la rangée bouge : la
 * page reste où elle est, contrairement à `scrollIntoView`.
 */
export function ActiveChipRow({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const row = ref.current;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !active) return;
    row.scrollLeft = active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2;
  });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
