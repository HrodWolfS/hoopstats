"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { isMeasureDisabled, sendAnalyticsEvent } from "@/components/analytics/analytics-event";
import { FRESHNESS_LIMIT_HOURS, isDataStale, pageType } from "@/lib/page-tracking";

const subscribeNothing = () => () => {};
const SEEN_KEY = "hoopstats:freshness-seen";

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/**
 * Le HTML est mis en cache (ISR) : le retard se calcule dans le navigateur,
 * une fois la page hydratée, avec l'heure réelle du visiteur.
 */
export function FreshnessWarning({ lastSync }: { lastSync: string | null }) {
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const stale = hydrated && isDataStale(lastSync ? new Date(lastSync) : null, new Date());

  useEffect(() => {
    if (!stale || isMeasureDisabled()) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      return;
    }
    sendAnalyticsEvent("freshness_warning", pageType(pathname));
  }, [stale, pathname]);

  if (!stale) return null;
  return (
    <div
      role="status"
      className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-xs leading-relaxed text-amber-200/90"
    >
      <span className="font-medium text-amber-200">Données en retard.</span>{" "}
      {lastSync
        ? `Dernière mise à jour le ${DATE_FORMAT.format(new Date(lastSync))}, il y a plus de ${FRESHNESS_LIMIT_HOURS} heures : les matchs récents peuvent manquer.`
        : "Date de dernière mise à jour inconnue : les matchs récents peuvent manquer."}{" "}
      <Link href="/fr/sources" className="underline underline-offset-2 hover:text-amber-100">
        Sources et méthode
      </Link>
    </div>
  );
}
