import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { DATA_ORIGINS, latestUpdate, type DataOriginKey } from "@/lib/data-sources";

/** Derniers imports réussis des journaux qui datent ces origines. */
export async function syncLogsFor(origins: readonly DataOriginKey[]) {
  const logSources = [...new Set(origins.flatMap((key) => DATA_ORIGINS[key].logSources))];
  const grouped = await prisma.syncLog.groupBy({
    by: ["source"],
    where: { source: { in: logSources }, status: { in: ["success", "partial"] } },
    _max: { completedAt: true },
  });
  return grouped.flatMap((log) =>
    log._max.completedAt ? [{ source: log.source, completedAt: log._max.completedAt }] : [],
  );
}

/** Mise à jour la plus ancienne parmi les origines d'un tableau : la date que l'export peut garantir. */
export async function tableUpdatedAt(origins: readonly DataOriginKey[]): Promise<string | null> {
  const logs = await syncLogsFor(origins);
  const dates = origins.map((key) => latestUpdate(DATA_ORIGINS[key], logs));
  if (dates.some((date) => date == null)) return null;
  const oldest = (dates as Date[]).reduce((left, right) => (left <= right ? left : right));
  return oldest.toISOString();
}

/** Dernière synchronisation quotidienne réussie ; partagée par la barre latérale et l'alerte de fraîcheur. */
export const lastDailySync = cache(async (): Promise<Date | null> => {
  const log = await prisma.syncLog.findFirst({
    where: { source: "sync-daily", status: { in: ["success", "partial"] } },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });
  return log?.completedAt ?? null;
});
