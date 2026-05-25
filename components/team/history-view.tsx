import { HistoryChart, type HistoryPoint } from "./history-chart";

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
  const chronological: HistoryPoint[] = [...seasons]
    .sort((a, b) => a.season.localeCompare(b.season))
    .map((d) => ({
      season: d.season,
      wins: d.wins,
      losses: d.losses,
      conferenceRank: d.conferenceRank,
    }));

  const avgWins = Math.round(
    chronological.reduce((s, d) => s + d.wins, 0) / (chronological.length || 1),
  );

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
          Victoires par saison — {chronological.length} saisons
        </div>
        <div className="text-xs text-white/40 font-mono">Moy. {avgWins} V</div>
      </div>
      <h3 className="font-display font-semibold text-xl tracking-tight mb-4">
        Évolution sur {chronological.length} saisons
      </h3>
      <HistoryChart data={chronological} color={primaryColor} />
      <p className="mt-3 text-[10px] text-white/20 font-mono text-right">
        ← Glisser pour les saisons précédentes
      </p>
    </div>
  );
}
