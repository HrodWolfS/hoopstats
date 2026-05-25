"use client";

import { useRef, useEffect, useState, useCallback } from "react";

export type HistoryPoint = {
  season: string;
  wins: number;
  losses: number;
  conferenceRank: number | null;
};

type TooltipState = {
  point: HistoryPoint;
  x: number;
  y: number;
};

const PX_PER_SEASON = 60;
const VISIBLE = 10;
// PAD.l réservé à l'axe Y (overlay fixe) — le SVG scrollable démarre à x=0
const PAD = { t: 20, r: 24, b: 32, l: 36 };
const CHART_H = 180;
const INNER_H = CHART_H - PAD.t - PAD.b;
const Y_TICKS = 4;
// Largeur de l'overlay Y-axis (inclut le padding gauche)
const YAXIS_W = PAD.l + 4;

export function HistoryChart({
  data,
  color = "#7C3AED",
}: {
  data: HistoryPoint[];
  color?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const handleScroll = useCallback(() => setTooltip(null), []);

  if (!data.length) return null;

  // Le SVG scrollable n'a pas de padding gauche — l'axe Y est en overlay
  const totalW = Math.max(
    data.length * PX_PER_SEASON + PAD.r,
    VISIBLE * PX_PER_SEASON + PAD.r,
  );

  const vals = data.map((d) => d.wins);
  const minV = Math.floor(Math.min(...vals));
  const maxV = Math.ceil(Math.max(...vals));
  const range = maxV - minV || 1;

  // Les points démarrent depuis x=0 dans le SVG scrollable
  const xPos = (i: number) => i * PX_PER_SEASON + PX_PER_SEASON / 2;
  const yPos = (v: number) => PAD.t + INNER_H - ((v - minV) / range) * INNER_H;

  const pts = data.map((d, i) => `${xPos(i)},${yPos(d.wins)}`).join(" ");
  const area = `${xPos(0)},${PAD.t + INNER_H} ${pts} ${xPos(data.length - 1)},${PAD.t + INNER_H}`;
  const gradId = `hg-${color.replace("#", "")}`;

  const handleMouseEnter = (
    e: React.MouseEvent<SVGElement>,
    point: HistoryPoint,
    i: number,
  ) => {
    const container = containerRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    setTooltip({
      point,
      // +YAXIS_W pour compenser l'overlay Y-axis en position absolue
      x: xPos(i) - scrollLeft + YAXIS_W,
      y: yPos(point.wins),
    });
  };

  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => ({
    v: minV + (range * i) / Y_TICKS,
    yy: yPos(minV + (range * i) / Y_TICKS),
  }));

  return (
    <div className="relative" style={{ height: CHART_H }}>
      {/* ── Scrollable chart area — starts after Y-axis overlay ── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-x-auto"
        style={{
          left: YAXIS_W,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}
      >
        <svg
          width={totalW}
          height={CHART_H}
          style={{
            display: "block",
            minWidth: VISIBLE * PX_PER_SEASON + PAD.r,
          }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map(({ yy }, i) => (
            <line
              key={i}
              x1={0}
              x2={totalW}
              y1={yy}
              y2={yy}
              stroke="#ffffff"
              strokeOpacity="0.05"
            />
          ))}

          <polygon points={area} fill={`url(#${gradId})`} />
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pts}
          />

          {data.map((d, i) => (
            <g key={d.season}>
              <rect
                x={xPos(i) - PX_PER_SEASON / 2}
                y={PAD.t}
                width={PX_PER_SEASON}
                height={INNER_H}
                fill="transparent"
                style={{ cursor: "crosshair" }}
                onMouseEnter={(e) => handleMouseEnter(e, d, i)}
                onMouseLeave={() => setTooltip(null)}
              />
              <circle
                cx={xPos(i)}
                cy={yPos(d.wins)}
                r={tooltip?.point.season === d.season ? 5 : 3}
                fill="#0A0A0B"
                stroke={color}
                strokeWidth={tooltip?.point.season === d.season ? 2 : 1.5}
                style={{ pointerEvents: "none", transition: "r 0.1s" }}
              />
              {(data.length <= 20 || i % 2 === 0) && (
                <text
                  x={xPos(i)}
                  y={CHART_H - 8}
                  fontSize="9"
                  fill="#ffffff"
                  fillOpacity={tooltip?.point.season === d.season ? 0.7 : 0.3}
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                >
                  {d.season.slice(2, 5)}
                  {d.season.slice(5)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* ── Y-axis overlay — fixed, non-scrolling ── */}
      <div
        className="absolute top-0 left-0 pointer-events-none z-10"
        style={{ width: YAXIS_W + 8, height: CHART_H }}
      >
        {/* Gradient fade to mask chart content scrolling under the axis */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, #111114 70%, transparent)",
          }}
        />
        <svg width={YAXIS_W} height={CHART_H} className="relative">
          {yTicks.map(({ v, yy }, i) => (
            <text
              key={i}
              x={YAXIS_W - 6}
              y={yy + 3}
              fontSize="10"
              fill="#ffffff"
              fillOpacity="0.35"
              textAnchor="end"
              fontFamily="ui-monospace, monospace"
            >
              {Math.round(v)}
            </text>
          ))}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 px-3 py-2 rounded-lg border border-white/[0.1] bg-[#1a1a1e] shadow-xl text-xs font-mono"
          style={{
            left: Math.min(
              Math.max(tooltip.x - 52, YAXIS_W + 4),
              (containerRef.current?.clientWidth ?? 600) + YAXIS_W - 110,
            ),
            top: Math.max(tooltip.y - 72, 4),
            minWidth: 104,
          }}
        >
          <div className="text-white/50 mb-1 uppercase tracking-wider text-[10px]">
            {tooltip.point.season}
          </div>
          <div className="flex gap-3">
            <span className="text-white font-semibold">
              {tooltip.point.wins}V
            </span>
            <span className="text-white/40">{tooltip.point.losses}D</span>
          </div>
          {tooltip.point.conferenceRank && (
            <div className="text-white/40 mt-0.5 text-[10px]">
              {tooltip.point.conferenceRank}e conf.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
