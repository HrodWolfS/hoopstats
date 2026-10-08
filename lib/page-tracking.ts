/**
 * Instrumentation produit (roadmap 4.1) : pages vues par type, pages
 * d'entrée et page suivante, appareil, changements de saison, définitions
 * ouvertes, alertes de fraîcheur et erreurs. Le serveur ne reçoit que des
 * compteurs par jour : jamais l'adresse complète, un nom de joueur, une
 * saison choisie dans un texte libre ou un message d'erreur.
 */

import { sanitizeAnalyticsDimension } from "@/lib/analytics";

/** Types de page comptés ; tout autre chemin devient « autre ». */
export const PAGE_TYPES = {
  accueil: "Accueil",
  joueurs: "Liste des joueurs",
  joueur: "Fiche joueur",
  equipes: "Liste des équipes",
  equipe: "Fiche équipe",
  matchs: "Matchs du jour",
  match: "Fiche match",
  classements: "Classements",
  tendances: "Tendances",
  francais: "Français",
  rookies: "Rookies",
  comparer: "Comparer",
  saisons: "Saisons",
  playoffs: "Playoffs",
  draft: "Draft",
  trophees: "Trophées",
  "meilleurs-5": "Meilleurs cinq",
  guides: "Guides",
  guide: "Guide",
  sources: "Sources et méthode",
  demande: "Demande de statistique",
  legal: "Pages légales",
  autre: "Autre",
} as const;

export type PageType = keyof typeof PAGE_TYPES;

/** Sous-chemins qui restent des vues de liste, pas des fiches. */
const LIST_SUBPATHS: Record<string, string[]> = {
  matchs: ["jour", "equipe"],
  equipes: ["saison"],
  saisons: ["saison"],
  classements: [],
};

const DETAIL_TYPE: Partial<Record<string, PageType>> = {
  joueurs: "joueur",
  equipes: "equipe",
  matchs: "match",
  guides: "guide",
};

export function pageType(pathname: string): PageType {
  const segments = pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  if (segments[0] === "fr") segments.shift();
  const [section, sub] = segments;
  if (!section) return "accueil";
  if (section === "mentions-legales" || section === "politique-confidentialite") return "legal";
  if (section === "pilotage") return "autre";
  if (!(section in PAGE_TYPES)) return "autre";
  if (sub && !LIST_SUBPATHS[section]?.includes(sub)) {
    return DETAIL_TYPE[section] ?? (section as PageType);
  }
  return section as PageType;
}

export type Device = "mobile" | "desktop";

/** Même seuil que la mise en page : la barre latérale apparaît à 768 px. */
export function deviceClass(width: number): Device {
  return width < 768 ? "mobile" : "desktop";
}

export function pageViewDimension(type: PageType, device: Device): string {
  return `${type}_${device === "mobile" ? "m" : "d"}`;
}

export function parsePageViewDimension(dimension: string): { type: PageType; device: Device } | null {
  const match = /^([a-z0-9-]+)_(m|d)$/.exec(dimension);
  if (!match || !(match[1] in PAGE_TYPES)) return null;
  return { type: match[1] as PageType, device: match[2] === "m" ? "mobile" : "desktop" };
}

/**
 * Rester sur une vue de liste du même type (saison, catégorie, journée dans
 * le chemin) est un changement de filtre, pas une deuxième page. Une autre
 * fiche du même type (joueur → joueur) en est une.
 */
export function isNextPage(entry: PageType, next: PageType): boolean {
  return entry !== next || Object.values(DETAIL_TYPE).includes(next);
}

/** Première page de la session, puis page suivante : `classements__joueur`. */
export function nextPageDimension(entry: PageType, next: PageType): string {
  return `${entry}__${next}`;
}

/** Code de colonne en dimension : « TS% » → « tspct », « +/- » → « plusminus ». */
export function metricDimension(code: string): string | null {
  const value = code.toLowerCase().replaceAll("+/-", "plusminus").replaceAll("%", "pct").replace(/[^a-z0-9_-]/g, "");
  return /^[a-z0-9_-]{1,40}$/.test(value) ? value : null;
}

