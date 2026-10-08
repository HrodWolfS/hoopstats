import { lastDailySync } from "@/lib/data-updates";
import { FreshnessWarning } from "@/components/layout/freshness-warning";

/** Alerte affichée sur toutes les pages quand la synchronisation quotidienne a du retard. */
export async function FreshnessBanner() {
  const lastSync = await lastDailySync();
  return <FreshnessWarning lastSync={lastSync?.toISOString() ?? null} />;
}
