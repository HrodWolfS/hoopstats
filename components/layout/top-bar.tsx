"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ALL_SEASONS, CURRENT_SEASON } from "@/lib/nba";

function SeasonSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const season = searchParams.get("saison") ?? CURRENT_SEASON;

  function selectSeason(s: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (s === CURRENT_SEASON) {
      params.delete("saison");
    } else {
      params.set("saison", s);
    }
    const query = params.toString();
    router.push(pathname + (query ? `?${query}` : ""));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/80 hover:border-white/20 transition"
      >
        <span className="font-mono">SAISON</span>
        <span className="font-display font-semibold text-white">{season}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-lg border border-white/10 bg-bg-card shadow-2xl py-1 z-30">
          {ALL_SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => selectSeason(s)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/[0.05] transition flex items-center justify-between ${
                s === season ? "text-violet-400" : "text-white/70"
              }`}
            >
              <span className="font-mono">{s}</span>
              {s === season && <span className="text-[10px]">●</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-bg-base/70 border-b border-white/[0.06]">
      <div className="px-8 lg:px-12 max-w-[1400px] mx-auto h-14 flex items-center gap-3">
        {/* Search — opens CommandPalette via ⌘K */}
        <button
          onClick={() =>
            document.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              }),
            )
          }
          className="flex items-center gap-2.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/40 hover:border-white/20 hover:text-white/80 transition w-[280px]"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span className="flex-1 text-left">Chercher…</span>
          <kbd className="text-[10px] font-mono px-1 py-0 rounded bg-white/[0.06] text-white/40">
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        {/* Season selector — Suspense géré dans le layout */}
        <SeasonSelector />

        {/* Bell */}
        <button className="flex items-center justify-center h-8 w-8 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition text-white/60">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-[10px] font-display font-bold select-none">
          ME
        </div>
      </div>
    </header>
  );
}
