/**
 * Tendances récentes : fenêtres, échantillon minimal, tri.
 */

import { describe, expect, it } from "vitest";
import {
  computeTrends,
  parseTrendDirection,
  parseTrendSort,
  parseTrendWindow,
  sortTrends,
  trendDelta,
  type TrendLine,
} from "@/lib/stats/trends";

const LAST = new Date("2026-04-12T23:00:00Z");

/** `count` matchs joués, le plus récent la veille de `LAST`, un par jour. */
function games(playerId: string, count: number, line: Partial<TrendLine> = {}, offsetDays = 1): TrendLine[] {
  return Array.from({ length: count }, (_, i) => ({
    playerId,
    gameDate: new Date(LAST.getTime() - (offsetDays + i) * 86_400_000),
    teamAbbr: "BOS",
    starter: true,
    didNotPlay: false,
    minutes: "30",
    pts: 20,
    fga: 15,
    fta: 5,
    ...line,
  }));
}

describe("computeTrends", () => {
  it("compare les N derniers matchs joués à toute la saison", () => {
    const lines = [...games("a", 5, { pts: 30 }), ...games("a", 15, { pts: 10 }, 6)];
    const [trend] = computeTrends(lines, 5, LAST);
    expect(trend.recent.pts).toBe(30);
    expect(trend.season.pts).toBe(15);
    expect(trend.season.games).toBe(20);
    expect(trendDelta(trend, "pts")).toBe(15);
  });

  it("ignore les matchs non joués dans la fenêtre comme dans la saison", () => {
    const dnp = games("a", 3, { didNotPlay: true, minutes: null, pts: null });
    const zero = games("a", 2, { minutes: "0:00", pts: 0 }, 4);
    const played = games("a", 10, { pts: 12 }, 6);
    const [trend] = computeTrends([...dnp, ...zero, ...played], 5, LAST);
    expect(trend.season.games).toBe(10);
    expect(trend.recent.pts).toBe(12);
  });

  it("exige deux fois la fenêtre en matchs joués", () => {
    expect(computeTrends(games("a", 19), 10, LAST)).toHaveLength(0);
    expect(computeTrends(games("a", 20), 10, LAST)).toHaveLength(1);
  });

  it("écarte les fins de banc et les joueurs absents depuis longtemps", () => {
    expect(computeTrends(games("a", 20, { minutes: "10" }), 5, LAST)).toHaveLength(0);
    // 14 minutes sur la saison mais 20 sur la fenêtre : changement de rôle, gardé.
    const role = [...games("b", 5, { minutes: "20" }), ...games("b", 15, { minutes: "12" }, 6)];
    expect(computeTrends(role, 5, LAST)).toHaveLength(1);
    expect(computeTrends(games("c", 20, {}, 20), 5, LAST)).toHaveLength(0);
  });

  it("ne juge pas l'efficacité sous le seuil de volume", () => {
    const [trend] = computeTrends(games("a", 10, { pts: 4, fga: 3, fta: 0 }), 5, LAST);
    expect(trend.recent.ts).toBeNull();
    const [shooter] = computeTrends(games("b", 10, { pts: 22, fga: 15, fta: 5 }), 5, LAST);
    expect(shooter.recent.ts).toBeCloseTo(22 / (2 * 17.2), 6);
  });

  it("signale un transfert et garde l'équipe du dernier match", () => {
    const lines = [...games("a", 5, { teamAbbr: "ATL" }), ...games("a", 10, { teamAbbr: "MIN" }, 6)];
    const [trend] = computeTrends(lines, 5, LAST);
    expect(trend.teamAbbr).toBe("ATL");
    expect(trend.multiTeam).toBe(true);
  });
});

describe("sortTrends", () => {
  const up = { ...computeTrends([...games("up", 5, { pts: 30 }), ...games("up", 5, { pts: 10 }, 6)], 5, LAST)[0], name: "Up" };
  const down = { ...computeTrends([...games("down", 5, { pts: 5 }), ...games("down", 5, { pts: 25 }, 6)], 5, LAST)[0], name: "Down" };

  it("met la plus forte hausse ou baisse en tête", () => {
    expect(sortTrends([down, up], "pts", "hausse").map((t) => t.name)).toEqual(["Up", "Down"]);
    expect(sortTrends([up, down], "pts", "baisse").map((t) => t.name)).toEqual(["Down", "Up"]);
  });

  it("écarte les écarts inconnus", () => {
    const noTs = { ...up, recent: { ...up.recent, ts: null } };
    expect(sortTrends([noTs, down], "ts", "hausse").map((t) => t.name)).toEqual(["Down"]);
  });
});

describe("paramètres d'URL", () => {
  it("retombe sur les valeurs par défaut", () => {
    expect(parseTrendWindow("20")).toBe(20);
    expect(parseTrendWindow("7")).toBe(10);
    expect(parseTrendWindow(null)).toBe(10);
    expect(parseTrendSort("ts")).toBe("ts");
    expect(parseTrendSort("x")).toBe("pts");
    expect(parseTrendDirection("baisse")).toBe("baisse");
    expect(parseTrendDirection(null)).toBe("hausse");
  });
});
