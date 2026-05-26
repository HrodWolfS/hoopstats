"use client";

import { useSidebar } from "./sidebar-context";

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <main
      className={`flex-1 min-w-0 flex flex-col transition-[padding] duration-200 ${
        collapsed ? "md:pl-[56px]" : "md:pl-[220px]"
      }`}
    >
      {children}
    </main>
  );
}
