"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ALL_NAV_ITEMS, isItemActive } from "./sidebar-client";

// Les 5 items visibles en bas + un bouton "Plus"
const PRIMARY_IDS = ["home", "teams", "players", "playoffs", "seasons"];

const PRIMARY_ITEMS = ALL_NAV_ITEMS.filter((i) => PRIMARY_IDS.includes(i.id));
const MORE_ITEMS = ALL_NAV_ITEMS.filter((i) => !PRIMARY_IDS.includes(i.id));

function IconMore() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// Icônes en taille 20 pour la bottom nav
function NavIcon({ id, active }: { id: string; active: boolean }) {
  const cls = active ? "text-violet-400" : "text-white/40";
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    className: cls,
  };

  switch (id) {
    case "home":
      return (
        <svg {...props}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );
    case "teams":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "players":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "playoffs":
      return (
        <svg {...props}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
    case "seasons":
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "compare":
      return (
        <svg {...props}>
          <path d="M8 3v18M16 3v18M3 8h5M16 8h5M3 16h5M16 16h5" />
        </svg>
      );
    case "rookies":
      return (
        <svg {...props}>
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
        </svg>
      );
    case "best-five":
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    default:
      return null;
  }
}

export function MobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const anyMoreActive = MORE_ITEMS.some((i) => isItemActive(i, pathname));

  return (
    <>
      {/* Overlay drawer "Plus" */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="absolute bottom-[57px] left-0 right-0 bg-[#111114] border-t border-white/[0.08] rounded-t-2xl px-4 py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-8 h-0.5 bg-white/20 rounded-full mx-auto mb-5" />
            <p className="text-[10px] text-white/30 uppercase tracking-[0.18em] font-medium mb-3 px-1">
              Autres pages
            </p>
            <div className="space-y-1">
              {MORE_ITEMS.map((item) => {
                const active = isItemActive(item, pathname);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition ${
                      active
                        ? "bg-white/[0.06] text-white"
                        : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <span className={active ? "text-violet-400" : ""}>
                      <NavIcon id={item.id} active={active} />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-white/[0.06] bg-bg-base/90 backdrop-blur-xl">
        <div className="flex items-stretch h-[57px] px-1">
          {PRIMARY_ITEMS.map((item) => {
            const active = isItemActive(item, pathname);
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors"
              >
                <NavIcon id={item.id} active={active} />
                <span
                  className={`text-[9px] font-medium tracking-wide uppercase transition-colors ${
                    active ? "text-violet-300" : "text-white/30"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Bouton Plus */}
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors"
          >
            {drawerOpen ? (
              <span className="text-violet-400">
                <IconClose />
              </span>
            ) : (
              <span
                className={anyMoreActive ? "text-violet-400" : "text-white/40"}
              >
                <IconMore />
              </span>
            )}
            <span
              className={`text-[9px] font-medium tracking-wide uppercase transition-colors ${
                drawerOpen || anyMoreActive
                  ? "text-violet-300"
                  : "text-white/30"
              }`}
            >
              Plus
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
