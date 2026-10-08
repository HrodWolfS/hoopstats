export const ANALYTICS_EVENTS = [
  "player_search",
  "global_search",
  "filter_apply",
  "comparison",
  "share",
  "copy_link",
  "export",
  // Mesure du retour (lib/retention.ts) : nouveaux, revenus, cohortes J7/J28.
  "visit",
  "return",
  // Instrumentation produit (lib/page-tracking.ts).
  "page_view",
  "entry",
  "next_page",
  "season_change",
  "metric_definition",
  "freshness_warning",
  "client_error",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEvent(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && ANALYTICS_EVENTS.includes(value as AnalyticsEventName);
}

export function sanitizeAnalyticsDimension(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(normalized) ? normalized : null;
}

export function validateAnalyticsPayload(): string[] {
  const errors: string[] = [];
  if (
    !isAnalyticsEvent("share") ||
    !isAnalyticsEvent("copy_link") ||
    !isAnalyticsEvent("export") ||
    !isAnalyticsEvent("visit") ||
    !isAnalyticsEvent("return") ||
    !isAnalyticsEvent("page_view") ||
    !isAnalyticsEvent("client_error") ||
    isAnalyticsEvent("page_url")
  ) {
    errors.push("liste blanche des événements invalide");
  }
  if (sanitizeAnalyticsDimension("results_found") !== "results_found") {
    errors.push("dimension valide rejetée");
  }
  if (sanitizeAnalyticsDimension("Nikola Jokić") !== null) {
    errors.push("texte libre accepté comme dimension");
  }
  if (sanitizeAnalyticsDimension("j28-20261008") !== "j28-20261008") {
    errors.push("dimension de cohorte rejetée");
  }
  return errors;
}