/** Erreur affichée : type de page et origine (`joueur_serveur`), jamais le message. */
export function errorDimension(pathname: string, fromServer: boolean): string {
  return `${pageType(pathname)}_${fromServer ? "serveur" : "navigateur"}`;
}

/** Saison au format AAAA-AA, le seul accepté dans la dimension. */
export function seasonChangeDimension(source: "barre" | "comparer", season: string): string | null {
  return /^\d{4}-\d{2}$/.test(season) ? `${source}-${season}` : null;
}

/**
 * La synchronisation quotidienne tourne chaque matin : au-delà de 36 heures
 * sans import réussi, les chiffres de la nuit peuvent manquer.
 */
export const FRESHNESS_LIMIT_HOURS = 36;

export function isDataStale(lastSync: Date | null, now: Date): boolean {
  if (!lastSync) return true;
  return now.getTime() - lastSync.getTime() > FRESHNESS_LIMIT_HOURS * 60 * 60 * 1000;
}

export type EventCount = { event: string; dimension: string; count: number };

const top = (map: Map<string, number>, limit: number) =>
  [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

const add = (map: Map<string, number>, key: string, count: number) => map.set(key, (map.get(key) ?? 0) + count);

/** Synthèse du pilotage : pages vues, appareils, entrées et parcours, aides, fraîcheur, erreurs. */
export function summarizeProductEvents(rows: EventCount[], limit = 8) {
  const views = new Map<string, number>();
  const entries = new Map<string, number>();
  const continued = new Map<string, number>();
  const nextPages = new Map<string, number>();
  const definitions = new Map<string, number>();
  const seasonSources = new Map<string, number>();
  const errors = new Map<string, number>();
  let mobile = 0;
  let desktop = 0;
  let freshness = 0;
  for (const { event, dimension, count } of rows) {
    if (event === "page_view") {
      const parsed = parsePageViewDimension(dimension);
      if (!parsed) continue;
      add(views, parsed.type, count);
      if (parsed.device === "mobile") mobile += count;
      else desktop += count;
    } else if (event === "entry" && dimension in PAGE_TYPES) {
      add(entries, dimension, count);
    } else if (event === "next_page") {
      const [from, to] = dimension.split("__");
      if (!(from in PAGE_TYPES) || !(to in PAGE_TYPES)) continue;
      add(continued, from, count);
      add(nextPages, `${from}__${to}`, count);
    } else if (event === "metric_definition") {
      add(definitions, dimension, count);
    } else if (event === "season_change") {
      add(seasonSources, dimension.split("-")[0], count);
    } else if (event === "freshness_warning") {
      freshness += count;
    } else if (event === "client_error") {
      add(errors, dimension, count);
    }
  }
  const pageViews = mobile + desktop;
  return {
    pageViews,
    mobileShare: pageViews ? Math.round((mobile / pageViews) * 100) : null,
    topPages: top(views, limit).map(([type, count]) => ({ type: type as PageType, count })),
    topEntries: top(entries, limit).map(([type, count]) => ({
      type: type as PageType,
      count,
      // Part des sessions entrées ici qui ont ouvert une deuxième page.
      continuedRate: count ? Math.min(100, Math.round(((continued.get(type) ?? 0) / count) * 100)) : null,
    })),
    topPaths: top(nextPages, limit).map(([key, count]) => {
      const [from, to] = key.split("__") as [PageType, PageType];
      return { from, to, count };
    }),
    topDefinitions: top(definitions, limit).map(([code, count]) => ({ code, count })),
    seasonChanges: { barre: seasonSources.get("barre") ?? 0, comparer: seasonSources.get("comparer") ?? 0 },
    freshnessWarnings: freshness,
    errors: top(errors, limit).map(([dimension, count]) => ({ dimension, count })),
    errorTotal: [...errors.values()].reduce((sum, value) => sum + value, 0),
  };
}

export function validatePageTracking(): string[] {
  const errors: string[] = [];
  const cases: [string, PageType][] = [
    ["/fr", "accueil"],
    ["/fr/joueurs", "joueurs"],
    ["/fr/joueurs/victor-wembanyama?saison=2025-26", "joueur"],
    ["/fr/equipes/saison", "equipes"],
    ["/fr/equipes/spurs", "equipe"],
    ["/fr/matchs/jour/2026-10-08", "matchs"],
    ["/fr/matchs/401585000", "match"],
    ["/fr/classements/2024-25", "classements"],
    ["/fr/politique-confidentialite", "legal"],
    ["/fr/pilotage", "autre"],
    ["/fr/inconnu/x", "autre"],
  ];
  for (const [path, expected] of cases) {
    const got = pageType(path);
    if (got !== expected) errors.push(`type de page ${path} : ${got} au lieu de ${expected}`);
  }
  if (deviceClass(390) !== "mobile" || deviceClass(768) !== "desktop") errors.push("seuil mobile/ordinateur faux");
  const dimension = pageViewDimension("meilleurs-5", "mobile");
  const parsed = parsePageViewDimension(dimension);
  if (parsed?.type !== "meilleurs-5" || parsed.device !== "mobile") errors.push("dimension page vue illisible");
  const types = Object.keys(PAGE_TYPES) as PageType[];
  const longest = types.flatMap((from) => types.map((to) => nextPageDimension(from, to)));
  if (longest.some((value) => sanitizeAnalyticsDimension(value) !== value)) {
    errors.push("dimension de parcours refusée par l'API");
  }
  if (types.some((type) => sanitizeAnalyticsDimension(pageViewDimension(type, "mobile")) === null)) {
    errors.push("dimension page vue refusée par l'API");
  }
  if (isNextPage("classements", "classements") || !isNextPage("joueur", "joueur") || !isNextPage("classements", "joueur")) {
    errors.push("changement de filtre compté comme page suivante");
  }
  if (parsePageViewDimension("inconnu_m") !== null) errors.push("type de page hors liste relu");
  if (metricDimension("TS%") !== "tspct" || metricDimension("+/-") !== "plusminus") errors.push("code de colonne mal converti");
  if (seasonChangeDimension("barre", "2024-25") !== "barre-2024-25" || seasonChangeDimension("barre", "x") !== null) {
    errors.push("dimension de saison mal contrôlée");
  }
  if (errorDimension("/fr/joueurs/x", true) !== "joueur_serveur") errors.push("dimension d'erreur fausse");
  const summary = summarizeProductEvents([
    { event: "page_view", dimension: "joueur_m", count: 3 },
    { event: "page_view", dimension: "accueil_d", count: 1 },
    { event: "page_view", dimension: "inconnu_m", count: 50 },
    { event: "entry", dimension: "accueil", count: 4 },
    { event: "next_page", dimension: "accueil__joueur", count: 1 },
    { event: "season_change", dimension: "barre-2024-25", count: 2 },
    { event: "client_error", dimension: "joueur_serveur", count: 1 },
  ]);
  if (
    summary.pageViews !== 4 ||
    summary.mobileShare !== 75 ||
    summary.topEntries[0]?.continuedRate !== 25 ||
    summary.seasonChanges.barre !== 2 ||
    summary.errorTotal !== 1
  ) {
    errors.push("synthèse du pilotage fausse");
  }
  const now = new Date("2026-10-08T12:00:00Z");
  if (isDataStale(new Date("2026-10-08T06:00:00Z"), now)) errors.push("données du matin jugées en retard");
  if (!isDataStale(new Date("2026-10-06T20:00:00Z"), now) || !isDataStale(null, now)) {
    errors.push("retard de synchronisation non détecté");
  }
  return errors;
}
