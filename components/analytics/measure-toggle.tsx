"use client";

import { useSyncExternalStore } from "react";
import { OPT_OUT_STORAGE_KEY, VISITS_STORAGE_KEY } from "@/lib/retention";

type Status = "loading" | "on" | "off" | "gpc";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStatus(): Status {
  if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return "gpc";
  try {
    return localStorage.getItem(OPT_OUT_STORAGE_KEY) === "1" ? "off" : "on";
  } catch {
    return "off";
  }
}

/** Réglage de la page Confidentialité : désactive la mesure dans ce navigateur. */
export function MeasureToggle() {
  const status = useSyncExternalStore(subscribe, readStatus, () => "loading" as Status);

  function toggle() {
    try {
      if (status === "on") {
        localStorage.setItem(OPT_OUT_STORAGE_KEY, "1");
        localStorage.removeItem(VISITS_STORAGE_KEY);
      } else {
        localStorage.removeItem(OPT_OUT_STORAGE_KEY);
      }
    } catch {
      // Stockage bloqué : rien n'est mesuré de toute façon.
    }
    for (const listener of listeners) listener();
  }

  if (status === "loading") return <p className="text-sm text-white/30">Lecture du réglage…</p>;
  if (status === "gpc") {
    return (
      <p className="text-sm text-white/50">
        Votre navigateur envoie le signal Global Privacy Control : aucune mesure n’est faite.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-white/50" aria-live="polite">
        {status === "on"
          ? "La mesure d’audience est active dans ce navigateur."
          : "La mesure d’audience est désactivée dans ce navigateur."}
      </p>
      <button
        type="button"
        onClick={toggle}
        className="shrink-0 rounded-lg border border-white/[0.1] px-3 py-2 text-sm text-white/70 transition-colors hover:border-orange-500/50 hover:text-white"
      >
        {status === "on" ? "Désactiver la mesure" : "Réactiver la mesure"}
      </button>
    </div>
  );
}
