"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { columnDefinition } from "@/lib/stats/column-definitions";
import { sendAnalyticsEvent } from "@/components/analytics/analytics-event";
import { metricDimension } from "@/lib/page-tracking";

/**
 * Définitions accessibles depuis les en-têtes de colonnes. Un survol ne
 * marche pas au doigt : l'en-tête est un bouton, et la définition s'affiche
 * dans un panneau au-dessus du tableau, hors de la zone qui défile.
 */

type ColumnHelpState = {
  active: string | null;
  panelId: string;
  toggle: (code: string) => void;
};

const ColumnHelpContext = createContext<ColumnHelpState | null>(null);

export function ColumnHelpProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string | null>(null);
  const panelId = useId();
  return (
    <ColumnHelpContext.Provider
      value={{ active, panelId, toggle: (code) => setActive((current) => (current === code ? null : code)) }}
    >
      {children}
    </ColumnHelpContext.Provider>
  );
}

/** Libellé d'en-tête cliquable, ou texte simple faute de définition. */
export function ColumnHeader({ code }: { code: string }) {
  const help = useContext(ColumnHelpContext);
  const definition = columnDefinition(code);
  if (!help || !definition) return <>{code}</>;
  const open = help.active === code;
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={help.panelId}
      aria-label={`${code} : ${definition.label}, afficher la définition`}
      onClick={() => {
        const dimension = open ? null : metricDimension(code);
        if (dimension) sendAnalyticsEvent("metric_definition", dimension);
        help.toggle(code);
      }}
      className={`uppercase underline decoration-dotted underline-offset-4 transition ${open ? "text-white decoration-white/60" : "decoration-white/20 hover:text-white/75"}`}
    >
      {code}
    </button>
  );
}

export function ColumnHelpPanel() {
  const help = useContext(ColumnHelpContext);
  const definition = help?.active ? columnDefinition(help.active) : null;
  return (
    <div id={help?.panelId} aria-live="polite">
      {definition ? (
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs sm:px-5">
          <p className="leading-relaxed text-white/55">
            <span className="font-mono text-orange-300">{definition.code}</span>{" "}
            <span className="font-medium text-white/80">{definition.label}</span> · {definition.description}
            {definition.formula && <span className="mt-1 block font-mono text-[10px] text-white/30">{definition.formula}</span>}
          </p>
          <button
            type="button"
            onClick={() => help?.toggle(definition.code)}
            aria-label="Fermer la définition"
            className="shrink-0 rounded px-1.5 text-white/40 hover:text-white"
          >
            ✕
          </button>
        </div>
      ) : (
        <p className="border-b border-white/[0.06] px-4 py-2 text-[11px] text-white/30 sm:px-5">
          Touchez un en-tête souligné pour sa définition.
        </p>
      )}
    </div>
  );
}
