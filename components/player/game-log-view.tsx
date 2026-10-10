"use client";

import Link from "next/link";
import { teamSeasonHref } from "@/lib/team-links";
import { useState } from "react";
import { ColumnHeader, ColumnHelpPanel } from "@/components/ui/column-help";
import { signed, stat } from "@/lib/format";
import { parseMinutes } from "@/lib/stats/season-aggregation";

/** Première saison couverte par les box scores en base. */
const GAME_LOGS_SINCE = "2025-26";
const PAGE_SIZE = 20;

export type PlayerGameLog = {
  id: string;
  /** jj/mm, pour le tableau. */
  date: string;
  /** jj/mm/aa, pour les plages de dates. */
  fullDate: string;
  opponent: string;
  opponentSlug: string;
  home: boolean;
  won: boolean;
  teamScore: number | null;
  opponentScore: number | null;
  starter: boolean;
  minutes: string | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  fgm: number | null;
  fga: number | null;
  threePm: number | null;
  threePa: number | null;
  ftm: number | null;
  fta: number | null;
  plusMinus: number | null;
};

type AveragedKey = "pts" | "reb" | "ast";

function average(rows: PlayerGameLog[], key: AveragedKey) {
  const values = rows.map((row) => row[key]).filter((value): value is number => value != null);
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageMinutes(rows: PlayerGameLog[]) {
  return rows.length === 0 ? null : rows.reduce((sum, row) => sum + parseMinutes(row.minutes), 0) / rows.length;
}

function shots(made: number | null, attempted: number | null) {
  return made == null || attempted == null ? "—" : `${made}/${attempted}`;
}

type GameLogViewProps = {
  /** Matchs de la saison, du plus récent au plus ancien. */
  logs: PlayerGameLog[];
  season: string;
  liveSeason: string;
  locale: string;
};

export function GameLogView({ logs, season, liveSeason, locale }: GameLogViewProps) {
  const [page, setPage] = useState(0);

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-12 text-center text-sm text-white/40">
        Aucun match détaillé pour {season}.
        <span className="mt-1 block text-xs text-white/25">
          Les journaux de matchs couvrent la saison régulière depuis {GAME_LOGS_SINCE}.
        </span>
      </div>
    );
  }

  const splits = [
    { label: "Domicile", rows: logs.filter((row) => row.home) },
    { label: "Extérieur", rows: logs.filter((row) => !row.home) },
    { label: "Victoires", rows: logs.filter((row) => row.won) },
    { label: "Défaites", rows: logs.filter((row) => !row.won) },
  ];
  const opponentSplits = Array.from(new Set(logs.map((row) => row.opponent)))
    .map((opponent) => ({
      opponent,
      slug: logs.find((row) => row.opponent === opponent)!.opponentSlug,
      rows: logs.filter((row) => row.opponent === opponent),
    }))
    .sort((left, right) => right.rows.length - left.rows.length || left.opponent.localeCompare(right.opponent));

  const pageCount = Math.ceil(logs.length / PAGE_SIZE);
  const current = Math.min(page, pageCount - 1);
  const first = current * PAGE_SIZE;
  const visible = logs.slice(first, first + PAGE_SIZE);

  return (
    <div className="space-y-5">
      <RecentForm logs={logs} season={season} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {splits.map((split) => (
          <div key={split.label} className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/25">{split.label} · {split.rows.length} MJ</div>
            <div className="mt-2 flex gap-2.5 font-mono text-sm tabular-nums sm:gap-4 sm:text-base">
              <SplitValue label="PTS" value={average(split.rows, "pts")} />
              <SplitValue label="REB" value={average(split.rows, "reb")} />
              <SplitValue label="PAS" value={average(split.rows, "ast")} />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111114]">
        <div className="border-b border-white/[0.06] px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-white/40 sm:px-5">
          Journal · saison régulière {season}
        </div>
        <ColumnHelpPanel />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/40">
              <tr>
                <th className="sticky left-0 z-10 bg-[#111114] px-4 py-3 text-left font-medium">Date</th>
                <th className="px-3 py-3 text-left font-medium">Adversaire</th>
                <th className="px-3 py-3 text-left font-medium">Rés.</th>
                <th className="px-3 py-3 text-center font-medium"><ColumnHeader code="TIT" /></th>
                <th className="px-3 py-3 text-right font-medium"><ColumnHeader code="MIN" /></th>
                <th className="px-3 py-3 text-right font-medium"><ColumnHeader code="PTS" /></th>
                <th className="px-3 py-3 text-right font-medium"><ColumnHeader code="REB" /></th>
                <th className="px-3 py-3 text-right font-medium"><ColumnHeader code="PAS" /></th>
                <th className="px-3 py-3 text-right font-medium"><ColumnHeader code="INT" /></th>
                <th className="px-3 py-3 text-right font-medium"><ColumnHeader code="CTR" /></th>
                <th className="px-3 py-3 text-right font-medium"><ColumnHeader code="BP" /></th>
                <th className="px-3 py-3 text-right font-medium"><ColumnHeader code="TIRS" /></th>
                <th className="px-3 py-3 text-right font-medium"><ColumnHeader code="3PTS" /></th>
                <th className="px-3 py-3 text-right font-medium"><ColumnHeader code="LF" /></th>
                <th className="px-4 py-3 text-right font-medium"><ColumnHeader code="+/-" /></th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {visible.map((log) => (
                <tr key={log.id} className="border-b border-white/[0.04]">
                  <td className="sticky left-0 z-10 bg-[#111114] px-4 py-3 text-white/45">
                    <Link href={`/${locale}/matchs/${log.id}`} className="hover:text-orange-300">{log.date}</Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Link href={teamSeasonHref(locale, log.opponentSlug, season, liveSeason)} className="text-white/65 hover:text-orange-300">
                      {log.home ? "vs" : "@"} {log.opponent}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={log.won ? "text-emerald-400" : "text-rose-400"}>{log.won ? "V" : "D"}</span>
                    {log.teamScore != null && log.opponentScore != null && (
                      <span className="ml-1.5 text-white/35">{log.teamScore}-{log.opponentScore}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-white/45">
                    {log.starter ? <span aria-label="Titulaire">●</span> : <span aria-label="Remplaçant" className="text-white/15">·</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-white/40">{log.minutes ?? "—"}</td>
                  <td className="px-3 py-3 text-right text-white">{log.pts ?? "—"}</td>
                  <td className="px-3 py-3 text-right text-white/60">{log.reb ?? "—"}</td>
                  <td className="px-3 py-3 text-right text-white/60">{log.ast ?? "—"}</td>
                  <td className="px-3 py-3 text-right text-white/45">{log.stl ?? "—"}</td>
                  <td className="px-3 py-3 text-right text-white/45">{log.blk ?? "—"}</td>
                  <td className="px-3 py-3 text-right text-white/45">{log.tov ?? "—"}</td>
                  <td className="px-3 py-3 text-right text-white/45">{shots(log.fgm, log.fga)}</td>
                  <td className="px-3 py-3 text-right text-white/45">{shots(log.threePm, log.threePa)}</td>
                  <td className="px-3 py-3 text-right text-white/45">{shots(log.ftm, log.fta)}</td>
                  <td className="px-4 py-3 text-right text-white/35">
                    {signed(log.plusMinus, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <nav aria-label="Pages du journal" className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 text-xs sm:px-5">
          <span className="font-mono text-white/35">
            Matchs {first + 1}–{first + visible.length} sur {logs.length}
          </span>
          {pageCount > 1 && (
            <div className="flex items-center gap-2">
              <PageButton disabled={current === 0} onClick={() => setPage(current - 1)}>Plus récents</PageButton>
              <span className="font-mono text-white/35">{current + 1}/{pageCount}</span>
              <PageButton disabled={current === pageCount - 1} onClick={() => setPage(current + 1)}>Plus anciens</PageButton>
            </div>
          )}
        </nav>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h3 className="mb-4 text-[10px] font-mono uppercase tracking-[0.16em] text-white/30">Splits par adversaire</h3>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {opponentSplits.map((split) => (
            <Link key={split.opponent} href={teamSeasonHref(locale, split.slug, season, liveSeason)} className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-xs hover:text-orange-300">
              <span className="text-white/55">{split.opponent} <span className="text-white/20">· {split.rows.length} MJ</span></span>
              <span className="font-mono tabular-nums text-white/40">{stat(average(split.rows, "pts"))} PTS</span>
            </Link>
          ))}
        </div>
      </div>
      <p className="text-[10px] font-mono text-white/20">
        Tous les matchs de saison régulière {season} reliés au joueur ({logs.length}) · splits calculés sur ces matchs
      </p>
    </div>
  );
}

/**
 * Forme récente : moyennes des 5 et 10 derniers matchs face à celles de la
 * saison entière, avec les dates couvertes pour qu'aucune fenêtre ne soit
 * ambiguë.
 */
function RecentForm({ logs, season }: { logs: PlayerGameLog[]; season: string }) {
  const windows = [5, 10]
    .filter((size) => logs.length > size)
    .map((size) => ({ size, rows: logs.slice(0, size) }));
  if (windows.length === 0) return null;
  const columns = [
    ...windows.map(({ size, rows }) => ({
      title: `${size} derniers`,
      range: `${rows[rows.length - 1].fullDate} → ${rows[0].fullDate}`,
      rows,
    })),
    { title: `Saison ${season}`, range: `${logs.length} matchs`, rows: logs },
  ];
  const stats: { label: string; value: (rows: PlayerGameLog[]) => number | null }[] = [
    { label: "MIN", value: averageMinutes },
    { label: "PTS", value: (rows) => average(rows, "pts") },
    { label: "REB", value: (rows) => average(rows, "reb") },
    { label: "PAS", value: (rows) => average(rows, "ast") },
  ];

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <h3 className="mb-3 text-[10px] font-mono uppercase tracking-[0.16em] text-white/30">Forme récente · moyennes par match</h3>
      <div
        className="grid gap-x-3 gap-y-2 text-xs sm:gap-x-6"
        style={{ gridTemplateColumns: `auto repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        <span />
        {columns.map((column) => (
          <div key={column.title} className="min-w-0 text-right">
            <div className="text-white/60">{column.title}</div>
            <div className="font-mono text-[9px] text-white/25">{column.range}</div>
          </div>
        ))}
        {stats.map((row) => {
          const reference = row.value(logs);
          return (
            <div key={row.label} className="contents">
              <span className="self-center font-mono text-[10px] text-white/30">{row.label}</span>
              {columns.map((column) => {
                const value = row.value(column.rows);
                const delta = column.rows === logs || value == null || reference == null ? null : value - reference;
                return (
                  <div key={column.title} className="text-right font-mono tabular-nums">
                    <span className="text-white/80">{stat(value)}</span>
                    {delta != null && Math.abs(delta) >= 0.05 && (
                      <span className={`ml-1 text-[10px] ${delta > 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                        {signed(delta)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-white/10 px-2.5 py-1.5 text-white/60 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function SplitValue({ label, value }: { label: string; value: number | null }) {
  return <div><div className="text-[8px] text-white/20">{label}</div><div className="text-white/70">{stat(value)}</div></div>;
}
