// Shared components: Avatar (player), TeamMono, KPI, Sparkline, LineChart, RadarChart

const cx = (...a) => a.filter(Boolean).join(" ");

// Choose readable text color over a colored bg
function readable(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0A0A0B" : "#ffffff";
}

// Team monogram card / chip with gradient
function TeamMono({ team, size = "md", className = "", style = {} }) {
  const sizes = {
    xs: "h-8 w-8 text-[10px] rounded-md",
    sm: "h-10 w-10 text-[11px] rounded-lg",
    md: "h-14 w-14 text-[13px] rounded-xl",
    lg: "h-24 w-24 text-xl rounded-2xl",
    xl: "h-40 w-40 text-5xl rounded-3xl",
    hero: "h-56 w-56 text-7xl rounded-[28px]",
  };
  const fg = readable(team.c2);
  return (
    <div
      className={cx(
        "relative overflow-hidden flex items-center justify-center font-display font-bold tracking-tight select-none",
        sizes[size],
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${team.c1} 0%, ${team.c2} 100%)`,
        color: fg,
        ...style,
      }}
    >
      {/* subtle grid noise */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 8px)",
        }}
      />
      <span className="relative">{team.abbr}</span>
    </div>
  );
}

// Player avatar — stylized, initials + jersey num + team-colored ring
function PlayerAvatar({ player, size = "md", showNum = true, className = "" }) {
  const team = window.findTeam(player.team) || { c1: "#7C3AED", c2: "#06B6D4", abbr: "?" };
  const sizes = {
    xs: { box: "h-8 w-8", text: "text-[10px]", num: "text-[8px] -bottom-0.5 -right-0.5 h-3.5 w-3.5" },
    sm: { box: "h-10 w-10", text: "text-xs", num: "text-[9px] -bottom-1 -right-1 h-4 w-4" },
    md: { box: "h-14 w-14", text: "text-base", num: "text-[10px] -bottom-1 -right-1 h-5 w-5" },
    lg: { box: "h-20 w-20", text: "text-xl", num: "text-[11px] -bottom-1 -right-1 h-6 w-6" },
    xl: { box: "h-32 w-32", text: "text-4xl", num: "text-sm -bottom-1.5 -right-1.5 h-9 w-9" },
    hero: { box: "h-56 w-56", text: "text-7xl", num: "text-2xl -bottom-3 -right-3 h-16 w-16" },
  };
  const s = sizes[size];
  const initials = `${player.first?.[0] || ""}${player.last?.[0] || ""}`;
  const fg = readable(team.c2);
  return (
    <div className={cx("relative inline-block", className)}>
      <div
        className={cx(
          "rounded-full flex items-center justify-center font-display font-bold tracking-tight",
          s.box,
          s.text
        )}
        style={{
          background: `linear-gradient(135deg, ${team.c1} 0%, ${team.c2} 100%)`,
          color: fg,
        }}
      >
        <span>{initials}</span>
      </div>
      {showNum && (
        <div
          className={cx(
            "absolute rounded-full flex items-center justify-center font-display font-semibold ring-2 ring-[#0A0A0B] bg-[#1A1A1F] text-white",
            s.num
          )}
        >
          {player.num}
        </div>
      )}
    </div>
  );
}

// KPI card
function KPI({ label, value, unit, delta, accent }) {
  return (
    <div className="group relative rounded-xl border border-white/[0.06] bg-[#111114] p-5 transition hover:border-white/[0.12]">
      <div className="text-[11px] uppercase tracking-[0.12em] text-white/40 font-medium">
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className="font-display font-semibold text-4xl tracking-tight tabular-nums"
          style={{ color: accent || "#fff" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-white/40 text-sm font-medium">{unit}</span>
        )}
      </div>
      {delta && (
        <div
          className={cx(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium tabular-nums",
            delta.startsWith("+") ? "text-emerald-400" : "text-red-400"
          )}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              d={delta.startsWith("+") ? "M5 1L9 6H1z" : "M5 9L1 4H9z"}
              fill="currentColor"
            />
          </svg>
          {delta}
        </div>
      )}
    </div>
  );
}

// Sparkline (inline, small)
function Sparkline({ values, color = "#7C3AED", w = 80, h = 22 }) {
  if (!values?.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = values[values.length - 1];
  const lx = w;
  const ly = h - ((last - min) / range) * h;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
      <circle cx={lx} cy={ly} r="2" fill={color} />
    </svg>
  );
}

// Line chart (medium)
function LineChart({ data, accessor, label, color = "#7C3AED", w = 720, h = 220 }) {
  const pad = { t: 24, r: 24, b: 28, l: 36 };
  const W = w - pad.l - pad.r;
  const H = h - pad.t - pad.b;
  const vals = data.map(accessor);
  const min = Math.floor(Math.min(...vals));
  const max = Math.ceil(Math.max(...vals));
  const range = max - min || 1;
  const x = (i) => pad.l + (i / (data.length - 1)) * W;
  const y = (v) => pad.t + H - ((v - min) / range) * H;
  const pts = data.map((d, i) => `${x(i)},${y(accessor(d))}`).join(" ");
  const area = `${pad.l},${pad.t + H} ${pts} ${pad.l + W},${pad.t + H}`;
  const yticks = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <linearGradient id={`g-${label}`} x1="0" x2="0" y1="0" y2="1">
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
      <polygon points={area} fill={`url(#g-${label})`} />
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
          <circle cx={x(i)} cy={y(accessor(d))} r="3" fill="#0A0A0B" stroke={color} strokeWidth="1.5" />
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

// Multi-line career chart (PTS / REB / AST)
function MultiLineChart({ data, w = 880, h = 280 }) {
  const pad = { t: 28, r: 100, b: 32, l: 36 };
  const W = w - pad.l - pad.r;
  const H = h - pad.t - pad.b;
  const lines = [
    { key: "pts", label: "PPM", color: "#7C3AED" },
    { key: "reb", label: "RPM", color: "#06B6D4" },
    { key: "ast", label: "PDM", color: "#F59E0B" },
  ];
  const allVals = lines.flatMap((l) => data.map((d) => d[l.key]));
  const min = 0;
  const max = Math.ceil(Math.max(...allVals) + 2);
  const range = max - min || 1;
  const x = (i) => pad.l + (i / (data.length - 1)) * W;
  const y = (v) => pad.t + H - ((v - min) / range) * H;
  const yticks = 5;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
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
      {lines.map((l) => {
        const pts = data.map((d, i) => `${x(i)},${y(d[l.key])}`).join(" ");
        return (
          <g key={l.key}>
            <polyline
              fill="none"
              stroke={l.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pts}
            />
            {data.map((d, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(d[l.key])}
                r="2.5"
                fill="#0A0A0B"
                stroke={l.color}
                strokeWidth="1.5"
              />
            ))}
            <text
              x={pad.l + W + 12}
              y={y(data[data.length - 1][l.key]) + 4}
              fontSize="11"
              fill={l.color}
              fontFamily="ui-monospace, monospace"
              fontWeight="600"
            >
              {l.label} · {data[data.length - 1][l.key].toFixed(1)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => (
        <text
          key={i}
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
      ))}
    </svg>
  );
}

// Breadcrumbs
function Crumbs({ items, onNav }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-white/40">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {it.page ? (
              <button
                onClick={() => onNav(it.page, it.payload)}
                className="hover:text-white/80 transition"
              >
                {it.label}
              </button>
            ) : (
              <span className={last ? "text-white/80" : ""}>{it.label}</span>
            )}
            {!last && <span className="text-white/20">/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

Object.assign(window, {
  cx, readable,
  TeamMono, PlayerAvatar,
  KPI, Sparkline, LineChart, MultiLineChart,
  Crumbs,
});
