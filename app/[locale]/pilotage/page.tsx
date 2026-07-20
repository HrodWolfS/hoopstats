import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";

export const metadata: Metadata = {
  title: "Pilotage mensuel | hoopstats",
  robots: { index: false, follow: false },
};

function parseMonth(value: string | undefined) {
  const fallback = new Date().toISOString().slice(0, 7);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "") ? value! : fallback;
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    month,
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export default async function PilotagePage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const { month, start, end } = parseMonth((await searchParams).mois);
  const [events, failedSyncs, games, players, teams, boxScoreMissing, unresolved] =
    await Promise.all([
      prisma.analyticsDaily.groupBy({
        by: ["event", "dimension"],
        where: { day: { gte: start, lt: end } },
        _sum: { count: true },
        orderBy: { _sum: { count: "desc" } },
      }),
      prisma.syncLog.count({
        where: { completedAt: { gte: start, lt: end }, status: "error" },
      }),
      prisma.game.count({ where: { season: CURRENT_SEASON } }),
      prisma.player.count({ where: { seasons: { some: {} } } }),
      prisma.team.count(),
      prisma.game.count({
        where: { season: CURRENT_SEASON, status: "final", boxScore: { is: null } },
      }),
      prisma.playerBoxScore.count({
        where: { didNotPlay: false, playerName: { not: "—" }, playerId: null },
      }),
    ]);
  const total = (event: string) =>
    events
      .filter((row) => row.event === event)
      .reduce((sum, row) => sum + (row._sum.count ?? 0), 0);
  const sitemapEstimate = 3 + 8 + teams + players + games + 66;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400/70">Interne · noindex</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">Pilotage mensuel</h1>
          <p className="mt-2 text-sm text-white/35">Produit, données, SEO et exploitation · {month}</p>
        </div>
        <form method="get"><input type="month" name="mois" defaultValue={month} className="rounded-lg border border-white/[0.08] bg-[#111114] px-3 py-2 text-sm" /><button className="ml-2 rounded-lg bg-orange-600 px-3 py-2 text-sm">Afficher</button></form>
      </div>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Recherches" value={total("player_search")} />
        <Kpi label="Filtres appliqués" value={total("filter_apply")} />
        <Kpi label="Comparaisons" value={total("comparison")} />
        <Kpi label="Partages" value={total("share")} />
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Qualité des données">
          <Row label="Matchs en base" value={games} />
          <Row label="Box scores manquants" value={boxScoreMissing} alert={boxScoreMissing > 0} />
          <Row label="Identités nommées non résolues" value={unresolved} alert={unresolved > 0} />
          <Row label="Synchronisations en erreur" value={failedSyncs} alert={failedSyncs > 0} />
        </Panel>
        <Panel title="Acquisition et exploitation">
          <Row label="URLs estimées dans le sitemap" value={sitemapEstimate} />
          <Row label="Joueurs indexables" value={players} />
          <Row label="Coût analytics externe" value="0 €" />
          <Row label="Maintenance renseignée" value="À saisir" alert />
        </Panel>
      </section>
      <Panel title="Détail des événements">
        {events.length === 0 ? <p className="text-sm text-white/30">Aucun événement pour ce mois.</p> : events.map((row) => <Row key={`${row.event}:${row.dimension}`} label={`${row.event} · ${row.dimension}`} value={row._sum.count ?? 0} />)}
      </Panel>
      <p className="text-xs text-white/25">Aucune donnée personnelle n’est stockée. <Link href="/fr/politique-confidentialite" className="underline">Voir la politique</Link>.</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/[0.06] bg-[#111114] p-4"><div className="text-[9px] font-mono uppercase text-white/25">{label}</div><div className="mt-2 font-display text-3xl">{value.toLocaleString("fr-FR")}</div></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-5"><h2 className="mb-4 font-display text-lg">{title}</h2><div className="space-y-2">{children}</div></div>;
}
function Row({ label, value, alert = false }: { label: string; value: number | string; alert?: boolean }) {
  return <div className="flex justify-between gap-4 border-b border-white/[0.04] py-2 text-sm"><span className="text-white/40">{label}</span><span className={alert ? "font-mono text-amber-300" : "font-mono text-white/70"}>{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</span></div>;
}
