import { describe, expect, it } from "vitest";
import { DATA_ORIGINS, latestUpdate, playerStatsOrigin } from "@/lib/data-sources";

const DURING_2025_26 = new Date("2026-03-01T12:00:00Z");

describe("origine des stats joueurs", () => {
  it("saison en cours : moyennes recalculées, jamais présentées comme officielles", () => {
    const origin = playerStatsOrigin("2025-26", "pointsPerGame", DURING_2025_26);
    expect(origin).toBe("seasonStats");
    expect(DATA_ORIGINS[origin].kind).toBe("computed");
  });

  it("saison passée : chiffres officiels NBA", () => {
    expect(playerStatsOrigin("2023-24", "pointsPerGame", DURING_2025_26)).toBe("historicStats");
  });

  it("métriques de possession : import NBA, même pour la saison en cours", () => {
    expect(playerStatsOrigin("2025-26", "netRating", DURING_2025_26)).toBe("advancedStats");
  });
});

describe("dernière mise à jour", () => {
  const logs = [
    { source: "sync-daily", completedAt: new Date("2026-10-05T05:00:00Z") },
    { source: "sync-box-scores", completedAt: new Date("2026-10-06T08:32:00Z") },
    { source: "import-advanced", completedAt: new Date("2026-05-26T10:00:00Z") },
  ];

  it("retient le journal le plus récent parmi ceux de l'origine", () => {
    expect(latestUpdate(DATA_ORIGINS.games, logs)).toEqual(new Date("2026-10-06T08:32:00Z"));
  });

  it("ignore les journaux des autres origines", () => {
    expect(latestUpdate(DATA_ORIGINS.advancedStats, logs)).toEqual(new Date("2026-05-26T10:00:00Z"));
    expect(latestUpdate(DATA_ORIGINS.playoffs, logs)).toBeNull();
  });
});
