"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { pct, signed as signedValue, stat } from "@/lib/format";
import { playerSeasonHref } from "@/lib/team-links";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { CsvExportButton } from "@/components/analytics/csv-export-button";
import { csvFilename, type CsvCell } from "@/lib/export";
import type { TrendRow, TrendsData } from "@/lib/stats/trends-data";
import {
  parseTrendDirection,
  parseTrendSort,
  parseTrendWindow,
  sortTrends,
  trendDelta,
  TREND_SORT_LABELS,
  TREND_SORTS,
  TREND_WINDOWS,
  DEFAULT_TREND_WINDOW,
  type TrendDirection,
  type TrendSort,
  type TrendWindow,
} from "@/lib/stats/trends";

const PAGE_SIZE = 25;

type State = { window: TrendWindow; sort: TrendSort; direction: TrendDirection };

type Props = {
  data: TrendsData;
  locale: string;
  liveSeason: string;
  /** Dernière mise à jour des box scores, ISO : datée dans l'export. */
  updatedAt: string | null;
};

/** Lit fenêtre, tri et sens dans l'adresse : une vue partagée s'ouvre telle quelle. */
export function TrendsViewFromUrl(props: Props) {
  const params = useSearchParams();
  const initial: State = {
    window: parseTrendWindow(params.get("fenetre")),
    sort: parseTrendSort(params.get("tri")),
    direction: parseTrendDirection(params.get("sens")),
  };
  return <TrendsView {...props} initial={initial} key={`${initial.window}-${initial.sort}-${initial.direction}`} />;
}

export const DEFAULT_TRENDS_STATE: State = { window: DEFAULT_TREND_WINDOW, sort: "pts", direction: "hausse" };

