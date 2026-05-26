import { prisma } from "@/lib/prisma";
import { SidebarClient } from "./sidebar-client";

export async function Sidebar() {
  const lastSync = await prisma.syncLog.findFirst({
    where: { status: "success" },
    orderBy: { completedAt: "desc" },
    select: { completedAt: true },
  });

  return <SidebarClient lastSync={lastSync?.completedAt ?? null} />;
}
