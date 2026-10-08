/**
 * Mesure du retour des visiteurs sans cookie ni identifiant.
 *
 * Le navigateur garde seulement trois dates (première visite, dernière visite,
 * retours déjà comptés) dans le localStorage. Le serveur ne reçoit que des
 * compteurs agrégés par jour : `visit/new`, `visit/returning`, et
 * `return/j7-AAAAMMJJ` ou `return/j28-AAAAMMJJ` où la date est celle de la
 * première visite (la cohorte), jamais un identifiant.
 *
 * - J7 : revenu un autre jour, entre le 1er et le 7e jour après la première visite.
 * - J28 : revenu entre le 8e et le 28e jour après la première visite.
 * Chaque retour n'est compté qu'une fois par cohorte et par navigateur.
 */

export const VISITS_STORAGE_KEY = "hoopstats:visits";
export const OPT_OUT_STORAGE_KEY = "hoopstats:no-measure";
/** Au-delà de 13 mois, les dates sont oubliées et la visite repart à zéro. */
export const VISIT_STATE_LIFETIME_DAYS = 395;

export const J7_WINDOW = { from: 1, to: 7 } as const;
export const J28_WINDOW = { from: 8, to: 28 } as const;

export type VisitState = { first: string; last: string; j7?: true; j28?: true };
export type VisitEvent = { event: "visit" | "return"; dimension: string };

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Jour UTC au format AAAA-MM-JJ, comme la colonne `day` d'AnalyticsDaily. */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayTime(key: string): number {
  return Date.parse(`${key}T00:00:00Z`);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((dayTime(to) - dayTime(from)) / DAY_MS);
}

function isDayKey(value: unknown): value is string {
  return typeof value === "string" && DAY_KEY.test(value) && !Number.isNaN(dayTime(value));
}

export function parseVisitState(raw: string | null): VisitState | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!isDayKey(value.first) || !isDayKey(value.last)) return null;
    if (daysBetween(value.first, value.last) < 0) return null;
    return {
      first: value.first,
      last: value.last,
      ...(value.j7 === true ? { j7: true as const } : {}),
      ...(value.j28 === true ? { j28: true as const } : {}),
    };
  } catch {
    return null;
  }
}

/** Dimension de cohorte : `j7-20261008` pour une première visite le 8 octobre 2026. */
export function cohortDimension(kind: "j7" | "j28", first: string): string {
  return `${kind}-${first.replaceAll("-", "")}`;
}

/** Relit une dimension de retour ; renvoie la cohorte au format AAAA-MM-JJ. */
export function parseCohortDimension(dimension: string): { kind: "j7" | "j28"; first: string } | null {
  const match = /^(j7|j28)-(\d{4})(\d{2})(\d{2})$/.exec(dimension);
  if (!match) return null;
  const first = `${match[2]}-${match[3]}-${match[4]}`;
  return isDayKey(first) ? { kind: match[1] as "j7" | "j28", first } : null;
}

export function nextVisit(
  state: VisitState | null,
  today: string,
): { state: VisitState; events: VisitEvent[] } {
  if (!state || daysBetween(state.first, today) > VISIT_STATE_LIFETIME_DAYS) {
    return { state: { first: today, last: today }, events: [{ event: "visit", dimension: "new" }] };
  }
  // Même jour, ou horloge revenue en arrière : rien à compter.
  if (daysBetween(state.last, today) <= 0) return { state, events: [] };

  const next: VisitState = { ...state, last: today };
  const events: VisitEvent[] = [{ event: "visit", dimension: "returning" }];
  const sinceFirst = daysBetween(state.first, today);
  if (!state.j7 && sinceFirst >= J7_WINDOW.from && sinceFirst <= J7_WINDOW.to) {
    next.j7 = true;
    events.push({ event: "return", dimension: cohortDimension("j7", state.first) });
  }
  if (!state.j28 && sinceFirst >= J28_WINDOW.from && sinceFirst <= J28_WINDOW.to) {
    next.j28 = true;
    events.push({ event: "return", dimension: cohortDimension("j28", state.first) });
  }
  return { state: next, events };
}

export type RetentionRow = { day: Date; event: string; dimension: string; count: number };

/**
 * Taux de retour par cohortes complètes : une cohorte n'entre dans le calcul
 * qu'une fois sa fenêtre entièrement écoulée (J7 : 8 jours, J28 : 29 jours),
 * sur quatre semaines de cohortes.
 */
export function retentionRate(rows: RetentionRow[], kind: "j7" | "j28", today: string) {
  const window = kind === "j7" ? J7_WINDOW : J28_WINDOW;
  const newest = window.to + 1;
  const oldest = newest + 27;
  const inRange = (cohort: string) => {
    const age = daysBetween(cohort, today);
    return age >= newest && age <= oldest;
  };
  let cohort = 0;
  let returned = 0;
  for (const row of rows) {
    if (row.event === "visit" && row.dimension === "new" && inRange(utcDayKey(row.day))) {
      cohort += row.count;
    } else if (row.event === "return") {
      const parsed = parseCohortDimension(row.dimension);
      if (parsed?.kind === kind && inRange(parsed.first)) returned += row.count;
    }
  }
  return {
    cohort,
    returned,
    rate: cohort > 0 ? Math.round((returned / cohort) * 100) : null,
    from: addDays(today, -oldest),
    to: addDays(today, -newest),
  };
}

export function addDays(day: string, delta: number): string {
  return utcDayKey(new Date(dayTime(day) + delta * DAY_MS));
}

