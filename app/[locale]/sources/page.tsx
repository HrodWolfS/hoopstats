import { type Metadata } from "next";
import Link from "next/link";

export const revalidate = false;

export const metadata: Metadata = {
  title: "Sources & Méthodologie | hoopstats",
  description:
    "Origine des données NBA affichées sur hoopstats : sources officielles, méthodes de calcul, couverture historique et limites connues.",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type StatDef = {
  abbr: string;
  name: string;
  formula?: string;
  description: string;
  source: string;
  since?: string;
};

// ─── Données ──────────────────────────────────────────────────────────────────

const SOURCES = [
  {
    name: "NBA Stats API",
    domain: "stats.nba.com",
    description:
      "Source principale. API officielle de la NBA utilisée pour les statistiques de base (points, rebonds, passes, etc.) et les statistiques avancées (TS%, USG%, PIE, ORtg, DRtg, NRtg). Données disponibles depuis la saison 1980-81.",
    provides: [
      "Stats de base — toutes saisons depuis 1980-81",
      "Stats avancées — saisons 2015-16 à aujourd'hui",
      "Profils joueurs (taille, poids, position)",
    ],
    badge: "Officielle NBA",
    badgeColor: "text-violet-400 bg-violet-500/10 border-violet-500/20",
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
  },
  {
    name: "ESPN API",
    domain: "site.api.espn.com",
    description:
      "Utilisée spécifiquement pour les classements (standings) des équipes par conférence. Fournit les bilans victoires/défaites et la position au classement pour chaque saison depuis 2001-02.",
    provides: [
      "Classements par conférence",
      "Bilan victoires-défaites par équipe",
      "Seed de conférence (2001-02 à aujourd'hui)",
    ],
    badge: "API tierce",
    badgeColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
];

const COVERAGE = [
  {
    type: "Stats de base",
    detail: "PTS, REB, AST, STL, BLK, FG%, 3P%, FT%, MJ",
    from: "1980-81",
    to: "2025-26",
    note: "Roster complet depuis 1996-97. Avant 1996 : top ~160-200 joueurs/saison uniquement (NBA Leaders).",
  },
  {
    type: "Stats avancées",
    detail: "TS%, USG%, PIE, ORtg, DRtg, NRtg",
    from: "2015-16",
    to: "2025-26",
    note: "Non disponibles pour les saisons antérieures à 2015-16 via l'API NBA.",
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

const STATS: StatDef[] = [
  {
    abbr: "PTS",
    name: "Points",
    description: "Nombre de points marqués par match en moyenne.",
    source: "NBA Stats API",
  },
  {
    abbr: "REB",
    name: "Rebonds",
    description: "Total des rebonds offensifs et défensifs par match.",
    source: "NBA Stats API",
  },
  {
    abbr: "AST",
    name: "Passes décisives",
    description: "Passes directement à l'origine d'un panier par match.",
    source: "NBA Stats API",
  },
  {
    abbr: "FG%",
    name: "Field Goal Percentage",
    formula: "FGM / FGA",
    description:
      "Pourcentage de tirs réussis (2 pts + 3 pts), hors lancers francs.",
    source: "NBA Stats API",
  },
  {
    abbr: "3P%",
    name: "Three Point Percentage",
    formula: "3PM / 3PA",
    description: "Pourcentage de tirs à 3 points réussis.",
    source: "NBA Stats API",
  },
  {
    abbr: "FT%",
    name: "Free Throw Percentage",
    formula: "FTM / FTA",
    description: "Pourcentage de lancers francs réussis.",
    source: "NBA Stats API",
  },
  {
    abbr: "TS%",
    name: "True Shooting Percentage",
    formula: "PTS / (2 × (FGA + 0,44 × FTA))",
    description:
      "Mesure l'efficacité de tir globale en intégrant les tirs à 2 pts, 3 pts et lancers francs dans un seul indicateur. Un TS% de 58% ou plus est considéré excellent.",
    source: "NBA Stats API",
    since: "2015-16",
  },
  {
    abbr: "USG%",
    name: "Usage Rate",
    formula:
      "(FGA + 0,44 × FTA + TOV) / (Poss. équipe quand joueur sur le terrain)",
    description:
      "Pourcentage des possessions de l'équipe utilisées par le joueur lorsqu'il est sur le terrain. Indique le rôle offensif dans le système.",
    source: "NBA Stats API",
    since: "2015-16",
  },
  {
    abbr: "PIE",
    name: "Player Impact Estimate",
    formula: "Métrique propriétaire NBA.com",
    description:
      "Indicateur propriétaire de nba.com estimant la contribution globale d'un joueur. Basé sur le rapport entre ses statistiques individuelles et celles totales du match. À ne pas confondre avec le PER (Player Efficiency Rating) de John Hollinger, qui utilise une formule différente non disponible via l'API officielle NBA.",
    source: "NBA Stats API",
    since: "2015-16",
  },
  {
    abbr: "ORtg",
    name: "Offensive Rating",
    formula:
      "Points marqués par l'équipe pour 100 possessions (joueur sur le terrain)",
    description:
      "Nombre de points que l'équipe marque pour 100 possessions lorsque le joueur est présent. Plus la valeur est élevée, plus le joueur est efficace offensivement. La moyenne NBA tourne autour de 110-115.",
    source: "NBA Stats API",
    since: "2015-16",
  },
  {
    abbr: "DRtg",
    name: "Defensive Rating",
    formula:
      "Points encaissés par l'équipe pour 100 possessions (joueur sur le terrain)",
    description:
      "Nombre de points que l'équipe encaisse pour 100 possessions lorsque le joueur est présent. Contrairement à ORtg, une valeur plus basse est meilleure.",
    source: "NBA Stats API",
    since: "2015-16",
  },
  {
    abbr: "NRtg",
    name: "Net Rating",
    formula: "ORtg − DRtg",
    description:
      "Différentiel entre le rating offensif et défensif. Résume l'impact net du joueur sur le score. Un NRtg positif indique que l'équipe performe mieux avec le joueur sur le terrain.",
    source: "NBA Stats API",
    since: "2015-16",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SourcesPage() {
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
          {SOURCES.map((s) => (
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
                    <span className="text-violet-500 mt-0.5 shrink-0">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Couverture */}
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white">
          Couverture des données
        </h2>
        <div className="rounded-xl border border-white/[0.06] bg-[#111114] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/30">
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                  Indicateurs
                </th>
                <th className="text-left px-4 py-3 font-medium">Période</th>
              </tr>
            </thead>
            <tbody>
              {COVERAGE.map((row, i) => (
                <tr
                  key={row.type}
                  className={`${i < COVERAGE.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                >
                  <td className="px-5 py-4 align-top">
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
                  <td className="px-4 py-4 align-top">
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
      <section className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-white">
          Glossaire des statistiques
        </h2>
        <div className="space-y-2">
          {STATS.map((s) => (
            <div
              key={s.abbr}
              className="rounded-xl border border-white/[0.06] bg-[#111114] px-5 py-4 grid grid-cols-[72px_1fr] gap-4 items-start"
            >
              <div>
                <div className="font-display font-bold text-violet-400 text-base">
                  {s.abbr}
                </div>
                {s.since && (
                  <div className="text-[10px] text-white/25 font-mono mt-0.5">
                    depuis {s.since}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="text-white/80 text-sm font-medium">
                  {s.name}
                </div>
                {s.formula && (
                  <div className="text-[11px] font-mono text-white/35 bg-white/[0.03] rounded px-2 py-1 inline-block">
                    {s.formula}
                  </div>
                )}
                <p className="text-xs text-white/50 leading-relaxed">
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>
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
