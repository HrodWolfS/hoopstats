"use client";

import { useState } from "react";
import { sendAnalyticsEvent } from "@/components/analytics/analytics-event";

type Status = "idle" | "copied" | "failed";

const LABEL: Record<Status, string> = {
  idle: "Partager",
  copied: "Lien copié",
  failed: "Copie impossible",
};

/** Feuille de partage du téléphone si elle existe, sinon copie du lien. */
function prefersNativeShare(): boolean {
  return typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Partage l'adresse courante, filtres et tri compris : les vues gardent leur
 * état dans l'URL, le lien rouvre donc exactement ce que l'on voit.
 */
export function ShareButton({ dimension, title }: { dimension: string; title?: string }) {
  const [status, setStatus] = useState<Status>("idle");

  function flash(next: Status) {
    setStatus(next);
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  async function share() {
    const url = window.location.href;
    if (prefersNativeShare()) {
      try {
        await navigator.share({ title: title ?? document.title, url });
        sendAnalyticsEvent("share", dimension);
        return;
      } catch (error) {
        // Feuille fermée sans partager : rien à compter ni à copier.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      sendAnalyticsEvent("copy_link", dimension);
      flash("copied");
    } catch {
      flash("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-live="polite"
      className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/45 transition hover:text-white"
    >
      {LABEL[status]}
    </button>
  );
}
