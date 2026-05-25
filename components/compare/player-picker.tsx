"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/ui/player-avatar";

type SearchHit = {
  type: string;
  slug: string;
  label: string;
  sub: string;
  photoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
};

type PlayerPickerProps = {
  slot: "j1" | "j2";
  currentSlug: string | null;
  currentName: string | null;
  primaryColor: string | null;
  otherSlug: string | null;
  locale: string;
};

export function PlayerPicker({
  slot,
  currentSlug,
  currentName,
  primaryColor,
  otherSlug,
  locale,
}: PlayerPickerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search — only runs when query >= 2 chars
  useEffect(() => {
    if (query.length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const playerHits: SearchHit[] = (data.results ?? []).filter(
          (r: SearchHit) => r.type === "player",
        );
        setResults(playerHits.slice(0, 6));
        setOpen(playerHits.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const buildUrl = useCallback(
    (slug: string) => {
      const params = new URLSearchParams();
      if (slot === "j1") {
        params.set("j1", slug);
        if (otherSlug) params.set("j2", otherSlug);
      } else {
        if (otherSlug) params.set("j1", otherSlug);
        params.set("j2", slug);
      }
      return `/${locale}/comparer?${params.toString()}`;
    },
    [slot, otherSlug, locale],
  );

  const clearUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (slot === "j1") {
      if (otherSlug) params.set("j2", otherSlug);
    } else {
      if (otherSlug) params.set("j1", otherSlug);
    }
    const qs = params.toString();
    return `/${locale}/comparer${qs ? `?${qs}` : ""}`;
  }, [slot, otherSlug, locale]);

  function handleSelect(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    router.push(buildUrl(hit.slug));
  }

  function handleClear() {
    router.push(clearUrl());
  }

  // Selected state
  if (currentSlug && currentName) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
        style={
          primaryColor ? { borderLeft: `3px solid ${primaryColor}` } : undefined
        }
      >
        <span className="flex-1 text-sm text-white font-medium truncate">
          {currentName}
        </span>
        <button
          onClick={handleClear}
          className="text-white/40 hover:text-white/80 transition flex-shrink-0"
          aria-label="Retirer ce joueur"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  // Search state
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (v.length < 2) {
              setResults([]);
              setOpen(false);
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Chercher un joueur…"
          className="w-full rounded-xl border border-white/10 bg-white/[0.02] pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.04] transition"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-3 w-3 rounded-full border border-white/20 border-t-white/60 animate-spin" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl border border-white/[0.08] bg-[#1A1A1F] shadow-xl overflow-hidden">
          {results.map((hit) => {
            const [firstName, ...rest] = hit.label.split(" ");
            const lastName = rest.join(" ");
            return (
              <button
                key={hit.slug}
                onMouseDown={() => handleSelect(hit)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] transition text-left"
              >
                <PlayerAvatar
                  firstName={firstName}
                  lastName={lastName || firstName}
                  primaryColor={hit.primaryColor}
                  secondaryColor={hit.secondaryColor}
                  photoUrl={hit.photoUrl}
                  size="xs"
                  showNum={false}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{hit.label}</div>
                  {hit.sub && (
                    <div className="text-xs text-white/40 truncate">
                      {hit.sub}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
