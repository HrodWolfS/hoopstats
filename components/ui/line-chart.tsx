type DataPoint = {
  s: string; // label axe X (ex: "OCT", "2023-24")
  [key: string]: number | string;
};

type LineChartProps = {
  data: DataPoint[];
  accessor: (d: DataPoint) => number;
  label: string;
  color?: string;
  w?: number;
  h?: number;
};

export function LineChart({
  data,
  accessor,
  label,
  color = "#7C3AED",
  w = 720,
  h = 220,
}: LineChartProps) {
  if (!data.length) return null;
  const pad = { t: 24, r: 24, b: 28, l: 36 };
  const W = w - pad.l - pad.r;
  const H = h - pad.t - pad.b;
  const vals = data.map(accessor);
  const min = Math.floor(Math.min(...vals));
  const max = Math.ceil(Math.max(...vals));
  const range = max - min || 1;
  const x = (i: number) => pad.l + (i / (data.length - 1)) * W;
  const y = (v: number) => pad.t + H - ((v - min) / range) * H;
  const pts = data.map((d, i) => `${x(i)},${y(accessor(d))}`).join(" ");
  const area = `${pad.l},${pad.t + H} ${pts} ${pad.l + W},${pad.t + H}`;
  const yticks = 4;
  const gradId = `g-${label}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: yticks + 1 }).map((_, i) => {
        const v = min + (range * i) / yticks;
        const yy = y(v);
        return (
          <g key={i}>
            <line
              x1={pad.l}
              x2={pad.l + W}
              y1={yy}
              y2={yy}
              stroke="#ffffff"
              strokeOpacity="0.05"
            />
            <text
              x={pad.l - 8}
              y={yy + 3}
              fontSize="10"
              fill="#ffffff"
              fillOpacity="0.4"
              textAnchor="end"
              fontFamily="ui-monospace, monospace"
            >
              {v.toFixed(0)}
            </text>
          </g>
        );
      })}
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
        <g key={i}>
          <circle
            cx={x(i)}
            cy={y(accessor(d))}
            r="3"
            fill="#0A0A0B"
            stroke={color}
            strokeWidth="1.5"
          />
          <text
            x={x(i)}
            y={h - 10}
            fontSize="10"
            fill="#ffffff"
            fillOpacity="0.4"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            {d.s}
          </text>
        </g>
      ))}
    </svg>
  );
}
