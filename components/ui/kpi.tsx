type KPIProps = {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  accent?: string;
};

export function KPI({ label, value, unit, delta, accent }: KPIProps) {
  const positive = delta?.startsWith("+");
  return (
    <div className="group relative rounded-xl border border-white/[0.06] bg-[#111114] p-5 transition hover:border-white/[0.12]">
      <div className="text-[11px] uppercase tracking-[0.12em] text-white/40 font-medium">
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className="font-display font-semibold text-4xl tracking-tight tabular-nums"
          style={{ color: accent ?? "#fff" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-white/40 text-sm font-medium">{unit}</span>
        )}
      </div>
      {delta && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-xs font-medium tabular-nums ${positive ? "text-emerald-400" : "text-red-400"}`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              d={positive ? "M5 1L9 6H1z" : "M5 9L1 4H9z"}
              fill="currentColor"
            />
          </svg>
          {delta}
        </div>
      )}
    </div>
  );
}
