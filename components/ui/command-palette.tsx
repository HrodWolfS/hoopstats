"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { TeamMono } from "@/components/ui/team-mono";
import { sendAnalyticsEvent } from "@/components/analytics/analytics-event";
import { MIN_QUERY_LENGTH, type SearchOutcome, type SearchResult } from "@/lib/search";

type Outcome = "results" | "empty";

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
  const [approximate, setApproximate] = useState(false);
  const [settledQuery, setSettledQuery] = useState("");
  const [active, setActive] = useState(0);
  // Issue de la dernière recherche, mesurée à la fermeture : une recherche
  // compte une fois, pas à chaque lettre tapée. La requête n'est jamais envoyée.
  const outcomeRef = useRef<Outcome | null>(null);

  // Track pathname to detect navigation without an effect
  const [prevPathname, setPrevPathname] = useState(pathname);

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
  const isPending =
    query.length >= MIN_QUERY_LENGTH && (query !== debouncedQuery || settledQuery !== debouncedQuery);
  const displayResults = debouncedQuery.length >= MIN_QUERY_LENGTH ? results : [];
  const displayActive = debouncedQuery.length >= MIN_QUERY_LENGTH ? active : 0;

  // ── Open / close ─────────────────────────────────────────────────────────

  const close = useCallback((selected = false) => {
    const outcome = outcomeRef.current;
    if (selected) sendAnalyticsEvent("global_search", "selected");
    else if (outcome) sendAnalyticsEvent("global_search", outcome === "empty" ? "empty" : "no_click");
    outcomeRef.current = null;
    setOpen(false);
    setQuery("");
    setResults([]);
    setSettledQuery("");
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

  // ── Search (setState only in async callbacks, never synchronously) ───────

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) return;
    // Une réponse lente ne doit pas écraser celle d'une saisie plus récente.
    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: SearchOutcome) => {
        setResults(data.results);
        setApproximate(data.approximate);
        setSettledQuery(debouncedQuery);
        setActive(0);
        outcomeRef.current = data.results.length > 0 ? "results" : "empty";
      })
      .catch(() => {});
    return () => controller.abort();
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
    close(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[15vh] px-4"
      onClick={() => close()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche globale"
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
          {/* Focus dès le montage, dans le même geste que l'ouverture : une
              frappe immédiate n'est pas perdue et le clavier iOS s'ouvre. */}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            type="search"
            role="combobox"
            aria-expanded={displayResults.length > 0}
            aria-controls="global-search-results"
            aria-activedescendant={
              displayResults[displayActive] ? `global-search-option-${displayActive}` : undefined
            }
            aria-autocomplete="list"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Joueur, équipe, surnom…"
            className="flex-1 min-w-0 bg-transparent text-base sm:text-sm text-white placeholder:text-white/30 outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {isPending && (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin flex-shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white/30 bg-white/[0.04] border border-white/[0.06] font-mono flex-shrink-0">
            Esc
          </kbd>
        </div>

        {/* Results */}
        {approximate && displayResults.length > 0 && (
          <p className="px-4 pt-3 text-[11px] text-amber-300/80">
            Aucune correspondance exacte pour « {settledQuery} » : orthographes proches
          </p>
        )}
        {displayResults.length > 0 && (
          <ul
            ref={listRef}
            id="global-search-results"
            role="listbox"
            aria-label="Résultats"
            className="max-h-[50vh] sm:max-h-80 overflow-y-auto py-1.5"
          >
            {displayResults.map((result, i) => (
              <li
                key={`${result.type}-${result.slug}`}
                id={`global-search-option-${i}`}
                role="option"
                aria-selected={i === displayActive}
              >
                <button
                  tabIndex={-1}
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
                    {(result.sub || result.matchedAlias) && (
                      <div className="text-[11px] leading-snug text-white/40 font-sans">
                        {[result.matchedAlias && `« ${result.matchedAlias} »`, result.sub]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${
                      result.type === "player"
                        ? "bg-orange-500/10 text-orange-400"
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
        {query.length >= MIN_QUERY_LENGTH && !isPending && displayResults.length === 0 && (
          <div className="px-4 py-6 text-sm text-white/40 space-y-2">
            <p className="text-white/60">Aucun joueur ni équipe pour « {query} ».</p>
            <p className="text-[12px] leading-relaxed">
              La recherche couvre les 30 équipes et tous les joueurs ayant disputé
              un match NBA depuis 1980-81. Essayez le nom de famille seul, ou
              parcourez{" "}
              <Link href={`/${locale}/joueurs`} className="underline underline-offset-2 hover:text-white/80" onClick={() => close()}>
                les joueurs
              </Link>{" "}
              et{" "}
              <Link href={`/${locale}/equipes`} className="underline underline-offset-2 hover:text-white/80" onClick={() => close()}>
                les équipes
              </Link>
              .
            </p>
          </div>
        )}

        {/* Hint */}
        {query.length < MIN_QUERY_LENGTH && (
          <div className="px-4 py-4 flex items-center justify-between gap-3 text-[11px] text-white/30">
            <span>Joueurs depuis 1980-81, équipes, surnoms (« Shaq », « Sixers »)</span>
            <div className="hidden sm:flex items-center gap-3 shrink-0">
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
