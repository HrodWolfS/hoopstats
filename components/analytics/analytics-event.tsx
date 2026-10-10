"use client";

import { useEffect } from "react";
import { activationDimension, eventAnswerKind, timeBucket, type ActivationKind } from "@/lib/activation";
import type { AnalyticsEventName } from "@/lib/analytics";
import { OPT_OUT_STORAGE_KEY } from "@/lib/retention";

/** Refus de mesure : réglage du site ou signal Global Privacy Control du navigateur. */
export function isMeasureDisabled(): boolean {
  if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return true;
  try {
    return localStorage.getItem(OPT_OUT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export const SESSION_START_KEY = "hoopstats:start";
const ACTIVATED_KEY = "hoopstats:activated";

/**
 * Première réponse obtenue dans l'onglet, comptée une fois avec une tranche
 * de temps depuis l'arrivée. `direct` : la page d'arrivée était la réponse.
 */
export function markActivation(kind: ActivationKind, direct = false) {
  if (isMeasureDisabled()) return;
  try {
    if (sessionStorage.getItem(ACTIVATED_KEY)) return;
    sessionStorage.setItem(ACTIVATED_KEY, "1");
    // Sans heure d'arrivée, l'action a lieu avant que la page d'entrée soit comptée.
    const start = Number(sessionStorage.getItem(SESSION_START_KEY));
    const bucket = direct ? "direct" : start ? timeBucket(Date.now() - start) : "lt30";
    sendAnalyticsEvent("activation", activationDimension(kind, bucket));
  } catch {
    // Stockage de session bloqué : pas d'activation mesurable.
  }
}

export function sendAnalyticsEvent(event: AnalyticsEventName, dimension: string) {
  if (isMeasureDisabled()) return;
  const answer = eventAnswerKind(event, dimension);
  if (answer) markActivation(answer);
  const body = JSON.stringify({ event, dimension });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}

export function AnalyticsEvent({
  event,
  dimension,
  dedupeKey,
}: {
  event: AnalyticsEventName;
  dimension: string;
  dedupeKey: string;
}) {
  useEffect(() => {
    // Mesure refusée : rien n'est écrit dans le navigateur non plus.
    if (isMeasureDisabled()) return;
    const key = `hoopstats:event:${dedupeKey}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Stockage de session bloqué : l'événement n'est pas dédoublonné.
    }
    sendAnalyticsEvent(event, dimension);
  }, [dedupeKey, dimension, event]);
  return null;
}
