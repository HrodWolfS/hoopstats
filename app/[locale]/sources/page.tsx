import { type Metadata } from "next";
import { NIGHT_RULES } from "@/lib/stats/night";
import { FRENCH_RULES } from "@/lib/french";
import { TREND_RULES } from "@/lib/stats/trends";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { qualificationRule } from "@/lib/stats/leaders";
import { PLAYER_METRICS } from "@/lib/stats/metrics";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Sources & Méthodologie | hoopstats",
  description:
    "Origine des données NBA affichées sur hoopstats : sources officielles, méthodes de calcul, couverture historique et limites connues.",
  alternates: { canonical: "/fr/sources" },
};

// ─── Données ──────────────────────────────────────────────────────────────────

const SOURCES = [
  {
    name: "NBA Stats API",
    domain: "stats.nba.com",
    description:
      "API officielle de la NBA. Source des statistiques des saisons révolues, depuis 1980-81, et des métriques avancées (USG%, PIE, ORtg, DRtg, NRtg) qu'aucun box score ne permet de recalculer. Elle n'alimente plus la saison en cours : l'API ne répond plus depuis une infrastructure de production.",
    provides: [
      "Stats de base — saisons révolues, depuis 1980-81",
      "Stats avancées — saisons 2015-16 à 2024-25",
      "Profils joueurs (taille, poids, position)",
    ],
    badge: "Officielle NBA",
    badgeColor: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    logSources: [
      "import-player-stats",
      "import-player-stats-history",
      "import-advanced",
    ],
  },
  {
    name: "Ball Don't Lie",
    domain: "api.balldontlie.io",
    description:
      "API tierce utilisée pour enrichir les profils joueurs : informations de draft, université, nationalité, et équipe actuelle. Couvre les saisons modernes (2015-16 à 2024-25).",
    provides: [
      "Informations de draft (année, position, équipe)",
      "Université et nationalité",
      "Équipe courante et numéro de maillot",
    ],
    badge: "API tierce",
    badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    logSources: ["import-balldontlie"],
  },
  {
    name: "ESPN API",
    domain: "site.api.espn.com",
    description:
      "Utilisée pour les classements, le calendrier, les résultats, les box scores et le suivi des séries de playoffs. Fournit notamment les bilans et positions par conférence depuis 2001-02.",
    provides: [
      "Classements par conférence",
      "Bilan victoires-défaites par équipe",
      "Seed de conférence (2001-02 à aujourd'hui)",
      "Calendrier, résultats, box scores et séries de playoffs",
    ],
    badge: "API tierce",
    badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    logSources: ["sync-daily", "sync-playoffs", "sync-box-scores"],
  },
  {
    name: "Moyennes de la saison en cours",
    domain: "calculées par hoopstats",
    description:
      "Les moyennes de la saison en cours ne sont pas reprises d'un fournisseur : nous les recalculons chaque jour en additionnant les box scores ESPN match par match. Les moyennes portent donc sur les totaux réels, et les pourcentages sur les volumes de tirs plutôt que sur une moyenne de moyennes.",
    provides: [
      "Points, rebonds, passes, interceptions, contres et minutes par match",
      "FG%, 3P%, LF% et True Shooting, calculés sur les totaux",
      "Une ligne par équipe pour un joueur transféré",
    ],
    badge: "Calculée",
    badgeColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    logSources: ["sync-daily"],
  },
];

