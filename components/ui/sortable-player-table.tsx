"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { stat } from "@/lib/format";

export type SortableRow = {
  id: string;
  playerSlug: string;
  firstName: string;
  lastName: string;
  position: string | null;
  photoUrl: string | null;
  college?: string | null;
  teamAbbr: string;
  teamSlug: string;
  primaryColor: string;
  secondaryColor: string;
  draftPick?: number | null;
  age?: string;
  gamesPlayed: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  trueShooting?: number | null;
};

type ColKey =
  | "pick"
  | "gamesPlayed"
  | "pointsPerGame"
  | "reboundsPerGame"
  | "assistsPerGame"
  | "trueShooting"
  | "age";

type ColDef = {
  key: ColKey;
  label: string;
  show?: "always" | "sm" | "md";
};

type SortDir = "asc" | "desc";

type SortablePlayerTableProps = {
  rows: SortableRow[];
  columns: ColDef[];
  defaultSort: ColKey;
  defaultDir?: SortDir;
  locale: string;
  showCollege?: boolean;
  footerNote?: string;
};

export function SortablePlayerTable({
  rows,
  columns,
  defaultSort,
  defaultDir = "desc",
  locale,
  showCollege = false,
  footerNote,
}: SortablePlayerTableProps) {
  const [sortKey, setSortKey] = useState<ColKey>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  function handleSort(key: ColKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Pick → asc par défaut, stats → desc par défaut
      setSortDir(key === "pick" || key === "age" ? "asc" : "desc");
    }
  }

  function getValue(row: SortableRow, key: ColKey): number {
    switch (key) {
      case "pick":
        return row.draftPick ?? 999;
      case "gamesPlayed":
        return row.gamesPlayed;
      case "pointsPerGame":
        return row.pointsPerGame;
      case "reboundsPerGame":
        return row.reboundsPerGame;
      case "assistsPerGame":
        return row.assistsPerGame;
      case "trueShooting":
        return row.trueShooting ?? 0;
      case "age":
        return row.age ? parseInt(row.age) : 0;
      default:
        return 0;
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const diff = getValue(a, sortKey) - getValue(b, sortKey);
    return sortDir === "asc" ? diff : -diff;
  });

  function thClass(key: ColKey, align: "left" | "right" = "right") {
    const base = `py-3 font-medium cursor-pointer select-none transition-colors group`;
    const padding = align === "left" ? "px-3" : "px-3";
    const active =
      key === sortKey ? "text-white" : "text-white/40 hover:text-white/70";
    return `${base} ${padding} text-${align} ${active}`;
  }

  function SortIcon({ colKey }: { colKey: ColKey }) {
    if (colKey !== sortKey)
      return <span className="text-white/20 group-hover:text-white/40">↕</span>;
    return sortDir === "asc" ? (
      <span className="text-orange-400">↑</span>
    ) : (
      <span className="text-orange-400">↓</span>
    );
  }

  const showCol = (col: ColDef) => col.show ?? "always";

  return (
    <div>
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[580px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium text-white/40 w-10">
                  #
                </th>
                <th className="text-left px-3 py-3 font-medium text-white/40">
                  Joueur
                </th>
                <th className="text-left px-3 py-3 font-medium text-white/40">
                  Équipe
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`${thClass(col.key)} ${
                      showCol(col) === "sm" ? "hidden sm:table-cell" : ""
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      {col.label} <SortIcon colKey={col.key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {sorted.map((row, i) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition group"
                >
                  <td className="px-5 py-2.5 text-white/30 text-xs">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/${locale}/joueurs/${row.playerSlug}`}
                      className="flex items-center gap-3"
                    >
                      <PlayerAvatar
                        firstName={row.firstName}
                        lastName={row.lastName}
                        primaryColor={row.primaryColor}
                        secondaryColor={row.secondaryColor}
                        photoUrl={row.photoUrl}
                        size="sm"
                        showNum={false}
                      />
                      <div>
                        <div className="text-sm font-sans font-medium text-white leading-tight group-hover:text-orange-300 transition">
                          {row.firstName} {row.lastName}
                        </div>
                        <div className="text-[11px] text-white/40 font-sans">
                          {row.position ?? "—"}
                          {showCollege && row.college
                            ? ` · ${row.college}`
                            : ""}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/${locale}/equipes/${row.teamSlug}`}
                      className="text-xs text-white/50 hover:text-white/90 transition font-sans"
                    >
                      {row.teamAbbr}
                    </Link>
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 text-right ${
                        sortKey === col.key ? "text-white" : "text-white/60"
                      } ${showCol(col) === "sm" ? "hidden sm:table-cell" : ""}`}
                    >
                      {col.key === "pick" && (
                        <span className={row.draftPick ? "" : "text-white/30"}>
                          {row.draftPick ? `#${row.draftPick}` : "—"}
                        </span>
                      )}
                      {col.key === "age" && (
                        <span className="text-white/50">{row.age ?? "—"}</span>
                      )}
                      {col.key === "gamesPlayed" && (
                        <span className="text-white/50">{row.gamesPlayed}</span>
                      )}
                      {col.key === "pointsPerGame" && (
                        <span
                          className={
                            sortKey === "pointsPerGame" ? "font-semibold" : ""
                          }
                        >
                          {stat(row.pointsPerGame)}
                        </span>
                      )}
                      {col.key === "reboundsPerGame" &&
                        stat(row.reboundsPerGame)}
                      {col.key === "assistsPerGame" && stat(row.assistsPerGame)}
                      {col.key === "trueShooting" && (
                        <span className="text-white/60">
                          {row.trueShooting != null
                            ? (row.trueShooting * 100).toFixed(1)
                            : "—"}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {footerNote && (
        <p className="text-[11px] text-white/20 font-mono mt-3 px-1">
          {footerNote}
        </p>
      )}
    </div>
  );
}
