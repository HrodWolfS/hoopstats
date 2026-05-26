"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function IconTeams() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconPlayers() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function IconCompare() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 3v18M16 3v18M3 8h5M16 8h5M3 16h5M16 16h5" />
    </svg>
  );
}

function IconSeasons() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconPlayoffs() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IconRookie() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

function IconBestFive() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ─── Types & nav items ────────────────────────────────────────────────────────

export type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  disabled?: boolean;
};

export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Accueil", icon: <IconHome />, href: "/fr" },
  { id: "teams", label: "Équipes", icon: <IconTeams />, href: "/fr/equipes" },
  {
    id: "players",
    label: "Joueurs",
    icon: <IconPlayers />,
    href: "/fr/joueurs",
  },
  {
    id: "playoffs",
    label: "Playoffs",
    icon: <IconPlayoffs />,
    href: "/fr/playoffs",
  },
  {
    id: "seasons",
    label: "Saisons",
    icon: <IconSeasons />,
    href: "/fr/saisons",
  },
  {
    id: "compare",
    label: "Comparer",
    icon: <IconCompare />,
    href: "/fr/comparer",
  },
  {
    id: "rookies",
    label: "Rookies",
    icon: <IconRookie />,
    href: "/fr/rookies",
  },
  {
    id: "best-five",
    label: "Meilleurs 5",
    icon: <IconBestFive />,
    href: "/fr/meilleurs-5",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.id === "home") return pathname === "/fr" || pathname === "/fr/";
  if (item.id === "teams") return pathname.startsWith("/fr/equipes");
  if (item.id === "players") return pathname.startsWith("/fr/joueurs");
  return pathname.startsWith(item.href);
}

function formatSyncAge(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);

  if (diffMin < 2) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH < 24) return `il y a ${diffH}h`;
  if (diffD === 1) return "hier";
  return `il y a ${diffD}j`;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type Props = { lastSync: Date | null };

export function SidebarClient({ lastSync }: Props) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-[220px] border-r border-white/[0.06] bg-bg-base flex-col z-30">
      {/* Logo */}
      <div className="px-5 pt-6 pb-7">
        <Link href="/fr" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center font-display font-bold text-[12px] text-white">
            h.
          </div>
          <span className="font-display font-semibold tracking-tight text-[15px]">
            hoopstats
          </span>
        </Link>
      </div>

      {/* Nav — liste unique */}
      <nav className="px-3 space-y-0.5 flex-1">
        {ALL_NAV_ITEMS.map((item) => {
          const active = isItemActive(item, pathname);
          return item.disabled ? (
            <div
              key={item.id}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-white/30 cursor-not-allowed"
            >
              <span>{item.icon}</span>
              {item.label}
              <span className="ml-auto text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30">
                Bientôt
              </span>
            </div>
          ) : (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition ${
                active
                  ? "bg-white/[0.06] text-white"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span className={active ? "text-violet-400" : ""}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Pied — dernière mise à jour */}
      <div className="p-4 border-t border-white/[0.06]">
        <p className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-medium mb-2">
          Données NBA
        </p>
        {lastSync ? (
          <p className="text-[11px] text-white/40 leading-relaxed">
            Mis à jour{" "}
            <span className="text-white/70">{formatSyncAge(lastSync)}</span>
          </p>
        ) : (
          <p className="text-[11px] text-white/25">Synchronisation inconnue</p>
        )}
      </div>
    </aside>
  );
}
