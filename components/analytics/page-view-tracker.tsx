"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isMeasureDisabled, sendAnalyticsEvent } from "@/components/analytics/analytics-event";
import {
  deviceClass,
  isNextPage,
  nextPageDimension,
  PAGE_TYPES,
  pageType,
  pageViewDimension,
  type PageType,
} from "@/lib/page-tracking";

const ENTRY_KEY = "hoopstats:entry";
const ENTRY_PATH_KEY = "hoopstats:entry-path";
const NEXT_KEY = "hoopstats:next";

/**
 * Page vue par type et appareil à chaque changement de chemin. La première
 * page de l'onglet est la page d'entrée ; la suivante n'est comptée qu'une
 * fois, avec le type de l'entrée (rechargement exclu). Les paramètres d'URL (saison, tri) et
 * les filtres d'une même liste ne comptent pas comme une nouvelle page.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    // La page interne de pilotage (PILOTAGE_PATH) ne compte pas dans l'audience.
    if (isMeasureDisabled() || pathname.startsWith("/fr/pilotage")) return;
    const type = pageType(pathname);
    sendAnalyticsEvent("page_view", pageViewDimension(type, deviceClass(window.innerWidth)));
    try {
      const stored = sessionStorage.getItem(ENTRY_KEY);
      const entry = stored && stored in PAGE_TYPES ? (stored as PageType) : null;
      if (!entry) {
        sessionStorage.setItem(ENTRY_KEY, type);
        sessionStorage.setItem(ENTRY_PATH_KEY, pathname);
        sendAnalyticsEvent("entry", type);
      } else if (
        !sessionStorage.getItem(NEXT_KEY) &&
        sessionStorage.getItem(ENTRY_PATH_KEY) !== pathname &&
        isNextPage(entry, type)
      ) {
        // Un rechargement de la page d'entrée ou un changement de saison n'est pas un parcours.
        sessionStorage.setItem(NEXT_KEY, "1");
        sendAnalyticsEvent("next_page", nextPageDimension(entry, type));
      }
    } catch {
      // Stockage de session bloqué : seule la page vue est comptée.
    }
  }, [pathname]);

  return null;
}
