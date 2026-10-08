"use client";

import { sendAnalyticsEvent } from "@/components/analytics/analytics-event";
import { toCsv, type CsvTable } from "@/lib/export";

type Props = {
  /** Tableau tel qu'affiché ; l'adresse est lue au clic pour garder filtres et tri. */
  table: Omit<CsvTable, "url">;
  filename: string;
  dimension: string;
};

/** Télécharge les lignes affichées en CSV, avec source et date de mise à jour. */
export function CsvExportButton({ table, filename, dimension }: Props) {
  function download() {
    const csv = toCsv({ ...table, url: window.location.href });
    const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
    sendAnalyticsEvent("export", dimension);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={table.rows.length === 0}
      title={`${table.rows.length} ligne${table.rows.length > 1 ? "s" : ""} affichée${table.rows.length > 1 ? "s" : ""}`}
      className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/45 transition hover:text-white disabled:opacity-40"
    >
      Exporter CSV
    </button>
  );
}
