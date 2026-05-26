import { prisma } from "@/lib/prisma";
import { SidebarClient } from "./sidebar-client";

export async function Sidebar() {
  let lastSync: Date | null = null;
  try {
    const row = await prisma.syncLog.findFirst({
      where: { status: "success" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });
    lastSync = row?.completedAt ?? null;
  } catch {
    // DB unreachable (e.g. Neon paused) — sidebar still renders
  }

  return <SidebarClient lastSync={lastSync} />;
}