export function validateRetention(): string[] {
  const errors: string[] = [];
  const first = nextVisit(null, "2026-10-01");
  if (first.events.length !== 1 || first.events[0].dimension !== "new") {
    errors.push("première visite non comptée comme nouvelle");
  }
  if (nextVisit(first.state, "2026-10-01").events.length !== 0) {
    errors.push("deuxième visite le même jour comptée");
  }
  const day3 = nextVisit(first.state, "2026-10-04");
  if (!day3.events.some((e) => e.event === "return" && e.dimension === "j7-20261001")) {
    errors.push("retour au 3e jour absent de la cohorte J7");
  }
  if (nextVisit(day3.state, "2026-10-06").events.some((e) => e.event === "return")) {
    errors.push("retour J7 compté deux fois");
  }
  const day12 = nextVisit(day3.state, "2026-10-13");
  if (!day12.events.some((e) => e.dimension === "j28-20261001") || day12.events.some((e) => e.dimension.startsWith("j7"))) {
    errors.push("retour au 12e jour mal classé");
  }
  if (nextVisit(first.state, "2026-11-15").events.some((e) => e.event === "return")) {
    errors.push("retour après 28 jours compté");
  }
  if (nextVisit({ first: "2026-10-01", last: "2026-10-05" }, "2026-10-03").events.length !== 0) {
    errors.push("horloge en arrière comptée comme visite");
  }
  if (nextVisit({ first: "2025-01-01", last: "2025-01-02" }, "2026-10-01").events[0]?.dimension !== "new") {
    errors.push("dates de plus de 13 mois conservées");
  }
  if (parseVisitState('{"first":"2026-10-05","last":"2026-10-01"}') !== null || parseVisitState("pas du json") !== null) {
    errors.push("état local incohérent accepté");
  }
  const rate = retentionRate(
    [
      { day: new Date("2026-10-01T00:00:00Z"), event: "visit", dimension: "new", count: 8 },
      { day: new Date("2026-10-04T00:00:00Z"), event: "return", dimension: "j7-20261001", count: 2 },
      // Cohorte trop récente : fenêtre J7 pas encore close.
      { day: new Date("2026-10-08T00:00:00Z"), event: "visit", dimension: "new", count: 100 },
    ],
    "j7",
    "2026-10-10",
  );
  if (rate.cohort !== 8 || rate.returned !== 2 || rate.rate !== 25) {
    errors.push("taux J7 mal calculé sur les cohortes closes");
  }
  return errors;
}

/** Règles publiées sur /sources#mesure. */
export const MEASURE_RULES = [
  {
    title: "Ce qui est compté",
    rule: "Des compteurs par jour (UTC) : recherches, filtres, comparaisons, partages, exports, nouvelles visites et visites de retour. Ni cookie, ni identifiant, ni adresse IP, ni terme recherché.",
  },
  {
    title: "Pages et parcours",
    rule: "Chaque page vue est comptée par type (fiche joueur, classements, matchs…) et par format d’écran : mobile sous 768 px de large, ordinateur au-delà. La première page d’un onglet est comptée comme page d’entrée, puis la deuxième page ouverte, une seule fois. Jamais l’adresse complète ni le joueur consulté.",
  },
  {
    title: "Aide, saisons, fraîcheur et erreurs",
    rule: "Sont aussi comptés : l’ouverture d’une définition de colonne (par code, comme TS%), le changement de saison (barre du haut ou comparateur, avec la saison choisie), l’affichage de l’alerte « données en retard » (plus de 36 heures sans mise à jour réussie) et l’affichage d’une page d’erreur, par type de page et origine (serveur ou navigateur), sans message ni détail technique.",
  },
  {
    title: "Activation et temps de réponse",
    rule: "Un onglet est « activé » la première fois qu’il obtient une réponse : fiche joueur, équipe ou match, tableau de statistiques (catégorie de classement, tendances, Français, rookies, matchs du jour), résultat de recherche choisi, comparaison complète, définition ouverte, partage ou export. Une seule fois par onglet, avec le type de réponse et une tranche de temps depuis l’arrivée : dès la page d’arrivée, moins de 30 s, 30 s à 1 min, 1 à 3 min, plus de 3 min. L’heure d’arrivée reste dans l’onglet.",
  },
  {
    title: "Retour à 7 jours (J7)",
    rule: "Part des nouveaux visiteurs d’un jour revenus un autre jour dans les 7 jours suivants. Calculé sur les cohortes de quatre semaines dont la fenêtre est close (première visite il y a 8 à 35 jours). Objectif : 25 % ou plus.",
  },
  {
    title: "Retour à 28 jours (J28)",
    rule: "Part des nouveaux visiteurs revenus entre le 8e et le 28e jour après leur première visite, sur les cohortes dont la première visite date de 29 à 56 jours.",
  },
  {
    title: "Ce que garde votre navigateur",
    rule: "Le jour de la première et de la dernière visite et les retours déjà comptés, dans le stockage local, oubliés après 13 mois. Un navigateur vidé ou un autre appareil compte comme un nouveau visiteur : les taux sont donc des minimums.",
  },
  {
    title: "Refuser la mesure",
    rule: "Le signal Global Privacy Control coupe toute mesure. Le réglage de la page Confidentialité la coupe aussi et efface les dates stockées.",
  },
  {
    title: "Demandes de statistiques",
    rule: "Le formulaire « Quelle statistique cherchez-vous ? » garde une catégorie, un texte facultatif de 280 caractères au plus, la page d’origine et la date, effacés après 12 mois. Il ne demande ni nom ni e-mail.",
  },
] as const;
