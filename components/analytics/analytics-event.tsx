"use client";

import { useEffect } from "react";
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

export function sendAnalyticsEvent(event: AnalyticsEventName, dimension: string) {
  if (isMeasureDisabled()) return;
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
    const key = `hoopstats:event:${dedupeKey}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    sendAnalyticsEvent(event, dimension);
  }, [dedupeKey, dimension, event]);
  return null;
}
