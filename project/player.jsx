// Player page (Jokić)

function PlayerPage({ playerId, onNav }) {
  const j = window.JOKIC;
  const team = window.findTeam(j.team);
  const career = window.JOKIC_CAREER;
  const [chartMode, setChartMode] = React.useState("evolution");

  return (
    <div className="space-y-10">
      <Crumbs
        onNav={onNav}
        items={[
          { label: "Accueil", page: "home" },
          { label: "Joueurs", page: "home" },
          { label: `${team.city} ${team.name}`, page: "team", payload: team.abbr },
          { label: `${j.first} ${j.last}` },
        ]}
      />

      {/* Header */}
      <section className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 md:col-span-5 lg:col-span-4 flex flex-col items-center md:items-start gap-3">
          <PlayerAvatar
            player={{ first: j.first, last: j.last, num: j.num, team: j.team }}
            size="hero"
          />
          <div className="px-3 py-1.5 rounded-lg bg-[#111114] border border-white/10 font-mono text-[11px] tracking-wider">
            {team.abbr} · #{j.num}
          </div>
        </div>
        <div className="col-span-12 md:col-span-7 lg:col-span-8 space-y-5">
          <div>
            <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mb-3 flex items-center gap-2">
              <span>{j.pos}</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <button
                onClick={() => onNav("team", team.abbr)}
                className="hover:text-white transition"
              >
                {team.city} {team.name}
              </button>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>{j.country}</span>
            </div>
            <h1 className="font-display font-semibold text-6xl md:text-7xl tracking-[-0.04em] leading-[0.95]">
              {j.first}
              <br />
              <span className="text-white/40">{j.last}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3 pt-2 text-sm">
            <Meta label="Taille" value={j.height} />
            <Meta label="Poids" value={j.weight} />
            <Meta label="Âge" value={`${j.age} ans`} />
            <Meta label="Draft" value={j.draft} />
          </div>

          <p className="text-white/60 text-base leading-relaxed max-w-2xl">
            {j.bio}
          </p>
        </div>
      </section>

      {/* KPI grid */}
      <section>
        <SectionHeader
          eyebrow="SAISON 2024–25"
          title="Six métriques pour résumer l'absurde"
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPI label="PPM" value={j.season.ppg} delta="+3.2" accent="#7C3AED" />
          <KPI label="RPM" value={j.season.rpg} delta="+0.3" accent="#06B6D4" />
          <KPI label="PDM" value={j.season.apg} delta="+1.2" accent="#F59E0B" />
          <KPI label="FG %" value={j.season.fg} unit="%" delta="-0.5" />
          <KPI label="3PT %" value={j.season.tp} unit="%" delta="+5.8" accent="#10B981" />
          <KPI label="PER" value={j.season.per} delta="+0.9" accent="#EC4899" />
        </div>
      </section>

      {/* Chart */}
      <section>
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mb-1">
                ÉVOLUTION CARRIÈRE
              </div>
              <h3 className="font-display font-semibold text-2xl tracking-tight">
                10 saisons, une trajectoire montante
              </h3>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              {[
                { id: "evolution", label: "Évolution" },
                { id: "radar", label: "Radar saison" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setChartMode(m.id)}
                  className={cx(
                    "px-3 py-1.5 text-xs rounded-md transition",
                    chartMode === m.id
                      ? "bg-white/[0.08] text-white"
                      : "text-white/40 hover:text-white/70"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {chartMode === "evolution" ? (
            <MultiLineChart data={career} />
          ) : (
            <Radar
              metrics={[
                { label: "PPM", value: j.season.ppg, max: 35 },
                { label: "RPM", value: j.season.rpg, max: 15 },
                { label: "PDM", value: j.season.apg, max: 12 },
                { label: "FG%", value: j.season.fg, max: 70 },
                { label: "3P%", value: j.season.tp, max: 50 },
                { label: "PER", value: j.season.per, max: 35 },
              ]}
              color={team.c2}
            />
          )}
        </div>
      </section>

      {/* Stats table */}
      <section>
        <SectionHeader
          eyebrow="STATISTIQUES"
          title="Saison par saison"
          sub="PPM = points par match · RPM = rebonds · PDM = passes décisives"
        />
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                <th className="text-left px-5 py-3 font-medium">Saison</th>
                <th className="text-right px-5 py-3 font-medium">MJ</th>
                <th className="text-right px-5 py-3 font-medium">MIN</th>
                <th className="text-right px-5 py-3 font-medium">PPM</th>
                <th className="text-right px-5 py-3 font-medium">RPM</th>
                <th className="text-right px-5 py-3 font-medium">PDM</th>
                <th className="text-right px-5 py-3 font-medium">FG%</th>
                <th className="text-right px-5 py-3 font-medium">3P%</th>
                <th className="text-left px-5 py-3 font-medium">PPM trend</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {career.map((row, i) => {
                const slice = career.slice(Math.max(0, i - 4), i + 1).map((d) => d.pts);
                const isCurrent = i === career.length - 1;
                return (
                  <tr
                    key={row.s}
                    className={cx(
                      "border-b border-white/[0.04] hover:bg-white/[0.02] transition group",
                      isCurrent && "bg-violet-500/[0.04]"
                    )}
                  >
                    <td className="px-5 py-3 text-white/80">
                      {row.s}
                      {isCurrent && (
                        <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-violet-400 align-middle" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-white/60">{row.gp}</td>
                    <td className="px-5 py-3 text-right text-white/60">{row.mpg}</td>
                    <td className="px-5 py-3 text-right text-white">{row.pts.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right">{row.reb.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right">{row.ast.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right">{row.fg.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right">{row.tp.toFixed(1)}</td>
                    <td className="px-5 py-3">
                      <Sparkline values={slice} color="#7C3AED" w={70} h={18} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Compare with... */}
      <section className="pb-12">
        <SectionHeader
          eyebrow="COMPARER AVEC"
          title="Quatre carrières à mettre en regard"
          sub="Cliquez sur un joueur pour ouvrir le comparateur"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {window.JOKIC_COMP.map((c) => {
            const ct = window.findTeam(c.team);
            return (
              <button
                key={c.last}
                className="group rounded-2xl border border-white/[0.06] bg-[#111114] p-4 text-left hover:border-white/[0.15] transition flex items-center gap-4"
              >
                <PlayerAvatar player={c} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-white/40">
                    {ct.abbr} · {c.pos}
                  </div>
                  <div className="text-base font-medium leading-tight mt-0.5">
                    {c.first} {c.last}
                  </div>
                </div>
                <svg
                  className="text-white/30 group-hover:text-violet-400 transition"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M7 17 17 7M7 7h10v10" />
                </svg>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-white/40 uppercase tracking-wider">{label}</div>
      <div className="text-white/90 mt-0.5">{value}</div>
    </div>
  );
}

function Radar({ metrics, color = "#7C3AED" }) {
  const size = 360;
  const cx0 = size / 2;
  const cy0 = size / 2;
  const r = size / 2 - 50;
  const n = metrics.length;

  const point = (i, ratio) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    return [cx0 + Math.cos(angle) * r * ratio, cy0 + Math.sin(angle) * r * ratio];
  };

  const rings = [0.25, 0.5, 0.75, 1];

  const dataPoints = metrics.map((m, i) => point(i, m.value / m.max));
  const polyPts = dataPoints.map((p) => p.join(",")).join(" ");

  return (
    <div className="flex items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-md">
        {rings.map((rr, i) => (
          <polygon
            key={i}
            points={metrics.map((_, j) => point(j, rr).join(",")).join(" ")}
            fill="none"
            stroke="#ffffff"
            strokeOpacity={i === rings.length - 1 ? 0.1 : 0.05}
          />
        ))}
        {metrics.map((_, i) => {
          const [x, y] = point(i, 1);
          return (
            <line
              key={i}
              x1={cx0}
              y1={cy0}
              x2={x}
              y2={y}
              stroke="#ffffff"
              strokeOpacity="0.05"
            />
          );
        })}
        <polygon points={polyPts} fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2" />
        {dataPoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="#0A0A0B" stroke={color} strokeWidth="2" />
        ))}
        {metrics.map((m, i) => {
          const [x, y] = point(i, 1.18);
          return (
            <g key={i}>
              <text
                x={x}
                y={y}
                fontSize="11"
                fill="#ffffff"
                fillOpacity="0.6"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                {m.label}
              </text>
              <text
                x={x}
                y={y + 14}
                fontSize="10"
                fill={color}
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                fontWeight="600"
              >
                {m.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

window.PlayerPage = PlayerPage;
