import Link from "next/link";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { count, stat, pct } from "@/lib/format";
import { currentSeason } from "@/lib/nba";
import { playerSeasonHref, teamSeasonHref } from "@/lib/team-links";
import { getPlayerMetric } from "@/lib/stats/metrics";
import type { MetricContext, PopulationSummary } from "@/lib/stats/context";
import {
  buildExplorerUrl,
  type PlayerExplorerMetric,
  type PlayerExplorerParams,
} from "@/lib/stats/player-query";

export type PlayerExplorerRow = {
  id: string;
  playerSlug: string;
  firstName: string;
  lastName: string;
  position: string | null;
  photoUrl: string | null;
  teamAbbr: string;
  /** `null` pour une ligne TOT : aucune équipe unique vers qui pointer. */
  teamSlug: string | null;
  /** Équipes traversées, affichées au survol d'une ligne TOT. */
  teams: string[];
  primaryColor: string;
  secondaryColor: string;
  gamesPlayed: number;
  metricValue: number | null;
  context: MetricContext;
  previousValue: number | null;
};

function formatMetric(
  metric: PlayerExplorerMetric,
  value: number | null,
  mode: PlayerExplorerParams["mode"],
) {
  if (value == null) return "—";
  if (mode === "total") return count(value);
  return getPlayerMetric(metric).mode === "percentage" ? pct(value) : stat(value);
}

export function PlayerExplorerTable({
  rows,
  params,
  locale,
  total,
  pageSize,
  population,
  previousSeason,
}: {
  rows: PlayerExplorerRow[];
  params: PlayerExplorerParams;
  locale: string;
  total: number;
  pageSize: number;
  population: PopulationSummary;
  previousSeason: string | null;
}) {
  const metric = getPlayerMetric(params.metric);
  const liveSeason = currentSeason();
  const firstRank = (params.page - 1) * pageSize + 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ContextCard label="Cohorte qualifiée" value={`${population.total} joueurs`} />
        <ContextCard label="Moyenne" value={formatMetric(params.metric, population.mean, params.mode)} />
        <ContextCard label="Médiane" value={formatMetric(params.metric, population.median, params.mode)} />
        <ContextCard
          label="Qualification"
          value={`≥ ${params.minimumGames} MJ${params.minimumMinutes > 0 ? ` · ${params.minimumMinutes} min` : ""}`}
        />
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                <th className="text-left px-5 py-3 font-medium w-14">#</th>
                <th className="text-left px-3 py-3 font-medium">Joueur</th>
                <th className="text-left px-3 py-3 font-medium">Équipe</th>
                <th className="text-right px-3 py-3 font-medium">MJ</th>
                <th className="text-right px-5 py-3 font-medium text-orange-300">
                  {metric.shortLabel}
                  {params.mode === "per36"
                    ? " /36"
                    : params.mode === "total"
                      ? " total"
                      : ""}
                </th>
                <th className="text-right px-3 py-3 font-medium">Percentile</th>
                <th className="text-right px-5 py-3 font-medium">
                  vs {previousSeason ?? "saison préc."}
                </th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.025] transition group"
                >
                  <td className="px-5 py-2.5 text-white/25 text-xs">
                    {row.context.rank ?? firstRank + index}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={playerSeasonHref(locale, row.playerSlug, params.season, liveSeason)}
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
                        <div className="font-sans font-medium text-white group-hover:text-orange-300 transition">
                          {row.firstName} {row.lastName}
                        </div>
                        <div className="font-sans text-[11px] text-white/35">
                          {row.position ?? "Position inconnue"}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    {row.teamSlug ? (
                      <Link
                        href={teamSeasonHref(locale, row.teamSlug, params.season, liveSeason)}
                        className="font-sans text-xs text-white/45 hover:text-white transition"
                      >
                        {row.teamAbbr}
                      </Link>
                    ) : (
                      <span
                        className="font-sans text-xs text-white/45"
                        title={`Saison en ${row.teams.length} équipes : ${row.teams.join(", ")}`}
                      >
                        {row.teamAbbr}
                        <span className="text-white/25"> ({row.teams.length})</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white/45">
                    {row.gamesPlayed}
                  </td>
                  <td className="px-5 py-2.5 text-right text-white font-semibold">
                    {formatMetric(params.metric, row.metricValue, params.mode)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white/55">
                    {row.context.percentile != null ? `P${row.context.percentile}` : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <MetricDelta
                      value={row.metricValue}
                      previousValue={row.previousValue}
                      higherIsBetter={metric.higherIsBetter}
                      metric={params.metric}
                      mode={params.mode}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] text-white/25 font-mono">
          {total} résultat{total !== 1 ? "s" : ""} · min. {params.minimumGames} MJ
          {params.minimumMinutes > 0 ? ` · min. ${params.minimumMinutes} min/match` : ""}
          {params.mode === "total" ? " · totaux estimés depuis les moyennes" : ""}
        </p>
        <div className="flex items-center gap-2 text-xs">
          {params.page > 1 ? (
            <Link
              href={buildExplorerUrl(locale, params, { page: params.page - 1 })}
              className="rounded-lg border border-white/[0.08] px-3 py-2 text-white/60 hover:text-white hover:bg-white/[0.04] transition"
            >
              ← Précédent
            </Link>
          ) : (
            <span className="rounded-lg border border-white/[0.04] px-3 py-2 text-white/15">
              ← Précédent
            </span>
          )}
          <span className="text-white/35 font-mono px-1">
            {Math.min(params.page, totalPages)} / {totalPages}
          </span>
          {params.page < totalPages ? (
            <Link
              href={buildExplorerUrl(locale, params, { page: params.page + 1 })}
              className="rounded-lg border border-white/[0.08] px-3 py-2 text-white/60 hover:text-white hover:bg-white/[0.04] transition"
            >
              Suivant →
            </Link>
          ) : (
            <span className="rounded-lg border border-white/[0.04] px-3 py-2 text-white/15">
              Suivant →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ContextCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111114] px-4 py-3">
      <div className="text-[9px] font-mono uppercase tracking-wider text-white/25">{label}</div>
      <div className="mt-1 font-display text-lg text-white/75 tabular-nums">{value}</div>
    </div>
  );
}

function MetricDelta({
  value,
  previousValue,
  higherIsBetter,
  metric,
  mode,
}: {
  value: number | null;
  previousValue: number | null;
  higherIsBetter: boolean;
  metric: PlayerExplorerMetric;
  mode: PlayerExplorerParams["mode"];
}) {
  if (value == null || previousValue == null) return <span className="text-white/20">—</span>;
  const delta = value - previousValue;
  const favorable = higherIsBetter ? delta > 0 : delta < 0;
  const neutral = Math.abs(delta) < 0.000_001;
  return (
    <span className={neutral ? "text-white/30" : favorable ? "text-emerald-400/80" : "text-rose-400/75"}>
      {delta > 0 ? "+" : ""}{formatMetric(metric, delta, mode)}
    </span>
  );
}
