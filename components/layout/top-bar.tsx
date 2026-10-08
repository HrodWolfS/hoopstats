"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ALL_NAV_ITEMS, isItemActive } from "./sidebar-client";
import { useSeasonScope } from "./season-scope";
import { neighbourSeasons, pageHasSeason, seasonScopeHref } from "@/lib/season-scope";
import { sendAnalyticsEvent } from "@/components/analytics/analytics-event";
import { seasonChangeDimension } from "@/lib/page-tracking";

// ─── Season Selector ─────────────────────────────────────────────────────────

/**
 * Place réservée, vide, tant que la page n'a pas transmis ses saisons : rien
 * ne bouge à l'arrivée du sélecteur, et aucune saison n'est affichée à tort.
 */
function SeasonSelectorPlaceholder() {
  return <div aria-hidden="true" className="h-[30px] w-[150px] md:w-[200px]" />;
}

function SeasonSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scope = useSeasonScope();
  const [open, setOpen] = useState(false);

  if (!scope) return pageHasSeason(pathname) ? <SeasonSelectorPlaceholder /> : null;
  if (scope.seasons.length === 0) return null;

  const { seasons, season } = scope;
  const { older, newer } = neighbourSeasons(scope);

  function navigate(s: string) {
    const dimension = s === season ? null : seasonChangeDimension("barre", s);
    if (dimension) sendAnalyticsEvent("season_change", dimension);
    router.push(seasonScopeHref(scope!, pathname, searchParams.toString(), s));
  }

  function selectSeason(s: string) {
    navigate(s);
    setOpen(false);
  }

  const canGoNewer = newer !== null;
  const canGoOlder = older !== null;

  const arrowClass =
    "flex items-center justify-center h-[30px] w-7 rounded-md border border-white/10 bg-white/[0.02] transition text-white/50";

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => older && navigate(older)}
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

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/80 hover:border-white/20 transition"
        >
          <span className="hidden md:inline font-mono">SAISON</span>
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
              const showDivider = s === "2014-15" && i > 0;
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
                      s === season ? "text-orange-400" : "text-white/70"
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

      <button
        onClick={() => newer && navigate(newer)}
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

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] md:hidden bg-[#111114] border-r border-white/[0.06] flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header drawer */}
        <div className="flex items-center justify-between px-5 pt-6 pb-7">
          <Link
            href="/fr"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center font-display font-bold text-[12px] text-white">
              h.
            </div>
            <span className="font-display font-semibold tracking-tight text-[15px]">
              hoopstats
            </span>
          </Link>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-7 w-7 rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition"
            aria-label="Fermer le menu"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="px-3 space-y-0.5 flex-1 overflow-y-auto">
          {ALL_NAV_ITEMS.map((item) => {
            const active = isItemActive(item, pathname);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-sm transition ${
                  active
                    ? "bg-white/[0.06] text-white"
                    : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className={active ? "text-orange-400" : ""}>
                  {item.icon}
                </span>
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-400" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <header className="sticky top-0 z-20 backdrop-blur-xl bg-bg-base/70 border-b border-white/[0.06]">
        <div className="px-4 md:px-8 lg:px-12 max-w-[1400px] mx-auto h-14 flex items-center gap-2 md:gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden flex items-center justify-center h-8 w-8 text-white/60 hover:text-white/90 transition shrink-0"
            aria-label="Ouvrir le menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          {/* Search — flex-1 : s'étire et rétrécit en premier */}
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
            className="flex items-center gap-2.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/40 hover:border-white/20 hover:text-white/80 transition flex-1 min-w-0 max-w-[440px]"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="shrink-0"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="flex-1 text-left truncate">Chercher…</span>
            <kbd className="hidden md:inline text-[10px] font-mono px-1 py-0 rounded bg-white/[0.06] text-white/40 shrink-0">
              ⌘K
            </kbd>
          </button>

          {/* Season selector — poussé à droite */}
          <div className="shrink-0 ml-auto">
            <SeasonSelector />
          </div>
        </div>
      </header>
    </>
  );
}
