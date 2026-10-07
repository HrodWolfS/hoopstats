import Link from "next/link";
import { HistoryChart, type HistoryPoint } from "./history-chart";
import { PlayoffBadge } from "@/components/team/playoff-badge";
import type { PlayoffOutcome } from "@/lib/playoff-outcome";
import { teamSeasonHref } from "@/lib/team-links";

export type HistorySeason = {
  season: string;
  wins: number;
  losses: number;
  conferenceRank: number | null;
  playoff: PlayoffOutcome;
};

type HistoryViewProps = {
  seasons: HistorySeason[];
  primaryColor: string;
  /** Saison affichée par la page, mise en évidence dans le tableau. */
  selectedSeason: string;
  teamSlug: string;
  locale: string;
  liveSeason: string;
};

export function HistoryView({ seasons, primaryColor, selectedSeason, teamSlug, locale, liveSeason }: HistoryViewProps) {
  const chronological: HistoryPoint[] = [...seasons]
    .sort((a, b) => a.season.localeCompare(b.season))
    .map((d) => ({
      season: d.season,
      wins: d.wins,
      losses: d.losses,
      conferenceRank: d.conferenceRank,
    }));
  const newestFirst = [...seasons].sort((a, b) => b.season.localeCompare(a.season));

  const avgWins = Math.round(
    chronological.reduce((s, d) => s + d.wins, 0) / (chronological.length || 1),
  );
  const titles = seasons.filter((s) => s.playoff.kind === "champion").map((s) => s.season);
  const unknown = seasons.filter((s) => s.playoff.kind === "unknown").map((s) => s.season);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-4 sm:p-6">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
            Victoires par saison — {chronological.length} saisons
          </div>
          <div className="shrink-0 text-xs text-white/40 font-mono">Moy. {avgWins} V</div>
        </div>
        <h3 className="font-display font-semibold text-xl tracking-tight mb-4">
          Évolution sur {chronological.length} saisons
        </h3>
        <HistoryChart data={chronological} color={primaryColor} />
        <p className="mt-3 text-[10px] text-white/20 font-mono text-right">
          ← Glisser pour les saisons précédentes
        </p>
      </div>

      <section
        aria-labelledby="team-history-title"
        className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden"
      >
        <div className="px-4 pt-5 pb-3 space-y-1">
          <h3 id="team-history-title" className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
            Saison par saison
          </h3>
          <p className="text-xs text-white/45">
            {titles.length > 0
              ? `${titles.length} titre${titles.length > 1 ? "s" : ""} NBA depuis ${chronological[0]?.season} (${titles.join(", ")}).`
              : `Aucun titre NBA depuis ${chronological[0]?.season}.`}
          </p>
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">
            Bilan, rang de conférence et résultat de playoffs par saison
          </caption>
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] text-white/30">
              <th scope="col" className="text-left font-medium px-4 py-2">Saison</th>
              <th scope="col" className="text-right font-medium px-2 py-2">Bilan</th>
              <th scope="col" className="text-right font-medium px-2 py-2">
                <abbr title="Rang de conférence" className="no-underline">Conf.</abbr>
              </th>
              <th scope="col" className="text-left font-medium px-3 py-2 sm:px-4">Playoffs</th>
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((row) => {
              const selected = row.season === selectedSeason;
              return (
                <tr
                  key={row.season}
                  aria-current={selected ? "true" : undefined}
                  className="border-b border-white/[0.04] last:border-0"
                  style={selected ? { background: `${primaryColor}18`, boxShadow: `inset 3px 0 0 ${primaryColor}` } : undefined}
                >
                  <th scope="row" className="text-left font-normal px-4 py-2.5">
                    <Link
                      href={teamSeasonHref(locale, teamSlug, row.season, liveSeason)}
                      className={`font-mono tabular-nums underline-offset-4 hover:underline ${selected ? "font-semibold text-white" : "text-white/70"}`}
                    >
                      {row.season}
                    </Link>
                  </th>
                  <td className="text-right px-2 py-2.5 font-mono tabular-nums text-white/70">
                    {row.wins}-{row.losses}
                  </td>
                  <td className="text-right px-2 py-2.5 font-mono tabular-nums text-white/50">
                    {row.conferenceRank ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 sm:px-4">
                    <PlayoffBadge outcome={row.playoff} primaryColor={primaryColor} compact />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t border-white/[0.04] px-4 py-3 text-[11px] leading-relaxed text-white/35">
          Résultat de playoffs déduit des séries ESPN (tour le plus avancé atteint et vainqueur de la
          série), corrigées pour les séries historiques fautives. Le code de qualification de fin de
          saison régulière n&apos;est utilisé que pour le play-in et les équipes éliminées.
          {unknown.length > 0 && ` Séries absentes de la base : ${unknown.join(", ")}.`}
        </p>
      </section>
    </div>
  );
}
