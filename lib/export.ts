import { DATA_ORIGINS, type DataOriginKey } from "@/lib/data-sources";

/**
 * Export CSV des tableaux.
 *
 * Seuls les tableaux que hoopstats calcule lui-même s'exportent : une stat
 * officielle NBA ou un box score importé tel quel n'est pas à nous de le
 * redistribuer. L'export reprend les lignes affichées, dans l'ordre affiché,
 * précédées de la source et de la date de mise à jour.
 */

export const EXPORT_ATTRIBUTION = "Données ESPN, calculs hoopstats";

/** Un tableau s'exporte seulement si toutes ses données sont calculées par hoopstats. */
export function isExportable(origins: readonly DataOriginKey[]): boolean {
  return origins.length > 0 && origins.every((key) => DATA_ORIGINS[key].kind === "computed");
}

export type CsvCell = string | number | null | undefined;

export type CsvTable = {
  title: string;
  /** Adresse de la vue exportée, filtres et tri compris. */
  url: string;
  /** Dernière mise à jour des données, ISO. */
  updatedAt: string | null;
  headers: string[];
  rows: CsvCell[][];
};

const SEPARATOR = ";";

const UPDATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/** Cellule CSV : point-virgule (Excel français), guillemets doublés si besoin. */
export function csvCell(value: CsvCell): string {
  if (value == null) return "";
  const text = typeof value === "number" ? String(value).replace(".", ",") : value;
  return /[";\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function formatUpdate(updatedAt: string | null): string {
  return updatedAt ? `${UPDATE_FORMAT.format(new Date(updatedAt))} (heure de Paris)` : "inconnue";
}

/** Fichier complet : en-tête de provenance, ligne vide, puis le tableau. BOM pour les accents dans Excel. */
export function toCsv(table: CsvTable): string {
  const lines = [
    [table.title],
    ["Source", EXPORT_ATTRIBUTION],
    ["Mise à jour", formatUpdate(table.updatedAt)],
    ["Adresse", table.url],
    [],
    table.headers,
    ...table.rows,
  ];
  return `﻿${lines.map((line) => line.map(csvCell).join(SEPARATOR)).join("\r\n")}\r\n`;
}

/** Nom de fichier sans accent ni espace : « hoopstats-tendances-2026-27-10-matchs.csv ». */
export function csvFilename(parts: readonly (string | number)[]): string {
  const slug = ["hoopstats", ...parts]
    .map((part) =>
      String(part)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter(Boolean)
    .join("-");
  return `${slug}.csv`;
}

// ── Règles publiques ─────────────────────────────────────────────────────────

export const SHARE_RULES: { title: string; rule: string }[] = [
  {
    title: "Liens",
    rule: "Les filtres, tris, fenêtres et saisons choisis restent dans l'adresse de la page. Le bouton « Partager » copie cette adresse, ou ouvre la feuille de partage du téléphone : le lien rouvre la même vue.",
  },
  {
    title: "Cartes sociales",
    rule: "Les classements, les tendances et les fiches match ont une image de partage : la valeur, son contexte (saison, statistique, fenêtre), la date des données et la marque hoopstats. Une fiche match n'affiche le score que s'il passe le contrôle de cohérence.",
  },
  {
    title: "Tableaux exportables",
    rule: "Seuls les tableaux que hoopstats calcule lui-même à partir des box scores ESPN s'exportent en CSV : tendances, classements de la saison en cours, tableaux de saison des Français et des rookies de la saison en cours. Les statistiques officielles NBA des saisons passées, les stats avancées importées et les box scores ne s'exportent pas.",
  },
  {
    title: "Contenu d'un export",
    rule: `Les lignes affichées, dans l'ordre affiché, avec les valeurs arrondies comme à l'écran. Le fichier commence par le titre de la vue, la source (« ${EXPORT_ATTRIBUTION} »), la date de la dernière mise à jour et l'adresse de la vue. Séparateur point-virgule et virgule décimale, pour Excel en français.`,
  },
  {
    title: "Mesure",
    rule: "Les partages, liens copiés et exports sont comptés par jour et par page, sans identifiant ni cookie, comme les autres mesures d'usage.",
  },
];
