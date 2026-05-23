import { KPI } from "@/components/ui/kpi";
import { LineChart } from "@/components/ui/line-chart";
import { stat } from "@/lib/format";

export type SeasonStats = {
  wins: number;
  losses: number;
  offRating: number | null;
  defRating: number | null;
  netRating: number | null;
  pace: number | null;
  trueShooting: number | null;
  summaryFr: string | null;
};

type SeasonViewProps = {
  season: SeasonStats;
  primaryColor: string;
};

// Wins par mois : données non disponibles en DB pour l'instant
// On affiche un placeholder si on n'a pas les données mensuelles
const MONTH_PLACEHOLDER = [
  { s: "OCT", w: 0 },
  { s: "NOV", w: 0 },
  { s: "DÉC", w: 0 },
  { s: "JAN", w: 0 },
  { s: "FÉV", w: 0 },
  { s: "MAR", w: 0 },
  { s: "AVR", w: 0 },
];

export function SeasonView({ season, primaryColor }: SeasonViewProps) {
  const netVal = season.netRating;
  const netStr =
    netVal == null ? "—" : netVal >= 0 ? `+${stat(netVal)}` : stat(netVal);

  return (
    <div className="space-y-8">
      {season.summaryFr && (
        <p className="text-white/60 text-sm leading-relaxed">
          {season.summaryFr}
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI
          label="Off. Rating"
          value={stat(season.offRating)}
          unit="pts/100"
          accent="#7C3AED"
        />
        <KPI
          label="Def. Rating"
          value={stat(season.defRating)}
          unit="pts/100"
          accent="#06B6D4"
        />
        <KPI label="Net Rating" value={netStr} accent="#10B981" />
        <KPI label="Pace" value={stat(season.pace)} unit="poss/match" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mb-1">
            VICTOIRES PAR MOIS
          </div>
          <h3 className="font-display font-semibold text-xl tracking-tight mb-4">
            Bilan {season.wins}–{season.losses}
          </h3>
          <LineChart
            data={MONTH_PLACEHOLDER}
            accessor={(d) => d.w as number}
            label="team-month"
            color={primaryColor}
          />
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6 space-y-4">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
            INDICATEURS CLÉS
          </div>
          {[
            {
              l: "True Shooting %",
              v:
                season.trueShooting != null
                  ? (season.trueShooting * 100).toFixed(1)
                  : "—",
              b: season.trueShooting ?? 0,
            },
            {
              l: "Victoires",
              v: String(season.wins),
              b: season.wins / 82,
            },
            {
              l: "Défaites",
              v: String(season.losses),
              b: 1 - season.losses / 82,
            },
          ].map((row) => (
            <div key={row.l}>
              <div className="flex items-baseline justify-between text-sm mb-1.5">
                <span className="text-white/60">{row.l}</span>
                <span className="font-mono tabular-nums">{row.v}</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.05]">
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${Math.min(row.b * 100, 100)}%`,
                    background: `linear-gradient(90deg, ${primaryColor}, #06B6D4)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
