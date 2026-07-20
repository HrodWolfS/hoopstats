import { prisma } from "@/lib/prisma";
import { SidebarClient } from "./sidebar-client";

export async function Sidebar() {
  const lastSync = await prisma.syncLog.findFirst({
    where: {
      source: "sync-daily",
      status: { in: ["success", "partial"] },
    },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  return <SidebarClient lastSync={lastSync?.completedAt ?? null} />;
}
