/**
 * Activation (roadmap 4.1) : un onglet est « activé » la première fois que le
 * visiteur obtient une réponse — fiche ouverte, tableau de statistiques
 * affiché, résultat de recherche choisi ou outil utilisé. Le serveur reçoit
 * seulement le type de réponse et une tranche de temps depuis l'arrivée,
 * jamais l'heure exacte ni la page consultée.
 */

import { sanitizeAnalyticsDimension } from "@/lib/analytics";
import { pageType, type EventCount } from "@/lib/page-tracking";

export const ACTIVATION_KINDS = {
  fiche: "Fiche joueur, équipe ou match",
  tableau: "Classement, tendances, Français, rookies ou matchs du jour",
  recherche: "Résultat de recherche choisi",
  outil: "Comparaison complète, définition, partage ou export",
} as const;

export type ActivationKind = keyof typeof ACTIVATION_KINDS;

/** « direct » : la page d'arrivée était déjà la réponse (souvent un moteur de recherche). */
export const TIME_BUCKETS = {
  direct: "Dès la page d’arrivée",
  lt30: "Moins de 30 s",
  lt60: "30 s à 1 min",
  lt180: "1 à 3 min",
  gt180: "Plus de 3 min",
} as const;

export type TimeBucket = keyof typeof TIME_BUCKETS;

export function timeBucket(elapsedMs: number): Exclude<TimeBucket, "direct"> {
  const seconds = Math.max(0, elapsedMs) / 1000;
  if (seconds < 30) return "lt30";
  if (seconds < 60) return "lt60";
  if (seconds < 180) return "lt180";
  return "gt180";
}

/**
 * Page qui répond à une question. L'index des classements n'est qu'un menu :
 * seule une catégorie (/classements/2025-26/points) compte.
 */
export function pageAnswerKind(pathname: string): ActivationKind | null {
  const type = pageType(pathname);
  if (type === "joueur" || type === "equipe" || type === "match") return "fiche";
  if (type === "tendances" || type === "francais" || type === "rookies" || type === "matchs") return "tableau";
  if (type === "classements") {
    const segments = pathname.split(/[?#]/)[0].split("/").filter(Boolean);
    return segments.length >= 4 ? "tableau" : null;
  }
  return null;
}

/** Événement envoyé qui vaut réponse : recherche choisie, comparaison complète, outils. */
export function eventAnswerKind(event: string, dimension: string): ActivationKind | null {
  if (event === "global_search") return dimension === "selected" ? "recherche" : null;
  if (event === "comparison") return dimension === "complete" ? "outil" : null;
  if (event === "metric_definition" || event === "share" || event === "copy_link" || event === "export") return "outil";
  return null;
}

export function activationDimension(kind: ActivationKind, bucket: TimeBucket): string {
  return `${kind}_${bucket}`;
}

export function parseActivationDimension(dimension: string): { kind: ActivationKind; bucket: TimeBucket } | null {
  const [kind, bucket] = dimension.split("_");
  if (!(kind in ACTIVATION_KINDS) || !(bucket in TIME_BUCKETS)) return null;
  return { kind: kind as ActivationKind, bucket: bucket as TimeBucket };
}

/** Synthèse du pilotage : part des onglets activés et temps jusqu'à la réponse. */
export function summarizeActivation(rows: EventCount[]) {
  const kinds = new Map<ActivationKind, number>();
  const buckets = new Map<TimeBucket, number>();
  let sessions = 0;
  let activated = 0;
  for (const { event, dimension, count } of rows) {
    if (event === "entry") sessions += count;
    if (event !== "activation") continue;
    const parsed = parseActivationDimension(dimension);
    if (!parsed) continue;
    activated += count;
    kinds.set(parsed.kind, (kinds.get(parsed.kind) ?? 0) + count);
    buckets.set(parsed.bucket, (buckets.get(parsed.bucket) ?? 0) + count);
  }
  const direct = buckets.get("direct") ?? 0;
  const afterNavigation = activated - direct;
  const underMinute = (buckets.get("lt30") ?? 0) + (buckets.get("lt60") ?? 0);
  return {
    sessions,
    activated,
    // Un onglet peut avoir été ouvert le mois précédent : plafonné à 100 %.
    activationRate: sessions ? Math.min(100, Math.round((activated / sessions) * 100)) : null,
    direct,
    underMinuteRate: afterNavigation ? Math.round((underMinute / afterNavigation) * 100) : null,
    kinds: (Object.keys(ACTIVATION_KINDS) as ActivationKind[]).map((kind) => ({ kind, count: kinds.get(kind) ?? 0 })),
    buckets: (Object.keys(TIME_BUCKETS) as TimeBucket[]).map((bucket) => ({ bucket, count: buckets.get(bucket) ?? 0 })),
  };
}

export function validateActivation(): string[] {
  const errors: string[] = [];
  const pages: [string, ActivationKind | null][] = [
    ["/fr", null],
    ["/fr/joueurs", null],
    ["/fr/joueurs/victor-wembanyama", "fiche"],
    ["/fr/matchs/401585000", "fiche"],
    ["/fr/matchs/jour/2026-10-08", "tableau"],
    ["/fr/classements", null],
    ["/fr/classements/2025-26", null],
    ["/fr/classements/2025-26/points", "tableau"],
    ["/fr/tendances", "tableau"],
    ["/fr/comparer", null],
  ];
  for (const [path, expected] of pages) {
    if (pageAnswerKind(path) !== expected) errors.push(`réponse mal reconnue : ${path}`);
  }
  if (eventAnswerKind("global_search", "empty") !== null || eventAnswerKind("global_search", "selected") !== "recherche") {
    errors.push("recherche sans clic comptée comme réponse");
  }
  if (eventAnswerKind("comparison", "incomplete") !== null || eventAnswerKind("activation", "fiche_lt30") !== null) {
    errors.push("comparaison incomplète ou activation comptée comme réponse");
  }
  if (timeBucket(29_000) !== "lt30" || timeBucket(30_000) !== "lt60" || timeBucket(179_000) !== "lt180" || timeBucket(-5) !== "lt30") {
    errors.push("tranches de temps fausses");
  }
  for (const kind of Object.keys(ACTIVATION_KINDS) as ActivationKind[]) {
    for (const bucket of Object.keys(TIME_BUCKETS) as TimeBucket[]) {
      const dimension = activationDimension(kind, bucket);
      if (sanitizeAnalyticsDimension(dimension) !== dimension || parseActivationDimension(dimension)?.bucket !== bucket) {
        errors.push(`dimension d'activation illisible : ${dimension}`);
      }
    }
  }
  const summary = summarizeActivation([
    { event: "entry", dimension: "accueil", count: 10 },
    { event: "activation", dimension: "fiche_direct", count: 2 },
    { event: "activation", dimension: "tableau_lt30", count: 3 },
    { event: "activation", dimension: "recherche_lt180", count: 1 },
    { event: "activation", dimension: "inconnu_lt30", count: 40 },
  ]);
  if (summary.activated !== 6 || summary.activationRate !== 60 || summary.direct !== 2 || summary.underMinuteRate !== 75) {
    errors.push("synthèse d'activation fausse");
  }
  return errors;
}
