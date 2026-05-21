// Home page

function Home({ onNav }) {
  const [search, setSearch] = React.useState("");
  const [showCmdK, setShowCmdK] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCmdK(true);
      } else if (e.key === "Escape") setShowCmdK(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredTeams = window.TEAMS.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.abbr.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-4">
        <div className="flex items-center gap-2 text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
          Saison 2024–25 · semaine 27
        </div>
        <h1 className="font-display font-semibold text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.04em] max-w-4xl">
          La NBA, <span className="text-white/40">en français</span>,<br />
          sans le bordel des tableaux de 2005.
        </h1>
        <p className="mt-6 max-w-xl text-white/50 text-base leading-relaxed">
          30 équipes. 540 joueurs. Vingt saisons d'archives. Une lecture moderne
          des stats et de l'histoire de la ligue, pour ceux qui regardent les
          matchs à 3 h du matin.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => setShowCmdK(true)}
            className="group flex items-center gap-3 rounded-lg border border-white/10 bg-[#111114] px-4 py-2.5 text-sm text-white/50 hover:border-white/20 hover:text-white transition w-full max-w-md"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="flex-1 text-left">Chercher une équipe, un joueur, une saison…</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.03] text-white/40">
              ⌘K
            </kbd>
          </button>
        </div>
      </section>

      {/* Teams grid */}
      <section>
        <SectionHeader
          eyebrow="30 ÉQUIPES"
          title="L'effectif complet de la ligue"
          right={
            <div className="flex items-center gap-1 text-xs text-white/40">
              <span className="px-2 py-1 rounded-md bg-white/[0.04]">Conférence Est</span>
              <span className="px-2 py-1 rounded-md bg-white/[0.04]">Conférence Ouest</span>
            </div>
          }
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredTeams.map((t) => (
            <TeamCard key={t.abbr} team={t} onNav={onNav} />
          ))}
        </div>
      </section>

      {/* Hot players */}
      <section>
        <SectionHeader
          eyebrow="EN FEU"
          title="5 joueurs au-dessus du panier cette semaine"
          sub="Production sur les 5 derniers matchs"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {window.HOT_PLAYERS.map((p, i) => (
            <HotPlayerCard key={p.id} player={p} rank={i + 1} onNav={onNav} />
          ))}
        </div>
      </section>

      {/* Bottom rail — what else */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-12">
        <RailCard
          eyebrow="HISTORIQUE"
          title="78 saisons d'archives"
          body="Toutes les saisons régulières, playoffs et finales depuis 1946, indexées et croisées."
        />
        <RailCard
          eyebrow="COMPARATEUR"
          title="Mettez deux carrières côte à côte"
          body="Sélectionnez 2 à 4 joueurs et alignez leurs métriques sur n'importe quelle période."
        />
        <RailCard
          eyebrow="ÉDITORIAL"
          title="Le journal de la semaine"
          body="Analyses tactiques, mini-portraits et bilans hebdo. Écrits par des humains."
        />
      </section>
    </div>
  );
}

function SectionHeader({ eyebrow, title, sub, right }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-6">
      <div>
        <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium mb-2">
          {eyebrow}
        </div>
        <h2 className="font-display font-semibold text-2xl md:text-3xl tracking-tight">
          {title}
        </h2>
        {sub && <div className="text-sm text-white/40 mt-1">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function TeamCard({ team, onNav }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onNav("team", team.abbr)}
      className="group relative text-left rounded-2xl border border-white/[0.06] bg-[#111114] p-3 transition-all duration-300 hover:border-white/[0.15] hover:-translate-y-0.5"
      style={{
        boxShadow: hover
          ? `0 12px 40px -12px ${team.c1}80, 0 0 0 1px ${team.c1}30`
          : "none",
      }}
    >
      <div className="relative aspect-[1.15] rounded-xl overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${team.c1} 0%, ${team.c2} 100%)`,
          }}
        />
        <div
          className="absolute inset-0 mix-blend-overlay opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 10px)",
          }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center font-display font-bold tracking-tight"
          style={{
            color: window.readable(team.c2),
            fontSize: "clamp(2.4rem, 5vw, 3rem)",
            letterSpacing: "-0.04em",
          }}
        >
          {team.abbr}
        </div>
        <div className="absolute top-2 left-2 text-[9px] uppercase tracking-widest font-mono opacity-60"
          style={{ color: window.readable(team.c2) }}>
          {team.conf}
        </div>
      </div>
      <div className="mt-3 px-1 pb-1">
        <div className="text-[11px] text-white/40 uppercase tracking-wider">
          {team.city}
        </div>
        <div className="flex items-baseline justify-between mt-0.5">
          <div className="text-sm font-medium text-white">{team.name}</div>
          <div className="font-mono text-[11px] text-white/60 tabular-nums">
            {team.w}<span className="text-white/30">-</span>{team.l}
          </div>
        </div>
      </div>
    </button>
  );
}

function HotPlayerCard({ player, rank, onNav }) {
  const team = window.findTeam(player.team);
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onNav("player", player.id)}
      className="group relative text-left rounded-2xl border border-white/[0.06] bg-[#111114] p-4 transition-all duration-300 hover:border-white/[0.15] hover:-translate-y-0.5 overflow-hidden"
    >
      {/* big PPG reveal on hover */}
      <div
        className={cx(
          "absolute top-3 right-3 font-display font-bold tabular-nums leading-none transition-all duration-300",
          hover
            ? "text-5xl text-white opacity-100 -translate-y-0.5"
            : "text-2xl text-white/30 opacity-100"
        )}
      >
        {player.last5.pts.toFixed(1)}
        {hover && (
          <div className="text-[10px] text-white/40 font-sans font-normal tracking-widest uppercase mt-1 text-right">
            PPM · 5 derniers
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[11px] text-white/30">#{rank}</span>
        <PlayerAvatar player={player} size="sm" />
      </div>
      <div className="text-[11px] text-white/40 uppercase tracking-wider">
        {team.abbr} · {player.pos}
      </div>
      <div className="text-sm font-medium leading-tight mt-0.5">
        {player.first}<br />
        <span className="text-white">{player.last}</span>
      </div>
      <div
        className={cx(
          "mt-4 flex items-center gap-3 text-[11px] font-mono tabular-nums text-white/40 transition",
          hover ? "opacity-0" : "opacity-100"
        )}
      >
        <span>{player.last5.reb.toFixed(1)} RPM</span>
        <span>{player.last5.apg ?? player.last5.ast.toFixed(1)} PDM</span>
        <span className="ml-auto text-emerald-400">{player.trend}</span>
      </div>
    </button>
  );
}

function RailCard({ eyebrow, title, body }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6 hover:border-white/[0.12] transition group cursor-pointer">
      <div className="text-[11px] text-violet-400 uppercase tracking-[0.2em] font-medium mb-3">
        {eyebrow}
      </div>
      <div className="font-display font-semibold text-xl tracking-tight mb-2">
        {title}
      </div>
      <div className="text-sm text-white/50 leading-relaxed">{body}</div>
      <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/40 group-hover:text-white transition">
        Explorer
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

window.Home = Home;
