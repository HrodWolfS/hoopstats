import { LineChart } from "@/components/ui/line-chart";
import { Sparkline } from "@/components/ui/sparkline";

export type HistorySeason = {
  season: string;
  wins: number;
  losses: number;
  conferenceRank: number | null;
  playoffResult: string | null;
};

type HistoryViewProps = {
  seasons: HistorySeason[];
  primaryColor: string;
};

export function HistoryView({ seasons, primaryColor }: HistoryViewProps) {
  // Du plus ancien au plus récent pour le chart
  const chronological = [...seasons].sort((a, b) =>
    a.season.localeCompare(b.season),
  );
  const avgWins = Math.round(
    chronological.reduce((s, d) => s + d.wins, 0) / (chronological.length || 1),
  );

  const chartData = chronological.map((d) => ({
    s: d.season.slice(2),
    w: d.wins,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
            VICTOIRES PAR SAISON — {chronological.length} DERNIÈRES
          </div>
          <div className="text-xs text-white/40 font-mono">
            Moy. {avgWins} V
          </div>
        </div>
        <h3 className="font-display font-semibold text-xl tracking-tight mb-4">
          Évolution sur {chronological.length} saisons
        </h3>
        <LineChart
          data={chartData}
          accessor={(d) => d.w as number}
          label="team-history"
          color={primaryColor}
        />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
              <th className="text-left px-5 py-3 font-medium">Saison</th>
              <th className="text-right px-5 py-3 font-medium">V</th>
              <th className="text-right px-5 py-3 font-medium">D</th>
              <th className="text-right px-5 py-3 font-medium">%</th>
              <th className="text-right px-5 py-3 font-medium">Rang conf.</th>
              <th className="text-left px-5 py-3 font-medium">Tendance</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {[...chronological].reverse().map((row) => {
              const total = row.wins + row.losses;
              const pct =
                total > 0 ? ((row.wins / total) * 100).toFixed(1) : "—";
              // sparkline: 5 dernières saisons dans l'ordre chronologique
              const idx = chronological.indexOf(row);
              const window5 = chronological
                .slice(Math.max(0, idx - 4), idx + 1)
                .map((d) => d.wins);
              return (
                <tr
                  key={row.season}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition"
                >
                  <td className="px-5 py-3 text-white/80">{row.season}</td>
                  <td className="px-5 py-3 text-right">{row.wins}</td>
                  <td className="px-5 py-3 text-right text-white/40">
                    {row.losses}
                  </td>
                  <td className="px-5 py-3 text-right">{pct}</td>
                  <td className="px-5 py-3 text-right text-white/60 font-sans">
                    {row.conferenceRank ? `${row.conferenceRank}e` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Sparkline
                      values={window5}
                      color={primaryColor}
                      w={70}
                      h={18}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
