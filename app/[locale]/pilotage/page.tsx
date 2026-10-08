import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentSeason } from "@/lib/nba";
import { isPilotageAuthorized } from "@/lib/pilotage-auth";
import { addDays, retentionRate, utcDayKey } from "@/lib/retention";
import { statRequestCategoryLabel } from "@/lib/stat-requests";

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
  // Le proxy demande déjà le mot de passe ; ce second contrôle, au plus près
  // des données, garde la page fermée si le matcher du proxy change.
  if (!isPilotageAuthorized((await headers()).get("authorization"))) notFound();
  const { month, start, end } = parseMonth((await searchParams).mois);
  const today = utcDayKey(new Date());
  const [events, failedSyncs, games, players, teams, boxScoreMissing, unresolved, visits, requestsByCategory, latestRequests] =
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
      prisma.game.count({ where: { season: currentSeason() } }),
      prisma.player.count({ where: { seasons: { some: {} } } }),
      prisma.team.count(),
      prisma.game.count({
        where: { season: currentSeason(), status: "final", boxScore: { is: null } },
      }),
      prisma.playerBoxScore.count({
        where: { didNotPlay: false, playerName: { not: "—" }, playerId: null },
      }),
      // Fenêtre glissante, indépendante du mois affiché : 56 jours de cohortes.
      prisma.analyticsDaily.findMany({
        where: { event: { in: ["visit", "return"] }, day: { gte: new Date(`${addDays(today, -56)}T00:00:00Z`) } },
        select: { day: true, event: true, dimension: true, count: true },
      }),
      prisma.statRequest.groupBy({
        by: ["category"],
        where: { createdAt: { gte: start, lt: end } },
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
      }),
      prisma.statRequest.findMany({
        where: { createdAt: { gte: start, lt: end }, text: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, createdAt: true, category: true, text: true, page: true },
      }),
    ]);
  const total = (event: string) =>
    events
      .filter((row) => row.event === event)
      .reduce((sum, row) => sum + (row._sum.count ?? 0), 0);
  const count = (event: string, dimension: string) =>
    events
      .filter((row) => row.event === event && row.dimension === dimension)
      .reduce((sum, row) => sum + (row._sum.count ?? 0), 0);
  const globalSearches = total("global_search");
  const globalEmpty = count("global_search", "empty");
  const globalEmptyRate = globalSearches ? Math.round((globalEmpty / globalSearches) * 100) : null;
  const j7 = retentionRate(visits, "j7", today);
  const j28 = retentionRate(visits, "j28", today);
  const lastWeekStart = new Date(`${addDays(today, -6)}T00:00:00Z`);
  const lastWeek = (dimension: string) =>
    visits
      .filter((row) => row.event === "visit" && row.dimension === dimension && row.day >= lastWeekStart)
      .reduce((sum, row) => sum + row.count, 0);
  const requestTotal = requestsByCategory.reduce((sum, row) => sum + row._count._all, 0);
  const shortDate = (day: string) => day.slice(8, 10) + "/" + day.slice(5, 7);
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
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Recherches" value={total("player_search") + globalSearches} />
        <Kpi label="Filtres appliqués" value={total("filter_apply")} />
        <Kpi label="Comparaisons" value={total("comparison")} />
        <Kpi label="Partages et liens copiés" value={total("share") + total("copy_link")} />
        <Kpi label="Exports CSV" value={total("export")} />
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Qualité des données">
          <Row label="Matchs en base" value={games} />
          <Row label="Box scores manquants" value={boxScoreMissing} alert={boxScoreMissing > 0} />
          <Row label="Identités nommées non résolues" value={unresolved} alert={unresolved > 0} />
          <Row label="Synchronisations en erreur" value={failedSyncs} alert={failedSyncs > 0} />
        </Panel>
        <Panel title="Recherche globale">
          <Row label="Recherches (⌘K)" value={globalSearches} />
          <Row label="Suivies d’un clic sur un résultat" value={count("global_search", "selected")} />
          <Row label="Sans résultat" value={globalEmpty} />
          <Row
            label="Taux sans résultat (objectif < 10 %)"
            value={globalEmptyRate === null ? "—" : `${globalEmptyRate} %`}
            alert={globalEmptyRate !== null && globalEmptyRate >= 10}
          />
        </Panel>
        <Panel title="Acquisition et exploitation">
          <Row label="URLs estimées dans le sitemap" value={sitemapEstimate} />
          <Row label="Joueurs indexables" value={players} />
          <Row label="Coût analytics externe" value="0 €" />
          <Row label="Maintenance renseignée" value="À saisir" alert />
        </Panel>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Panel title="Retour des visiteurs (glissant, UTC)">
          <Row
            label={`J7 · cohortes du ${shortDate(j7.from)} au ${shortDate(j7.to)} (objectif ≥ 25 %)`}
            value={j7.rate === null ? "—" : `${j7.rate} % (${j7.returned}/${j7.cohort})`}
            alert={j7.rate !== null && j7.rate < 25}
          />
          <Row
            label={`J28 · cohortes du ${shortDate(j28.from)} au ${shortDate(j28.to)}`}
            value={j28.rate === null ? "—" : `${j28.rate} % (${j28.returned}/${j28.cohort})`}
          />
          <Row label="Nouveaux visiteurs, 7 derniers jours" value={lastWeek("new")} />
          <Row label="Visites de retour, 7 derniers jours" value={lastWeek("returning")} />
          <p className="pt-2 text-xs text-white/25">Un visiteur compte une fois par jour. Navigateurs vidés et refus de mesure exclus : ces taux sont des minimums.</p>
        </Panel>
        <Panel title={`Demandes de statistiques · ${requestTotal.toLocaleString("fr-FR")}`}>
          {requestsByCategory.length === 0 ? (
            <p className="text-sm text-white/30">Aucune demande pour ce mois.</p>
          ) : (
            requestsByCategory.map((row) => (
              <Row key={row.category} label={statRequestCategoryLabel(row.category)} value={row._count._all} />
            ))
          )}
        </Panel>
      </section>
      {latestRequests.length > 0 && (
        <Panel title="Derniers textes libres (50 au plus)">
          <ul className="divide-y divide-white/[0.04]">
            {latestRequests.map((request) => (
              <li key={request.id} className="py-3 text-sm">
                <p className="break-words text-white/70">{request.text}</p>
                <p className="mt-1 font-mono text-[10px] text-white/30">
                  {request.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} · {statRequestCategoryLabel(request.category)} · {request.page}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
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