export function TrendsView({ data, locale, liveSeason, updatedAt, initial }: Props & { initial: State }) {
  const [state, setState] = useState<State>(initial);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const rows = useMemo(() => {
    const named = data.windows[state.window].map((row) => {
      const player = data.players[row.playerId];
      return { ...row, name: player ? `${player.firstName} ${player.lastName}` : "" };
    });
    return sortTrends(named, state.sort, state.direction);
  }, [data, state]);

  function update(next: Partial<State>) {
    const merged = { ...state, ...next };
    setState(merged);
    setVisible(PAGE_SIZE);
    const params = new URLSearchParams(window.location.search);
    const set = (key: string, value: string, fallback: string) =>
      value === fallback ? params.delete(key) : params.set(key, value);
    set("fenetre", String(merged.window), String(DEFAULT_TRENDS_STATE.window));
    set("tri", merged.sort, DEFAULT_TRENDS_STATE.sort);
    set("sens", merged.direction, DEFAULT_TRENDS_STATE.direction);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  const label = TREND_SORT_LABELS[state.sort];
  const shown = rows.slice(0, visible);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Segmented
          label="Fenêtre"
          options={TREND_WINDOWS.map((value) => ({ value, text: `${value} matchs` }))}
          value={state.window}
          onChange={(value) => update({ window: value })}
        />
        <Segmented
          label="Statistique"
          options={TREND_SORTS.map((value) => ({ value, text: TREND_SORT_LABELS[value].short }))}
          value={state.sort}
          onChange={(value) => update({ sort: value })}
        />
        <Segmented
          label="Sens"
          options={[
            { value: "hausse" as const, text: "En hausse" },
            { value: "baisse" as const, text: "En baisse" },
          ]}
          value={state.direction}
          onChange={(value) => update({ direction: value })}
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-white/40">
          {label.family} · {label.long} : {state.window} derniers matchs joués contre la moyenne de saison,{" "}
          {state.direction === "hausse" ? "plus forte hausse" : "plus forte baisse"} en tête. {rows.length} joueurs
          comparables.
        </p>
        <CsvExportButton
          dimension="trends"
          filename={csvFilename(["tendances", data.season, `${state.window}-matchs`, state.sort, state.direction])}
          table={{
            title: `Tendances NBA ${data.season} · ${state.window} derniers matchs · ${label.long} · ${state.direction === "hausse" ? "en hausse" : "en baisse"}`,
            updatedAt,
            headers: trendCsvHeaders(state.window),
            rows: shown.map((row, index) => trendCsvRow(row, index + 1, data)),
          }}
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-white/[0.06] bg-[#111114] px-4 py-8 text-center text-sm text-white/40">
          Aucun joueur n&apos;a encore assez de matchs joués pour une fenêtre de {state.window} matchs.
        </p>
      ) : (
        <ol className="divide-y divide-white/[0.04] rounded-2xl border border-white/[0.06] bg-[#111114]">
          {shown.map((row, index) => (
            <TrendItem
              key={row.playerId}
              row={row}
              rank={index + 1}
              sort={state.sort}
              data={data}
              locale={locale}
              liveSeason={liveSeason}
            />
          ))}
        </ol>
      )}

      {visible < rows.length && (
        <button
          type="button"
          onClick={() => setVisible((count) => count + PAGE_SIZE)}
          className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-white/60 transition hover:text-white"
        >
          Afficher {Math.min(PAGE_SIZE, rows.length - visible)} de plus
        </button>
      )}
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; text: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-white/30 sm:w-20">{label}</span>
      <div role="group" aria-label={label} className="flex min-w-0 flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-2.5 py-1 text-xs transition ${
              option.value === value
                ? "bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/30"
                : "text-white/50 hover:text-white"
            }`}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
}

const NBA_DATE = { day: "numeric", month: "short", timeZone: "America/New_York" } as const;

const ISO_NBA_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });

function trendCsvHeaders(window: TrendWindow): string[] {
  return [
    "Rang",
    "Joueur",
    "Équipe",
    "Premier match",
    "Dernier match",
    ...TREND_SORTS.flatMap((sort) => {
      const name = TREND_SORT_LABELS[sort].short;
      return [`${name} ${window} matchs`, `${name} saison`, `${name} écart`];
    }),
    `Titularisations sur ${window}`,
  ];
}

/** Valeurs arrondies comme à l'écran ; TS% en pourcentage. */
function trendCsvRow(row: TrendRow, rank: number, data: TrendsData): CsvCell[] {
  const player = data.players[row.playerId];
  const value = (sort: TrendSort, raw: number | null) =>
    raw == null ? null : sort === "ts" ? pct(raw) : stat(raw);
  return [
    rank,
    player ? `${player.firstName} ${player.lastName}` : "",
    row.multiTeam ? `${row.teamAbbr} (2 éq.)` : row.teamAbbr,
    ISO_NBA_DATE.format(new Date(row.from)),
    ISO_NBA_DATE.format(new Date(row.to)),
    ...TREND_SORTS.flatMap((sort) => [
      value(sort, row.recent[sort]),
      value(sort, row.season[sort]),
      value(sort, trendDelta(row, sort)),
    ]),
    Math.round(row.recent.startRate * row.window),
  ];
}

function formatValue(sort: TrendSort, value: number | null): string {
  return sort === "ts" ? (value == null ? "—" : `${pct(value)} %`) : stat(value);
}

function signed(sort: TrendSort, delta: number | null): string {
  if (delta == null) return "—";
  return signedValue(sort === "ts" ? delta * 100 : delta);
}

function TrendItem({
  row,
  rank,
  sort,
  data,
  locale,
  liveSeason,
}: {
  row: TrendRow;
  rank: number;
  sort: TrendSort;
  data: TrendsData;
  locale: string;
  liveSeason: string;
}) {
  const player = data.players[row.playerId];
  const team = data.teams[row.teamAbbr];
  if (!player) return null;
  const delta = trendDelta(row, sort);
  const others = TREND_SORTS.filter((other) => other !== sort);
  const from = new Date(row.from).toLocaleDateString("fr-FR", NBA_DATE);
  const to = new Date(row.to).toLocaleDateString("fr-FR", NBA_DATE);

  return (
    <li className="flex gap-3 px-3 py-3 sm:px-4">
      <span className="w-5 shrink-0 pt-2.5 text-right font-mono text-[11px] text-white/25">{rank}</span>
      <PlayerAvatar
        firstName={player.firstName}
        lastName={player.lastName}
        primaryColor={team?.primaryColor}
        secondaryColor={team?.secondaryColor}
        photoUrl={player.photoUrl}
        size="sm"
        showNum={false}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <Link
            href={playerSeasonHref(locale, player.slug, data.season, liveSeason)}
            className="truncate text-sm font-semibold hover:text-orange-300"
          >
            {player.firstName} {player.lastName}
          </Link>
          <span
            className={`shrink-0 font-display text-lg font-semibold tabular-nums ${
              delta == null || Math.abs(delta) < (sort === "ts" ? 0.0005 : 0.05)
                ? "text-white/40"
                : delta > 0
                  ? "text-emerald-400"
                  : "text-rose-400"
            }`}
          >
            {signed(sort, delta)}
          </span>
        </div>
        <p className="truncate text-[11px] text-white/40">
          {row.teamAbbr}
          {row.multiTeam && " · 2 éq."} · {from} → {to}
        </p>
        <p className="mt-1 font-mono text-[11px] tabular-nums text-white/70">
          {TREND_SORT_LABELS[sort].short} {formatValue(sort, row.recent[sort])}
          <span className="text-white/30"> · saison {formatValue(sort, row.season[sort])}</span>
        </p>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-white/30">
          {others.map((other) => (
            <span key={other}>
              {TREND_SORT_LABELS[other].short} {formatValue(other, row.recent[other])}{" "}
              <span className={deltaTone(other, trendDelta(row, other))}>({signed(other, trendDelta(row, other))})</span>
            </span>
          ))}
          <span>
            Tit. {Math.round(row.recent.startRate * row.window)}/{row.window}
            <span className="text-white/20"> (saison {Math.round(row.season.startRate * 100)} %)</span>
          </span>
        </div>
      </div>
    </li>
  );
}

/** Gris sous l'arrondi affiché : « +0,0 » ne doit pas paraître en hausse. */
function deltaTone(sort: TrendSort, delta: number | null): string {
  if (delta == null || Math.abs(delta) < (sort === "ts" ? 0.0005 : 0.05)) return "text-white/25";
  return delta > 0 ? "text-emerald-400/70" : "text-rose-400/70";
}
