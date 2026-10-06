import { LineChart } from "@/components/ui/line-chart";
import { stat, pct } from "@/lib/format";
import {
  computeCareerAverages,
  consolidateSeasons,
  type SeasonShooting,
  type SeasonStint,
} from "@/lib/stats/career";

/**
 * Une ligne `PlayerSeason` brute : un joueur transféré en produit plusieurs
 * pour une même saison. La consolidation est faite ici, à l'affichage.
 */
export type CareerSeason = SeasonStint;

type CareerViewProps = {
  seasons: CareerSeason[];
  /** Pourcentages exacts des saisons transférées, tirés des box scores. */
  exactShooting?: Record<string, SeasonShooting>;
  primaryColor: string;
};

export function CareerView({ seasons, exactShooting, primaryColor }: CareerViewProps) {
  // Une ligne par saison (transferts fusionnés), en ordre chronologique.
  const chrono = consolidateSeasons(seasons, exactShooting);
  const career = computeCareerAverages(seasons);

  const chartData = chrono.map((d) => ({
    s: d.season.slice(2),
    v: d.pointsPerGame,
  }));

  const careerPpg = stat(career.pointsPerGame);

  return (
    <div className="space-y-6">
      {/* Chart PPG */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
            POINTS PAR MATCH — {chrono.length} SAISONS
          </div>
          <div className="text-xs text-white/40 font-mono">
            Moy. {careerPpg} pts
          </div>
        </div>
        <h3 className="font-display font-semibold text-xl tracking-tight mb-4">
          Évolution carrière
        </h3>
        <LineChart
          data={chartData}
          accessor={(d) => d.v as number}
          label="player-career"
          color={primaryColor}
        />
      </div>

      {/* Table carrière */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                <th className="text-left px-5 py-3 font-medium">Saison</th>
                <th className="text-left px-3 py-3 font-medium">Équipe</th>
                <th className="text-right px-3 py-3 font-medium">MJ</th>
                <th className="text-right px-3 py-3 font-medium">MIN</th>
                <th className="text-right px-3 py-3 font-medium">PTS</th>
                <th className="text-right px-3 py-3 font-medium">REB</th>
                <th className="text-right px-3 py-3 font-medium">PAS</th>
                <th className="text-right px-3 py-3 font-medium">INT</th>
                <th className="text-right px-3 py-3 font-medium">CTR</th>
                <th className="text-right px-3 py-3 font-medium">FG%</th>
                <th className="text-right px-5 py-3 font-medium">3P%</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {[...chrono].reverse().map((row) => (
                <tr
                  key={`${row.season}-${row.teamAbbr}`}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition"
                >
                  <td className="px-5 py-3 text-white/80 font-sans text-xs">
                    {row.season}
                  </td>
                  <td className="px-3 py-3 text-white/60 font-sans text-xs">
                    {row.isMultiTeam ? (
                      <span title={`Saison en ${row.teams.length} équipes : ${row.teams.join(", ")}`}>
                        {row.teamAbbr}
                        <span className="text-white/30"> ({row.teams.length})</span>
                      </span>
                    ) : (
                      row.teamAbbr
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-white/60">
                    {row.gamesPlayed}
                  </td>
                  <td className="px-3 py-3 text-right text-white/60">
                    {stat(row.minutesPerGame)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-white">
                    {stat(row.pointsPerGame)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {stat(row.reboundsPerGame)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {stat(row.assistsPerGame)}
                  </td>
                  <td className="px-3 py-3 text-right text-white/60">
                    {stat(row.stealsPerGame)}
                  </td>
                  <td className="px-3 py-3 text-right text-white/60">
                    {stat(row.blocksPerGame)}
                  </td>
                  <td className="px-3 py-3 text-right text-white/60">
                    {pct(row.fgPct)}
                  </td>
                  <td className="px-5 py-3 text-right text-white/60">
                    {pct(row.threePtPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {chrono.some((row) => row.isMultiTeam) && (
          <p className="border-t border-white/[0.06] px-5 py-3 text-xs text-white/40">
            <span className="font-mono text-white/60">TOT</span>{" "}
            regroupe les équipes d&apos;une même saison. Les moyennes sont
            pondérées par les matchs joués ; les pourcentages sont recalculés
            sur les tirs des box scores, et restent vides pour les saisons
            antérieures, faute de volumes de tirs.
          </p>
        )}
      </div>
    </div>
  );
}
