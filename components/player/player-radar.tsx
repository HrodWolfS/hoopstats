"use client";

export type RadarStat = {
  key: string; // "PTS", "REB", etc.
  label: string; // displayed label
  value: string; // formatted value: "24.0", "57.3%"
  percentile: number; // 0–100 (utilisé pour le SVG)
  rank: number; // rang (1 = meilleur)
  total: number; // nombre total de joueurs comparés
};

type Props = {
  stats: RadarStat[];
  color: string;
  positionLabel: string; // "Guards", "Ailiers", "Pivots"
  season: string;
};

export function PlayerRadarChart({
  stats,
  color,
  positionLabel,
  season,
}: Props) {
  const SIZE = 300;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const MAX_R = 98;
  const LABEL_R = 128;
  const n = stats.length;

  const angleAt = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;

  const pt = (i: number, r: number) => ({
    x: CX + r * Math.cos(angleAt(i)),
    y: CY + r * Math.sin(angleAt(i)),
  });

  // Grille à 25 / 50 / 75 / 100 %
  const GRID = [25, 50, 75, 100];

  const polyPath = (r: number) =>
    Array.from({ length: n }, (_, i) => pt(i, r))
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`,
      )
      .join(" ") + " Z";

  const playerPath =
    Array.from({ length: n }, (_, i) =>
      pt(i, (stats[i].percentile / 100) * MAX_R),
    )
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`,
      )
      .join(" ") + " Z";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] text-white/30 uppercase tracking-[0.18em] font-medium">
          Percentiles
        </p>
        <p className="text-[10px] text-white/20 font-mono">
          vs {positionLabel} · {season}
        </p>
      </div>

      {/* SVG radar */}
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[260px] mx-auto block"
        aria-label="Radar chart des percentiles"
      >
        {/* Grid polygons */}
        {GRID.map((level) => (
          <path
            key={level}
            d={polyPath((level / 100) * MAX_R)}
            fill="none"
            stroke="white"
            strokeOpacity={level === 100 ? 0.1 : 0.05}
            strokeWidth={1}
          />
        ))}

        {/* Grid label 50% */}
        <text
          x={CX + 4}
          y={CY - (50 / 100) * MAX_R - 3}
          fontSize={7}
          fill="white"
          fillOpacity={0.15}
          fontFamily="monospace"
        >
          50
        </text>

        {/* Axis lines */}
        {Array.from({ length: n }, (_, i) => {
          const outer = pt(i, MAX_R);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={outer.x}
              y2={outer.y}
              stroke="white"
              strokeOpacity={0.07}
              strokeWidth={1}
            />
          );
        })}

        {/* Player polygon — filled */}
        <path
          d={playerPath}
          fill={color}
          fillOpacity={0.13}
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.75}
          strokeLinejoin="round"
        />

        {/* Vertex dots */}
        {Array.from({ length: n }, (_, i) => {
          const p = pt(i, (stats[i].percentile / 100) * MAX_R);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={2.5}
              fill={color}
              fillOpacity={0.9}
            />
          );
        })}

        {/* Axis labels */}
        {stats.map((s, i) => {
          const a = angleAt(i);
          const cosA = Math.cos(a);
          const sinA = Math.sin(a);
          const lp = pt(i, LABEL_R);
          const anchor = cosA > 0.2 ? "start" : cosA < -0.2 ? "end" : "middle";

          // Positions des deux lignes selon la direction
          let y1: number, y2: number;
          if (sinA < -0.2) {
            // Axe vers le haut → labels au-dessus
            y1 = lp.y - 9;
            y2 = lp.y + 3;
          } else if (sinA > 0.2) {
            // Axe vers le bas → labels en-dessous
            y1 = lp.y - 2;
            y2 = lp.y + 11;
          } else {
            // Axe horizontal → labels centrés
            y1 = lp.y - 7;
            y2 = lp.y + 5;
          }

          return (
            <g key={i}>
              {/* Stat key */}
              <text
                x={lp.x}
                y={y1}
                textAnchor={anchor}
                fill="white"
                fillOpacity={0.35}
                fontSize={8}
                fontFamily="monospace"
                letterSpacing="0.08em"
              >
                {s.key}
              </text>
              {/* Value */}
              <text
                x={lp.x}
                y={y2}
                textAnchor={anchor}
                fill="white"
                fillOpacity={0.75}
                fontSize={9}
                fontWeight="600"
              >
                {s.value}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Percentile breakdown bars */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 pt-1">
        {stats.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 font-mono w-7 shrink-0">
              {s.key}
            </span>
            <div className="flex-1 h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${s.percentile}%`,
                  backgroundColor: color,
                  opacity: 0.65,
                }}
              />
            </div>
            <span className="text-[10px] text-white/40 font-mono w-6 text-right shrink-0">
              {s.percentile}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-white/15 text-right font-mono">
        min. 15 matchs joués
      </p>
    </div>
  );
}
