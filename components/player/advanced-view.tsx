import { stat, pct } from "@/lib/format";

export type AdvancedSeason = {
  season: string;
  teamAbbr: string;
  gamesPlayed: number;
  trueShooting: number | null;
  usageRate: number | null;
  per: number | null;
  offRating: number | null;
  defRating: number | null;
  netRating: number | null;
};

type AdvancedViewProps = {
  seasons: AdvancedSeason[];
  primaryColor: string;
};

export function AdvancedView({ seasons, primaryColor }: AdvancedViewProps) {
  const chrono = [...seasons].sort((a, b) => a.season.localeCompare(b.season));

  return (
    <div className="space-y-6">
      {/* Légende */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "TS%", desc: "True Shooting — efficacité de tir globale" },
          { label: "USG%", desc: "Usage Rate — % de possessions utilisées" },
          { label: "PIE", desc: "Player Impact Estimate — impact global" },
          { label: "ORtg", desc: "Off. Rating — pts marqués pour 100 poss." },
          { label: "DRtg", desc: "Def. Rating — pts encaissés pour 100 poss." },
          {
            label: "NRtg",
            desc: "Net Rating — différentiel offensif/défensif",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/[0.06] bg-[#111114] p-3"
          >
            <div
              className="text-base font-display font-semibold mb-1"
              style={{ color: primaryColor }}
            >
              {item.label}
            </div>
            <div className="text-[10px] text-white/40 leading-snug">
              {item.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                <th className="text-left px-5 py-3 font-medium">Saison</th>
                <th className="text-left px-3 py-3 font-medium">Équipe</th>
                <th className="text-right px-3 py-3 font-medium">MJ</th>
                <th className="text-right px-3 py-3 font-medium">TS%</th>
                <th className="text-right px-3 py-3 font-medium">USG%</th>
                <th className="text-right px-3 py-3 font-medium">PIE</th>
                <th className="text-right px-3 py-3 font-medium">ORtg</th>
                <th className="text-right px-3 py-3 font-medium">DRtg</th>
                <th className="text-right px-5 py-3 font-medium">NRtg</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {[...chrono].reverse().map((row) => {
                const net = row.netRating;
                const netStr =
                  net == null ? "—" : net >= 0 ? `+${stat(net)}` : stat(net);
                return (
                  <tr
                    key={`${row.season}-${row.teamAbbr}`}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition"
                  >
                    <td className="px-5 py-3 text-white/80 font-sans text-xs">
                      {row.season}
                    </td>
                    <td className="px-3 py-3 text-white/60 font-sans text-xs">
                      {row.teamAbbr}
                    </td>
                    <td className="px-3 py-3 text-right text-white/60">
                      {row.gamesPlayed}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.trueShooting != null ? pct(row.trueShooting) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.usageRate != null ? pct(row.usageRate) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">{stat(row.per, 3)}</td>
                    <td className="px-3 py-3 text-right text-white/60">
                      {row.offRating != null ? stat(row.offRating) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-white/60">
                      {row.defRating != null ? stat(row.defRating) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">{netStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
