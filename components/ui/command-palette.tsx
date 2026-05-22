"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TeamMono } from "@/components/ui/team-mono";
import type { SearchResult } from "@/app/api/search/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function localeFromPath(pathname: string): string {
  return pathname.split("/")[1] ?? "fr";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = localeFromPath(pathname);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);

  // Track pathname to detect navigation without an effect
  const [prevPathname, setPrevPathname] = useState(pathname);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const debouncedQuery = useDebounce(query, 250);

  // ── Close on route change (React "setState during render" pattern) ───────
  // React re-renders immediately without showing intermediate state.
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
    setQuery("");
    setResults([]);
    setActive(0);
  }

  // ── Derived display state ────────────────────────────────────────────────
  // isPending: query typed but debounce hasn't fired yet → show spinner
  const isPending = query.length >= 2 && query !== debouncedQuery;
  const displayResults = debouncedQuery.length >= 2 ? results : [];
  const displayActive = debouncedQuery.length >= 2 ? active : 0;

  // ── Open / close ─────────────────────────────────────────────────────────

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActive(0);
  }, []);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Search (setState only in async callbacks, never synchronously) ───────

  useEffect(() => {
    if (debouncedQuery.length < 2) return;
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data: { results: SearchResult[] }) => {
        setResults(data.results);
        setActive(0);
      });
  }, [debouncedQuery]);

  // ── Keyboard navigation ──────────────────────────────────────────────────

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, displayResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && displayResults[displayActive]) {
      navigate(displayResults[displayActive]);
    }
  }

  // Keep active item visible
  useEffect(() => {
    const el = listRef.current?.children[displayActive] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [displayActive]);

  // ── Navigate ─────────────────────────────────────────────────────────────

  function navigate(result: SearchResult) {
    const href =
      result.type === "player"
        ? `/${locale}/joueurs/${result.slug}`
        : `/${locale}/equipes/${result.slug}`;
    router.push(href);
    close();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={close}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-[#16161A] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <svg
            className="w-4 h-4 text-white/30 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Rechercher un joueur ou une équipe…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
          />
          {isPending && (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin flex-shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/30 bg-white/[0.04] border border-white/[0.06] font-mono flex-shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results */}
        {displayResults.length > 0 && (
          <ul ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
            {displayResults.map((result, i) => (
              <li key={`${result.type}-${result.slug}`}>
                <button
                  onClick={() => navigate(result)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                    i === displayActive ? "bg-white/[0.05]" : ""
                  }`}
                >
                  {result.type === "player" ? (
                    <PlayerAvatar
                      firstName={result.label.split(" ")[0] ?? ""}
                      lastName={
                        result.label.split(" ").slice(1).join(" ") ?? ""
                      }
                      primaryColor={result.primaryColor}
                      secondaryColor={result.secondaryColor}
                      photoUrl={result.photoUrl}
                      size="xs"
                      showNum={false}
                    />
                  ) : (
                    <TeamMono
                      abbr={result.sub}
                      primaryColor={result.primaryColor}
                      secondaryColor={result.secondaryColor}
                      logoUrl={result.logoUrl}
                      size="xs"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {result.label}
                    </div>
                    {result.sub && (
                      <div className="text-[11px] text-white/40 font-sans">
                        {result.sub}
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                      result.type === "player"
                        ? "bg-violet-500/10 text-violet-400"
                        : "bg-cyan-500/10 text-cyan-400"
                    }`}
                  >
                    {result.type === "player" ? "joueur" : "équipe"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state */}
        {query.length >= 2 && !isPending && displayResults.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-white/30 font-mono">
            Aucun résultat pour « {query} »
          </div>
        )}

        {/* Hint */}
        {query.length < 2 && (
          <div className="px-4 py-4 flex items-center justify-between text-[11px] text-white/20">
            <span>Tapez au moins 2 caractères</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">
                  ↑↓
                </kbd>
                naviguer
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">
                  ↵
                </kbd>
                ouvrir
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
