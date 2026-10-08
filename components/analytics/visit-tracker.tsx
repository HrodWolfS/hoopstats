"use client";

import { useEffect } from "react";
import { isMeasureDisabled, sendAnalyticsEvent } from "@/components/analytics/analytics-event";
import { nextVisit, parseVisitState, utcDayKey, VISITS_STORAGE_KEY } from "@/lib/retention";

/** Compte la visite du jour une fois par chargement ; voir lib/retention.ts. */
export function VisitTracker() {
  useEffect(() => {
    if (isMeasureDisabled()) return;
    try {
      const { state, events } = nextVisit(
        parseVisitState(localStorage.getItem(VISITS_STORAGE_KEY)),
        utcDayKey(new Date()),
      );
      if (events.length === 0) return;
      localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(state));
      for (const { event, dimension } of events) sendAnalyticsEvent(event, dimension);
    } catch {
      // Stockage local bloqué (navigation privée stricte) : on ne mesure rien.
    }
  }, []);
  return null;
}
