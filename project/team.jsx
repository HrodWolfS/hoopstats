// Team page (LAL)

function TeamPage({ teamAbbr, onNav }) {
  const team = window.findTeam(teamAbbr) || window.findTeam("LAL");
  const [tab, setTab] = React.useState("roster");

  const wPct = ((team.w / (team.w + team.l)) * 100).toFixed(1);

  return (
    <div className="space-y-10">
      <Crumbs
        onNav={onNav}
        items={[
          { label: "Accueil", page: "home" },
          { label: "Équipes", page: "home" },
          { label: `${team.city} ${team.name}` },
        ]}
      />

      {/* Header */}
      <section className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 md:col-span-4">
          <TeamMono team={team} size="hero" className="shadow-2xl" />
        </div>
        <div className="col-span-12 md:col-span-8 space-y-5">
          <div>
            <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mb-3">
              Conférence {team.conf} · Division {team.div}
            </div>
            <h1 className="font-display font-semibold text-6xl md:text-7xl tracking-[-0.04em] leading-[0.95]">
              {team.city}
              <br />
              <span className="text-white/40">{team.name}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-10 gap-y-4 pt-2">
            <div>
              <div className="text-[11px] text-white/40 uppercase tracking-wider">Bilan</div>
              <div className="font-display font-semibold text-3xl tabular-nums mt-1">
                {team.w}<span className="text-white/30 mx-1">–</span>{team.l}
              </div>
              <div className="text-xs text-white/40 font-mono mt-0.5">{wPct}% de victoires</div>
            </div>
            <div>
              <div className="text-[11px] text-white/40 uppercase tracking-wider">Classement</div>
              <div className="font-display font-semibold text-3xl tabular-nums mt-1">
                7<span className="text-white/40 text-lg">e</span>
                <span className="text-white/30 text-base font-sans"> Ouest</span>
              </div>
              <div className="text-xs text-white/40 font-mono mt-0.5">Play-in en vue</div>
            </div>
            <div>
              <div className="text-[11px] text-white/40 uppercase tracking-wider">Coach</div>
              <div className="text-base mt-1">JJ Redick</div>
              <div className="text-xs text-white/40 mt-0.5">1<sup>re</sup> saison</div>
            </div>
            <div>
              <div className="text-[11px] text-white/40 uppercase tracking-wider">Salle</div>
              <div className="text-base mt-1">Crypto.com Arena</div>
              <div className="text-xs text-white/40 mt-0.5">Los Angeles, CA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: "roster", label: "Effectif" },
          { id: "season", label: "Saison actuelle" },
          { id: "history", label: "Historique 10 saisons" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "roster" && <RosterView team={team} />}
      {tab === "season" && <SeasonView team={team} />}
      {tab === "history" && <HistoryView team={team} />}
    </div>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="relative border-b border-white/[0.06]">
      <div className="flex items-center gap-1">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cx(
                "relative px-4 py-3 text-sm font-medium transition",
                isActive ? "text-white" : "text-white/40 hover:text-white/70"
              )}
            >
              {t.label}
              <span
                className={cx(
                  "absolute left-3 right-3 -bottom-px h-px transition-all duration-300",
                  isActive ? "bg-violet-400 left-3 right-3" : "bg-transparent left-1/2 right-1/2"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RosterView({ team }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs text-white/40">
        <div className="font-mono">
          {window.LAL_ROSTER.length} joueurs · effectif au {new Date().toLocaleDateString("fr-FR")}
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="px-2 py-1 rounded-md bg-white/[0.04]">Tous postes</span>
          <span className="px-2 py-1 rounded-md bg-white/[0.04]">↓ PPM</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {window.LAL_ROSTER.map((p) => (
          <RosterCard key={p.num} player={{ ...p, team: team.abbr }} team={team} />
        ))}
      </div>
    </div>
  );
}

function RosterCard({ player, team }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative rounded-2xl border border-white/[0.06] bg-[#111114] p-4 transition cursor-pointer hover:border-white/[0.15] overflow-hidden"
      style={{
        boxShadow: hover ? `0 0 0 1px ${team.c1}40` : "none",
      }}
    >
      <div className="flex items-start gap-4">
        <PlayerAvatar player={player} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-white/40 flex items-center gap-2 whitespace-nowrap">
            <span>{player.pos}</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>{player.age}<span className="lowercase">a</span></span>
          </div>
          <div className="mt-1 font-display font-semibold text-lg leading-tight tracking-tight truncate">
            {player.first} {player.last}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="PPM" value={player.ppg} />
            <Stat label="RPM" value={player.rpg} />
            <Stat label="PDM" value={player.apg} />
          </div>
        </div>
      </div>
      <div
        className={cx(
          "absolute right-3 top-3 text-[10px] font-mono text-white/30 transition",
          hover ? "opacity-0" : "opacity-100"
        )}
      >
        #{player.num}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md bg-white/[0.03] py-1.5">
      <div className="font-display font-semibold text-base tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}

function SeasonView({ team }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Off. Rating" value={window.LAL_KPI.off} unit="pts/100" delta="+2.1" accent="#7C3AED" />
        <KPI label="Def. Rating" value={window.LAL_KPI.def} unit="pts/100" delta="-0.4" accent="#06B6D4" />
        <KPI label="Net Rating" value={`+${window.LAL_KPI.net}`} delta="+1.5" accent="#10B981" />
        <KPI label="Pace" value={window.LAL_KPI.pace} unit="poss/match" delta="+0.8" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mb-1">
            VICTOIRES PAR MOIS
          </div>
          <h3 className="font-display font-semibold text-xl tracking-tight mb-4">
            Forme régulière, pic en mars
          </h3>
          <LineChart
            data={[
              { s: "OCT", w: 5 },
              { s: "NOV", w: 8 },
              { s: "DEC", w: 7 },
              { s: "JAN", w: 9 },
              { s: "FÉV", w: 6 },
              { s: "MAR", w: 11 },
              { s: "AVR", w: 1 },
            ]}
            accessor={(d) => d.w}
            label="lal-month"
            color="#7C3AED"
          />
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6 space-y-4">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
            INDICATEURS CLÉS
          </div>
          {[
            { l: "True Shooting %", v: "58.4", b: 0.68 },
            { l: "Effective FG %", v: "55.1", b: 0.55 },
            { l: "Turnovers", v: "13.8", b: 0.42 },
            { l: "Rebonds off.", v: "10.2", b: 0.31 },
            { l: "Assists/match", v: "26.4", b: 0.62 },
          ].map((row) => (
            <div key={row.l}>
              <div className="flex items-baseline justify-between text-sm mb-1.5">
                <span className="text-white/60">{row.l}</span>
                <span className="font-mono tabular-nums">{row.v}</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.05]">
                <div
                  className="h-1 rounded-full"
                  style={{ width: `${row.b * 100}%`, background: "linear-gradient(90deg,#7C3AED,#06B6D4)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryView({ team }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
            VICTOIRES PAR SAISON — 10 DERNIÈRES
          </div>
          <div className="text-xs text-white/40 font-mono">
            Moy. {Math.round(window.LAL_WINS.reduce((s, d) => s + d.w, 0) / window.LAL_WINS.length)} W
          </div>
        </div>
        <h3 className="font-display font-semibold text-xl tracking-tight mb-4">
          De la traversée du désert au retour en playoffs
        </h3>
        <LineChart
          data={window.LAL_WINS}
          accessor={(d) => d.w}
          label="lal-10y"
          color={team.c1}
        />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
              <th className="text-left px-5 py-3 font-medium">Saison</th>
              <th className="text-right px-5 py-3 font-medium">W</th>
              <th className="text-right px-5 py-3 font-medium">L</th>
              <th className="text-right px-5 py-3 font-medium">%</th>
              <th className="text-right px-5 py-3 font-medium">Playoffs</th>
              <th className="text-left px-5 py-3 font-medium">Tendance</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {window.LAL_WINS.map((row, i) => {
              const losses = 82 - row.w;
              const pct = ((row.w / 82) * 100).toFixed(1);
              const playoff =
                row.w >= 50 ? "Conf. Finals" :
                row.w >= 42 ? "1er tour" :
                row.w >= 38 ? "Play-in" : "—";
              const window5 = window.LAL_WINS.slice(Math.max(0, i - 4), i + 1).map(d => d.w);
              return (
                <tr key={row.s} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition group">
                  <td className="px-5 py-3 text-white/80">{row.s}</td>
                  <td className="px-5 py-3 text-right">{row.w}</td>
                  <td className="px-5 py-3 text-right text-white/40">{losses}</td>
                  <td className="px-5 py-3 text-right">{pct}</td>
                  <td className="px-5 py-3 text-right text-white/60 font-sans">{playoff}</td>
                  <td className="px-5 py-3">
                    <Sparkline values={window5} color={team.c1} w={70} h={18} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.TeamPage = TeamPage;
