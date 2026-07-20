export const ANALYTICS_EVENTS = [
  "player_search",
  "filter_apply",
  "comparison",
  "share",
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
  if (!isAnalyticsEvent("share") || isAnalyticsEvent("page_view")) {
    errors.push("liste blanche des événements invalide");
  }
  if (sanitizeAnalyticsDimension("results_found") !== "results_found") {
    errors.push("dimension valide rejetée");
  }
  if (sanitizeAnalyticsDimension("Nikola Jokić") !== null) {
    errors.push("texte libre accepté comme dimension");
  }
  return errors;
}
