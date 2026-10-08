import { lastDailySync } from "@/lib/data-updates";
import { SidebarClient } from "./sidebar-client";

export async function Sidebar() {
  return <SidebarClient lastSync={await lastDailySync()} />;
}
