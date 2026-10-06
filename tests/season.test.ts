/**
 * Bascule de saison : la saison affichée par défaut, les saisons voisines et
 * les conversions vers le format ESPN.
 */

import { describe, expect, it } from "vitest";
import { monthsBetween } from "@/lib/espn-scoreboard";
import {
  currentSeason,
  draftYearOf,
  espnSeasonYear,
  previousSeason,
  ROLLOVER_LEAD_MS,
  SEASON_OPENERS,
} from "@/lib/nba";
import { isSeasonParam } from "@/lib/query-routes";
import { seasonAndPhaseFromEspn, seasonFromEspnYear } from "@/lib/season-phase";

describe("bascule de saison", () => {
  const rollover = Date.parse(SEASON_OPENERS["2026-27"]) - ROLLOVER_LEAD_MS;

  it("bascule trois heures avant le premier match, avant la synchro de 05:00 UTC", () => {
    expect(new Date(rollover).toISOString()).toBe("2026-10-20T04:00:00.000Z");
    expect(currentSeason(new Date(rollover - 60_000))).toBe("2025-26");
    expect(currentSeason(new Date(rollover))).toBe("2026-27");
  });

  it("garde la saison terminée pendant l'intersaison", () => {
    expect(currentSeason(new Date("2026-07-01T12:00:00Z"))).toBe("2025-26");
  });

  it("retombe sur la plus ancienne saison connue avant le calendrier", () => {
    expect(currentSeason(new Date("2020-01-01T00:00:00Z"))).toBe("2025-26");
  });
});

describe("saisons voisines et format ESPN", () => {
  it("passe le cap du siècle", () => {
    expect(previousSeason("2026-27")).toBe("2025-26");
    expect(previousSeason("2000-01")).toBe("1999-00");
  });

  it("convertit dans les deux sens", () => {
    expect(draftYearOf("2026-27")).toBe(2026);
    expect(espnSeasonYear("2026-27")).toBe(2027);
    expect(seasonFromEspnYear(2027)).toBe("2026-27");
    expect(seasonFromEspnYear(espnSeasonYear("1999-00"))).toBe("1999-00");
  });

  it("ignore un événement ESPN sans saison", () => {
    expect(seasonAndPhaseFromEspn({})).toBeNull();
    expect(seasonAndPhaseFromEspn({ season: { year: 2027, type: 3 } })).toEqual({
      season: "2026-27",
      phase: "playoffs",
    });
  });

  it("parcourt les mois des playoffs à cheval sur deux années", () => {
    expect(monthsBetween("202604", "202606")).toEqual(["202604", "202605", "202606"]);
    expect(monthsBetween("202611", "202702")).toEqual([
      "202611",
      "202612",
      "202701",
      "202702",
    ]);
  });

  it("n'accepte dans l'adresse qu'une saison bien formée", () => {
    expect(isSeasonParam("2026-27")).toBe(true);
    expect(isSeasonParam("2026-2027")).toBe(false);
    expect(isSeasonParam("2026")).toBe(false);
  });
});