function formatUpdatedAt(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

const COVERAGE = [
  {
    type: "Stats de base",
    detail: "PTS, REB, AST, STL, BLK, FG%, 3P%, FT%, MJ",
    from: "1980-81",
    to: "2025-26",
    note: "Saison en cours calculée à partir des box scores ; saisons révolues importées de l'API NBA. Roster complet depuis 1996-97. Avant 1996 : top ~160-200 joueurs/saison uniquement (NBA Leaders).",
  },
  {
    type: "Stats avancées",
    detail: "TS%, USG%, PIE, ORtg, DRtg, NRtg",
    from: "2015-16",
    to: "2025-26",
    note: "Non disponibles pour les saisons antérieures à 2015-16 via l'API NBA. Sur la saison en cours, seul le TS% est recalculé quotidiennement : USG%, PIE et les ratings exigent des données de possession qu'un box score ne contient pas, et restent à leur dernière valeur importée.",
  },
  {
    type: "Profils joueurs",
    detail: "Draft, université, nationalité, photos",
    from: "2015-16",
    to: "2024-25",
    note: "Informations enrichies via Ball Don't Lie. Photos issues de Wikimedia Commons (CC-BY-SA).",
  },
  {
    type: "Classements équipes",
    detail: "W-L, seed conférence, net rating",
    from: "2001-02",
    to: "2025-26",
    note: "Données ESPN. Avant 2001-02 : classements non disponibles.",
  },
];

const STATS = PLAYER_METRICS.filter((metric) => metric.showInGlossary);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SourcesPage() {
  const sourceFreshness = await Promise.all(
    SOURCES.map((source) =>
      prisma.syncLog.findFirst({
        where: { source: { in: source.logSources } },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true, status: true, source: true },
      }),
    ),
  );

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-14">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-display font-semibold text-white">
          Sources & Méthodologie
        </h1>
        <p className="text-white/50 text-sm leading-relaxed max-w-xl">
          Toutes les statistiques affichées sur hoopstats proviennent de sources
          publiques identifiées ci-dessous. Cette page détaille leur origine,
          les formules utilisées et les limites connues de nos données.
        </p>
      </div>

      {/* Sources */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white">
          Sources de données
        </h2>
        <div className="space-y-3">
          {SOURCES.map((s, sourceIndex) => {
            const freshness = sourceFreshness[sourceIndex];
            return (
            <div
              key={s.name}
              className="rounded-xl border border-white/[0.06] bg-[#111114] p-5 space-y-3"
            >
              <div className="flex items-start gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-white">
                      {s.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${s.badgeColor}`}
                    >
                      {s.badge}
                    </span>
                  </div>
                  <span className="text-[11px] text-white/30 font-mono">
                    {s.domain}
                  </span>
                </div>
              </div>
              <p className="text-sm text-white/55 leading-relaxed">
                {s.description}
              </p>
              <ul className="space-y-1">
                {s.provides.map((item) => (
                  <li
                    key={item}
                    className="text-xs text-white/40 flex items-start gap-2"
                  >
                    <span className="text-orange-500 mt-0.5 shrink-0">·</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="pt-3 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                <span className="text-white/30">Dernier import connu</span>
                {freshness ? (
                  <span
                    className={
                      freshness.status === "error"
                        ? "text-red-300"
                        : freshness.status === "partial"
                          ? "text-amber-300"
                          : "text-emerald-300"
                    }
                    title={`Journal : ${freshness.source}`}
                  >
                    {formatUpdatedAt(freshness.completedAt)} · {freshness.status}
                  </span>
                ) : (
                  <span className="text-white/25">Non disponible</span>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </section>

      {/* Couverture */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white">
          Couverture des données
        </h2>
        <div className="rounded-xl border border-white/[0.06] bg-[#111114] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                <th className="text-left px-3 sm:px-5 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                  Indicateurs
                </th>
                <th className="text-left px-3 sm:px-4 py-3 font-medium">Période</th>
              </tr>
            </thead>
            <tbody>
              {COVERAGE.map((row, i) => (
                <tr
                  key={row.type}
                  className={`${i < COVERAGE.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                >
                  <td className="px-3 sm:px-5 py-4 align-top">
                    <div className="text-white/80 text-xs font-medium">
                      {row.type}
                    </div>
                    <div className="text-white/35 text-[11px] mt-0.5 leading-snug max-w-[200px]">
                      {row.note}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top hidden sm:table-cell">
                    <span className="text-[11px] font-mono text-white/40">
                      {row.detail}
                    </span>
                  </td>
                  <td className="px-3 sm:px-4 py-4 align-top">
                    <span className="text-xs text-white/60 font-mono whitespace-nowrap">
                      {row.from} → {row.to}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-white/30 leading-relaxed">
          * Avant la saison 1996-97, les données de l&apos;API NBA proviennent
          du classement des leaders (
          <span className="font-mono">LeagueLeaders</span>), couvrant uniquement
          les ~160 à 200 joueurs les plus actifs par saison, et non le roster
          complet de la ligue.
        </p>
      </section>

      {/* Glossaire */}
      <section id="metriques" className="scroll-mt-20 space-y-4">
        <h2 className="text-lg font-display font-semibold text-white">
          Glossaire des statistiques
        </h2>
        <p className="text-xs leading-relaxed text-white/40">
          Pour figurer dans un classement, un joueur doit avoir disputé 70 % des
          matchs de son équipe, comme sur NBA.com : 58 sur une saison complète,
          moins en cours de saison. Quand la règle NBA ne peut pas s’appliquer à
          nos données, la règle hoopstats retenue est indiquée.
        </p>
        <div className="space-y-2">
          {STATS.map((s) => (
            <div
              key={s.key}
              className="rounded-xl border border-white/[0.06] bg-[#111114] px-5 py-4 grid grid-cols-[72px_1fr] gap-4 items-start"
            >
              <div>
                <div className="font-display font-bold text-orange-400 text-base">
                  {s.shortLabel}
                </div>
                {s.availableSince !== "1980-81" && (
                  <div className="text-[10px] text-white/25 font-mono mt-0.5">
                    depuis {s.availableSince}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="text-white/80 text-sm font-medium">
                  {s.label}
                </div>
                {s.formula && (
                  <div className="text-[11px] font-mono text-white/35 bg-white/[0.03] rounded px-2 py-1 inline-block">
                    {s.formula}
                  </div>
                )}
                <p className="text-xs text-white/50 leading-relaxed">
                  {s.description}
                </p>
                <div className="text-[10px] text-white/25 font-mono">
                  Source : {s.source} · Qualification : {qualificationRule(s.qualification)}
                  {s.higherIsBetter ? " · valeur haute favorisée" : " · valeur basse favorisée"}
                </div>
                {s.limits && (
                  <p className="text-[11px] leading-relaxed text-amber-200/50">
                    Limite : {s.limits}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Accueil */}
      <section id="accueil" className="scroll-mt-20 space-y-4">
        <h2 className="text-lg font-display font-semibold text-white">
          Règles de l&apos;accueil
        </h2>
        <p className="text-xs leading-relaxed text-white/40">
          « La nuit NBA en chiffres » est calculée à chaque mise à jour à partir
          des matchs et box scores en base. Rien n&apos;y est saisi à la main.
        </p>
        <dl className="space-y-2">
          {NIGHT_RULES.map((item) => (
            <div key={item.title} className="rounded-xl border border-white/[0.06] bg-[#111114] px-5 py-4">
              <dt className="text-sm font-medium text-white/80">{item.title}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-white/50">{item.rule}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Tendances */}
      <section id="tendances" className="scroll-mt-20 space-y-4">
        <h2 className="text-lg font-display font-semibold text-white">
          Règles des tendances
        </h2>
        <p className="text-xs leading-relaxed text-white/40">
          La page{" "}
          <Link href="/fr/tendances" className="underline decoration-white/20 underline-offset-2 hover:text-white">
            Tendances
          </Link>{" "}
          compare les derniers matchs joués de chaque joueur à sa moyenne de
          saison régulière, avec ces règles.
        </p>
        <dl className="space-y-2">
          {TREND_RULES.map((item) => (
            <div key={item.title} className="rounded-xl border border-white/[0.06] bg-[#111114] px-5 py-4">
              <dt className="text-sm font-medium text-white/80">{item.title}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-white/50">{item.rule}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Français en NBA */}
      <section id="francais" className="scroll-mt-20 space-y-4">
        <h2 className="text-lg font-display font-semibold text-white">
          Qui compte comme Français
        </h2>
        <p className="text-xs leading-relaxed text-white/40">
          La même règle sert au hub{" "}
          <Link href="/fr/francais" className="underline decoration-white/20 underline-offset-2 hover:text-white">
            Français en NBA
          </Link>{" "}
          et à l&apos;accueil.
        </p>
        <dl className="space-y-2">
          {FRENCH_RULES.map((item) => (
            <div key={item.title} className="rounded-xl border border-white/[0.06] bg-[#111114] px-5 py-4">
              <dt className="text-sm font-medium text-white/80">{item.title}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-white/50">{item.rule}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Limites */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white">
          Limites connues
        </h2>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-5 py-4 space-y-3">
          {[
            "Les statistiques avancées (TS%, USG%, PIE, ORtg, DRtg, NRtg) ne sont pas disponibles pour les saisons antérieures à 2015-16.",
            "Pour les saisons 1980-81 à 1995-96, seuls les leaders statistiques de la ligue sont couverts (~160-200 joueurs/saison), pas l'ensemble du roster NBA.",
            "Les métriques BPM (Box Plus/Minus), VORP et Win Shares, exclusives à Basketball-Reference, ne sont pas intégrées.",
            "Le PIE affiché est la métrique propriétaire de NBA.com et diffère du PER (Player Efficiency Rating) de John Hollinger.",
            "Les données de la saison en cours peuvent présenter un délai de quelques heures selon la dernière synchronisation.",
            "Sur quelques matchs, la somme des points des joueurs est inférieure au score final. L'écart est présent dans le box score publié par ESPN, notre source : nous affichons le score officiel et les lignes telles que reçues, sans les corriger. Un bandeau le signale sur les matchs concernés.",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 text-xs">
              <span className="text-amber-400/70 mt-0.5 shrink-0">⚠</span>
              <span className="text-white/50 leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer liens */}
      <div className="border-t border-white/[0.06] pt-6 flex flex-wrap gap-4 text-xs text-white/30">
        <Link
          href="/fr/mentions-legales"
          className="hover:text-white/60 transition"
        >
          Mentions légales
        </Link>
        <Link
          href="/fr/politique-confidentialite"
          className="hover:text-white/60 transition"
        >
          Politique de confidentialité
        </Link>
        <a
          href="mailto:stempfel.rodolphe@gmail.com"
          className="hover:text-white/60 transition"
        >
          Contact
        </a>
      </div>
    </div>
  );
}
