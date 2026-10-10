import { describe, expect, it } from "vitest";
import { csvCell, csvFilename, EXPORT_ATTRIBUTION, isExportable, toCsv } from "@/lib/export";
import { isAnalyticsEvent, isAnalyticsRecorded, validateAnalyticsPayload } from "@/lib/analytics";
import { playerStatsOrigin } from "@/lib/data-sources";

describe("export CSV", () => {
  it("n'exporte que les tableaux calculés par hoopstats", () => {
    expect(isExportable(["trends"])).toBe(true);
    expect(isExportable(["seasonStats"])).toBe(true);
    expect(isExportable(["historicStats"])).toBe(false);
    expect(isExportable(["advancedStats"])).toBe(false);
    expect(isExportable(["games"])).toBe(false);
    expect(isExportable(["seasonStats", "advancedStats"])).toBe(false);
    expect(isExportable([])).toBe(false);
  });

  it("suit l'origine des classements : saison en cours oui, saison passée et stats avancées non", () => {
    const now = new Date("2026-12-01T12:00:00Z");
    expect(isExportable([playerStatsOrigin("2026-27", "pointsPerGame", now)])).toBe(true);
    expect(isExportable([playerStatsOrigin("2025-26", "pointsPerGame", now)])).toBe(false);
    expect(isExportable([playerStatsOrigin("2026-27", "usageRate", now)])).toBe(false);
  });

  it("échappe les cellules pour Excel en français", () => {
    expect(csvCell("Nikola Jokić")).toBe("Nikola Jokić");
    expect(csvCell("TOT; 2 équipes")).toBe('"TOT; 2 équipes"');
    expect(csvCell('Le "Joker"')).toBe('"Le ""Joker"""');
    expect(csvCell(25.4)).toBe("25,4");
    expect(csvCell(null)).toBe("");
  });

  it("place source, date et adresse avant le tableau", () => {
    const csv = toCsv({
      title: "Tendances NBA 2026-27",
      url: "https://hoopstats.fr/fr/tendances?fenetre=5",
      updatedAt: "2026-10-08T07:30:00Z",
      headers: ["Rang", "Joueur", "PTS"],
      rows: [[1, "Victor Wembanyama", "31,2"]],
    });
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines).toEqual([
      "Tendances NBA 2026-27",
      `Source;${EXPORT_ATTRIBUTION}`,
      "Mise à jour;8 octobre 2026 à 09:30 (heure de Paris)",
      "Adresse;https://hoopstats.fr/fr/tendances?fenetre=5",
      "",
      "Rang;Joueur;PTS",
      "1;Victor Wembanyama;31,2",
    ]);
  });

  it("dit quand la date de mise à jour est inconnue", () => {
    const csv = toCsv({ title: "T", url: "u", updatedAt: null, headers: [], rows: [] });
    expect(csv).toContain("Mise à jour;inconnue");
  });

  it("nomme le fichier sans accent ni espace", () => {
    expect(csvFilename(["Français", "2026-27"])).toBe("hoopstats-francais-2026-27.csv");
    expect(csvFilename(["tendances", "2026-27", "10-matchs", "ts", "baisse"])).toBe(
      "hoopstats-tendances-2026-27-10-matchs-ts-baisse.csv",
    );
  });
});

describe("mesure du partage", () => {
  it("accepte copie de lien et export", () => {
    expect(isAnalyticsEvent("copy_link")).toBe(true);
    expect(isAnalyticsEvent("export")).toBe(true);
    expect(validateAnalyticsPayload()).toEqual([]);
  });
});

describe("enregistrement de l'audience", () => {
  it("n'écrit que depuis le déploiement de production", () => {
    expect(isAnalyticsRecorded("hoopstats-kappa.vercel.app", "production")).toBe(true);
    expect(isAnalyticsRecorded("hoopstats.fr", "production")).toBe(true);
    expect(isAnalyticsRecorded("hoopstats-git-x.vercel.app", "preview")).toBe(false);
    expect(isAnalyticsRecorded("hoopstats.fr", undefined)).toBe(false);
  });

  it("n'écrit jamais depuis un serveur local, même avec les variables de production", () => {
    expect(isAnalyticsRecorded("localhost:3000", "production")).toBe(false);
    expect(isAnalyticsRecorded("127.0.0.1:3123", "production")).toBe(false);
    expect(isAnalyticsRecorded("[::1]:3000", "production")).toBe(false);
    expect(isAnalyticsRecorded("hoopstats.localhost", "production")).toBe(false);
  });
});
