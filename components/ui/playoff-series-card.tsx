"use client";

import Image from "next/image";
import Link from "next/link";
import type { PlayoffSeries, PlayoffTeam } from "@/lib/playoffs";

function formatGameDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

function TeamRow({
  team,
  isWinner,
  locale,
}: {
  team: PlayoffTeam;
  isWinner: boolean;
  locale: string;
}) {
  const row = (
    <div
      className={`flex items-center gap-2 px-3 py-2 transition-opacity ${
        isWinner ? "opacity-100" : "opacity-45"
      }`}
    >
      {/* Logo ou couleur de fallback */}
      <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
        {team.logoUrl ? (
          <Image
            src={team.logoUrl}
            alt={team.name}
            width={24}
            height={24}
            className="object-contain"
          />
        ) : (
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: team.primaryColor }}
          />
        )}
      </span>
      {/* Seed */}
      <span className="w-3 text-[10px] text-white/30 font-mono text-right flex-shrink-0">
        {team.seed ?? "—"}
      </span>
      {/* Name */}
      <span
        className={`flex-1 min-w-0 truncate text-sm font-sans ${
          isWinner ? "text-white font-medium" : "text-white/60"
        }`}
      >
        {team.name}
      </span>
      {/* Series wins */}
      <span
        className={`text-sm font-mono font-semibold ml-2 ${
          isWinner ? "text-white" : "text-white/30"
        }`}
      >
        {team.seriesWins}
      </span>
    </div>
  );

  if (team.slug) {
    return (
      <Link
        href={`/${locale}/equipes/${team.slug}`}
        className="block hover:bg-white/[0.03] transition-colors rounded"
      >
        {row}
      </Link>
    );
  }
  return row;
}

type Props = {
  series: PlayoffSeries;
  locale: string;
};

export function PlayoffSeriesCard({ series, locale }: Props) {
  const { team1, team2, status, summary, completed, gameNumber } = series;

  const winner = completed
    ? team1.seriesWins > team2.seriesWins
      ? 1
      : 2
    : null;

  // Header style by status
  const headerClass =
    status === "complete"
      ? "bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/10"
      : status === "in_progress"
        ? "bg-violet-500/10 text-violet-300 border-b border-violet-500/10"
        : "bg-white/[0.03] text-white/30 border-b border-white/[0.05]";

  const headerText =
    status === "complete"
      ? summary
      : status === "in_progress"
        ? summary || `Jeu ${gameNumber} en cours`
        : "Série à venir";

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#111114] overflow-hidden w-[210px] flex-shrink-0">
      {/* Header */}
      <div
        className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wide truncate ${headerClass}`}
      >
        {headerText}
      </div>

      {/* Teams */}
      <TeamRow
        team={team1}
        isWinner={winner === 1 || winner === null}
        locale={locale}
      />
      <div className="border-t border-white/[0.04]" />
      <TeamRow
        team={team2}
        isWinner={winner === 2 || winner === null}
        locale={locale}
      />

      {/* Next game */}
      {status !== "complete" && series.nextGameDate && (
        <div className="px-3 py-1.5 border-t border-white/[0.04] flex items-center justify-between gap-2">
          <span className="text-[10px] text-white/30 font-mono truncate">
            {formatGameDate(series.nextGameDate)}
          </span>
          {series.nextGameNetwork && (
            <span className="text-[10px] text-white/20 font-mono flex-shrink-0">
              {series.nextGameNetwork}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
