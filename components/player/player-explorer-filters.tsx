"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getPlayerMetric } from "@/lib/stats/metrics";
import {
  availableMetricModes,
  PLAYER_EXPLORER_METRICS,
  type PlayerExplorerParams,
} from "@/lib/stats/player-query";

const POSITIONS = ["G", "PG", "SG", "F", "SF", "PF", "C"];
const MODE_LABELS = {
  perGame: "Par match",
  total: "Total estimé",
  per36: "Par 36 minutes",
} as const;

const inputClass =
  "h-10 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-sm text-white/70 outline-none transition focus:border-orange-500/40 focus:ring-2 focus:ring-orange-500/10";

/**
 * Filtres de l'explorateur : la recherche filtre à chaque frappe, saison et
 * statistique restent visibles, le reste se déplie au besoin. Chaque
 * changement réécrit l'URL (partageable) et relance le rendu serveur.
 */
export function PlayerExplorerFilters({
  locale,
  params,
  seasons,
  teams,
}: {
  locale: string;
  params: PlayerExplorerParams;
  seasons: string[];
  teams: Array<{ abbr: string; city: string; name: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.query);
  const advancedCount = [
    params.team !== "",
    params.position !== "",
    params.mode !== "perGame",
    params.direction !== (getPlayerMetric(params.metric).higherIsBetter ? "desc" : "asc"),
    params.minimumGamesExplicit,
    params.minimumMinutes > 0,
  ].filter(Boolean).length;
  const [open, setOpen] = useState(advancedCount > 0);

  const navigate = (changes: Record<string, string | null>) => {
    // URL lue au moment de naviguer : la fin d'un délai de frappe ne doit pas
    // réécrire des paramètres changés entre-temps.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    const search = next.toString();
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    });
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === (searchParams.get("q") ?? "")) return;
    const timer = setTimeout(() => navigate({ q: trimmed || null }), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const modes = availableMetricModes(params.metric);
  const seasonOptions = seasons.includes(params.season) ? seasons : [params.season, ...seasons];

  return (
    <form
      method="get"
      action={`/${locale}/joueurs`}
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ q: query.trim() || null });
      }}
      className="rounded-2xl border border-white/[0.07] bg-[#111114] p-4 md:p-5 space-y-3"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
        <label className="col-span-2 space-y-1.5 sm:col-span-1">
          <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
            Joueur
          </span>
          <span className="relative block">
            <svg
              aria-hidden
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${pending ? "text-orange-400 animate-pulse" : "text-white/30"}`}
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
              className={`${inputClass} w-full pl-9`}
              type="search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom ou prénom…"
              autoComplete="off"
            />
          </span>
        </label>
        <FilterSelect
          label="Saison"
          name="saison"
          value={params.season}
          onChange={(value) => navigate({ saison: value })}
          options={seasonOptions.map((season) => ({ value: season, label: season }))}
        />
        <FilterSelect
          label="Statistique"
          name="stat"
          value={params.metric}
          // Ordre et mode dépendent de la statistique : on repart de ses défauts.
          onChange={(value) => navigate({ stat: value, ordre: null, mode: null })}
          options={PLAYER_EXPLORER_METRICS.map((metric) => ({
            value: metric,
            label: getPlayerMetric(metric).label,
          }))}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="filtres-avances"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-1 text-xs text-white/50 hover:text-white/80 transition"
        >
          <svg
            aria-hidden
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
          {open ? "Moins de filtres" : "Plus de filtres"}
          {advancedCount > 0 && (
            <span className="rounded-full bg-orange-500/15 px-1.5 text-[10px] font-mono text-orange-300">
              {advancedCount}
            </span>
          )}
        </button>
        {(params.query || advancedCount > 0) && (
          <Link
            href={`/${locale}/joueurs?saison=${params.season}`}
            onClick={() => setQuery("")}
            className="h-9 inline-flex items-center px-1 text-xs text-white/40 hover:text-white/70 transition"
          >
            Réinitialiser
          </Link>
        )}
      </div>

      {open && (
        <div
          id="filtres-avances"
          className="grid grid-cols-2 gap-3 border-t border-white/[0.05] pt-4 lg:grid-cols-6"
        >
          <FilterSelect
            label="Équipe"
            name="equipe"
            value={params.team}
            onChange={(value) => navigate({ equipe: value || null })}
            options={[
              { value: "", label: "Toutes" },
              ...teams.map((team) => ({
                value: team.abbr,
                label: `${team.abbr} — ${team.city} ${team.name}`,
              })),
            ]}
          />
          <FilterSelect
            label="Position"
            name="position"
            value={params.position}
            onChange={(value) => navigate({ position: value || null })}
            options={[
              { value: "", label: "Toutes" },
              ...POSITIONS.map((position) => ({ value: position, label: position })),
            ]}
          />
          {modes.length > 1 && (
            <FilterSelect
              label="Mode"
              name="mode"
              value={params.mode}
              onChange={(value) => navigate({ mode: value })}
              options={modes.map((mode) => ({ value: mode, label: MODE_LABELS[mode] }))}
            />
          )}
          <FilterSelect
            label="Ordre"
            name="ordre"
            value={params.direction}
            onChange={(value) => navigate({ ordre: value })}
            options={[
              { value: "desc", label: "Décroissant" },
              { value: "asc", label: "Croissant" },
            ]}
          />
          <NumberFilter
            key={`mj-${params.minimumGames}`}
            label="Matchs min."
            name="min_mj"
            value={params.minimumGames}
            max={82}
            onCommit={(value) => navigate({ min_mj: value })}
          />
          <NumberFilter
            key={`min-${params.minimumMinutes}`}
            label="Minutes min."
            name="min_min"
            value={params.minimumMinutes}
            max={48}
            onCommit={(value) => navigate({ min_min: value === "0" ? null : value })}
          />
        </div>
      )}
    </form>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
        {label}
      </span>
      <select
        className={`${inputClass} w-full`}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Champ numérique appliqué en sortie de champ ou sur Entrée, pas à chaque chiffre. */
function NumberFilter({
  label,
  name,
  value,
  max,
  onCommit,
}: {
  label: string;
  name: string;
  value: number;
  max: number;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    if (draft.trim() !== "" && draft !== String(value)) onCommit(draft.trim());
  };
  return (
    <label className="space-y-1.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
        {label}
      </span>
      <input
        className={`${inputClass} w-full tabular-nums`}
        type="number"
        inputMode="numeric"
        name={name}
        min="0"
        max={max}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
}
