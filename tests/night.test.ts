/**
 * Accueil « La nuit NBA en chiffres » : règles de sélection.
 */

import { describe, expect, it } from "vitest";
import {
  activeStreaks,
  gameScore,
  longestWinStreaks,
  nightKey,
  nightLabel,
  pickBigGame,
  pickProgression,
  pickStreak,
  statLine,
  topPerformances,
  weightedAverage,
  type BoxLine,
} from "@/lib/stats/night";

const line = (over: Partial<BoxLine> = {}): BoxLine => ({
  pts: 0, reb: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0,
  fgm: 0, fga: 0, ftm: 0, fta: 0, minutes: "30", didNotPlay: false, ...over,
});

describe("nuit", () => {
  it("range un match de 21 h à New York dans sa journée NBA", () => {
    // 01:00 UTC le 7 = 21:00 le 6 à New York.
    expect(nightKey(new Date("2026-10-07T01:00:00Z"))).toBe("2026-10-06");
    expect(nightLabel("2026-10-06")).toBe("nuit du 6 au 7 octobre");
    expect(nightLabel("2026-10-31")).toBe("nuit du 31 octobre au 1 novembre");
  });
});

describe("Game Score", () => {
  it("applique la formule de Hollinger", () => {
    // 30 + 4,8 − 14 − 0,8 + 1,4 + 2,1 + 2 + 5,6 + 0,7 − 1,2 − 3 = 27,6
    const score = gameScore(line({ pts: 30, fgm: 12, fga: 20, ftm: 4, fta: 6, oreb: 2, dreb: 7, stl: 2, ast: 8, blk: 1, pf: 3, tov: 3 }));
    expect(score).toBeCloseTo(27.6, 5);
  });

  it("classe, garde un match par joueur et écarte les DNP", () => {
    const lines = [
      { ...line({ pts: 20 }), playerKey: "a", playerName: "A" },
      { ...line({ pts: 40 }), playerKey: "b", playerName: "B", didNotPlay: true },
      { ...line({ pts: 25 }), playerKey: "c", playerName: "C" },
      { ...line({ pts: 22 }), playerKey: "c", playerName: "C" },
    ];
    expect(topPerformances(lines, 3).map((l) => l.playerKey)).toEqual(["c", "a"]);
  });

  it("résume la ligne de stats", () => {
    expect(statLine(line({ pts: 31, reb: 12, ast: 4, blk: 3 }))).toBe("31 pts, 12 reb, 3 ctr");
  });
});

describe("séries", () => {
  const g = (day: number, home: string, away: string, hs: number, as: number) => ({
    gameDate: new Date(Date.UTC(2026, 0, day)), homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as,
  });
  const games = [g(1, "A", "B", 100, 90), g(2, "A", "C", 100, 90), g(3, "B", "A", 100, 90), g(4, "A", "C", 100, 90)];

  it("calcule la série en cours et la plus longue", () => {
    const active = activeStreaks(games);
    expect(active.find((s) => s.teamId === "A")).toMatchObject({ kind: "W", length: 1 });
    expect(active.find((s) => s.teamId === "C")).toMatchObject({ kind: "L", length: 2 });
    expect(longestWinStreaks(games).find((s) => s.teamId === "A")?.length).toBe(2);
  });

  it("préfère les victoires à longueur égale et compte les ex aequo", () => {
    const picked = pickStreak(activeStreaks(games), 2);
    expect(picked?.streak).toMatchObject({ teamId: "C", kind: "L" });
    expect(pickStreak(activeStreaks(games), 3)).toBeNull();
  });
});

describe("progression et affiche", () => {
  it("pondère les passages en équipe par les matchs joués", () => {
    expect(weightedAverage([{ value: 10, games: 30 }, { value: 20, games: 10 }])).toEqual({ value: 12.5, games: 40 });
  });

  it("garde la plus forte hausse, rien sans progression", () => {
    expect(pickProgression([{ playerKey: "a", before: 10, after: 15 }, { playerKey: "b", before: 8, after: 20 }])?.playerKey).toBe("b");
    expect(pickProgression([{ playerKey: "a", before: 10, after: 9 }])).toBeNull();
  });

  it("choisit le meilleur bilan cumulé", () => {
    const at = new Date("2026-10-09T00:00:00Z");
    const games = [
      { id: "x", gameDate: at, homeRate: 0.7, awayRate: 0.6 },
      { id: "y", gameDate: at, homeRate: 0.4, awayRate: null },
    ];
    expect(pickBigGame(games)?.id).toBe("x");
  });
});
