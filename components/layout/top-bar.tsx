"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ALL_SEASONS, ALL_HISTORY_SEASONS, CURRENT_SEASON } from "@/lib/nba";

function SeasonSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Pages équipe/rookies/playoffs/saisons : afficher tout l'historique disponible (1980-81+)
  const isHistoryPage =
    pathname.includes("/equipes/") ||
    pathname.includes("/rookies") ||
    pathname.includes("/playoffs") ||
    pathname.includes("/saisons");
  const seasons = isHistoryPage ? ALL_HISTORY_SEASONS : ALL_SEASONS;

  const season = searchParams.get("saison") ?? CURRENT_SEASON;

  function navigate(s: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (s === CURRENT_SEASON) {
      params.delete("saison");
    } else {
      params.set("saison", s);
    }
    const query = params.toString();
    router.push(pathname + (query ? `?${query}` : ""));
  }

  function selectSeason(s: string) {
    navigate(s);
    setOpen(false);
  }

  const idx = seasons.indexOf(season);
  // seasons est du plus récent (idx 0) au plus ancien (idx last)
  // idx === -1 si la saison courante n'est pas dans la liste (page non-historique)
  const canGoNewer = idx > 0;
  const canGoOlder = idx >= 0 && idx < seasons.length - 1;

  const arrowClass =
    "flex items-center justify-center h-[30px] w-7 rounded-md border border-white/10 bg-white/[0.02] transition text-white/50";

  return (
    <div className="flex items-center gap-1">
      {/* ← saison précédente (plus ancienne) */}
      <button
        onClick={() => canGoOlder && navigate(seasons[idx + 1])}
        disabled={!canGoOlder}
        aria-label="Saison précédente"
        className={`${arrowClass} ${canGoOlder ? "hover:border-white/20 hover:text-white/80" : "opacity-25 cursor-not-allowed"}`}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {/* Sélecteur principal */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/80 hover:border-white/20 transition"
        >
          <span className="font-mono">SAISON</span>
          <span className="font-display font-semibold text-white">
            {season}
          </span>
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
          <div className="absolute right-0 top-full mt-1.5 w-44 rounded-lg border border-white/10 bg-bg-card shadow-2xl py-1 z-30 max-h-72 overflow-y-auto">
            {seasons.map((s, i) => {
              const showDivider = isHistoryPage && s === "2014-15" && i > 0;
              return (
                <div key={s}>
                  {showDivider && (
                    <div className="mx-3 my-1 border-t border-white/[0.06]">
                      <span className="text-[9px] text-white/20 font-mono uppercase tracking-wider">
                        Historique
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => selectSeason(s)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/[0.05] transition flex items-center justify-between ${
                      s === season ? "text-violet-400" : "text-white/70"
                    }`}
                  >
                    <span className="font-mono">{s}</span>
                    {s === season && <span className="text-[10px]">●</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* → saison suivante (plus récente) */}
      <button
        onClick={() => canGoNewer && navigate(seasons[idx - 1])}
        disabled={!canGoNewer}
        aria-label="Saison suivante"
        className={`${arrowClass} ${canGoNewer ? "hover:border-white/20 hover:text-white/80" : "opacity-25 cursor-not-allowed"}`}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
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
