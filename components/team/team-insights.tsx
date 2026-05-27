import type { Insight } from "@/lib/insights";

type Props = {
  insights: Insight[];
  primaryColor: string;
};

export function TeamInsights({ insights, primaryColor }: Props) {
  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] px-6 py-8 flex flex-col items-center gap-2 text-center">
        <div className="text-2xl opacity-20">🔍</div>
        <p className="text-white/30 text-sm">
          Données insuffisantes pour générer des insights
        </p>
        <p className="text-white/20 text-xs max-w-sm">
          Il faut au moins ~15 matchs synchronisés avec leur box score. Les
          insights apparaîtront automatiquement quand le cron aura backfillé la
          saison.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display font-semibold text-lg tracking-tight">
          Insights{" "}
          <span className="text-white/25 font-normal text-sm">
            patterns auto-détectés sur la saison
          </span>
        </h2>
        <span className="text-[10px] text-white/25 font-mono uppercase tracking-widest">
          {insights.length} découverte{insights.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((insight) => (
          <InsightCard
            key={insight.kind}
            insight={insight}
            primaryColor={primaryColor}
          />
        ))}
      </div>

      <p className="text-[11px] text-white/20 leading-relaxed pt-1">
        Ces patterns sont découverts automatiquement en croisant les box scores
        de chaque match avec le résultat final. Plus l&apos;échantillon est
        grand, plus les corrélations sont fiables.
      </p>
    </div>
  );
}

function InsightCard({
  insight,
  primaryColor,
}: {
  insight: Insight;
  primaryColor: string;
}) {
  const strengthLabel =
    insight.strength >= 0.7
      ? "Signal fort"
      : insight.strength >= 0.45
        ? "Signal modéré"
        : "Signal faible";
  const strengthColor =
    insight.strength >= 0.7
      ? "text-emerald-400"
      : insight.strength >= 0.45
        ? "text-amber-400"
        : "text-white/40";

  return (
    <div
      className="relative rounded-2xl border border-white/[0.06] bg-[#111114] p-5 overflow-hidden group hover:border-white/[0.12] transition"
      style={{ borderLeftColor: primaryColor, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{insight.emoji}</span>
          <h3 className="font-display font-semibold text-sm text-white">
            {insight.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span
            className={`text-[10px] font-mono uppercase tracking-wider ${strengthColor}`}
          >
            {strengthLabel}
          </span>
          <span className="text-[10px] text-white/25 font-mono">
            n={insight.sampleSize}
          </span>
        </div>
      </div>

      {/* Finding */}
      <p className="text-sm text-white/70 leading-relaxed">{insight.finding}</p>

      {/* Strength bar */}
      <div className="mt-4 h-0.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.round(insight.strength * 100)}%`,
            background: primaryColor,
          }}
        />
      </div>
    </div>
  );
}
