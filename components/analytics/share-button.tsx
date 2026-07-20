"use client";

import { useState } from "react";
import { sendAnalyticsEvent } from "@/components/analytics/analytics-event";

export function ShareButton({ dimension }: { dimension: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href);
        sendAnalyticsEvent("share", dimension);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }}
      className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/45 transition hover:text-white"
    >
      {copied ? "Lien copié" : "Partager"}
    </button>
  );
}
