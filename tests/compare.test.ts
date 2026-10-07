import { describe, expect, it } from "vitest";
import { closestSeason, resolveComparisonSeasons } from "@/lib/stats/compare";

const lebron = ["2019-20", "2020-21", "2021-22", "2022-23"];
const rookie = ["2021-22", "2022-23"];
const legend = ["1995-96", "1996-97"];

describe("resolveComparisonSeasons", () => {
  it("compare la dernière saison commune par défaut", () => {
    expect(resolveComparisonSeasons({ seasons1: lebron, seasons2: rookie, samePlayer: false })).toEqual({
      season1: "2022-23",
      season2: "2022-23",
      unavailable: [],
    });
  });

  it("garde la dernière saison de chacun sans recouvrement", () => {
    const result = resolveComparisonSeasons({ seasons1: lebron, seasons2: legend, samePlayer: false });
    expect([result.season1, result.season2]).toEqual(["2022-23", "1996-97"]);
  });

  it("aligne l'autre joueur sur la saison demandée", () => {
    const result = resolveComparisonSeasons({ seasons1: lebron, seasons2: rookie, requested1: "2021-22", samePlayer: false });
    expect([result.season1, result.season2]).toEqual(["2021-22", "2021-22"]);
  });

  it("prend la saison la plus proche quand l'alignement est impossible", () => {
    const result = resolveComparisonSeasons({ seasons1: lebron, seasons2: rookie, requested1: "2019-20", samePlayer: false });
    expect([result.season1, result.season2]).toEqual(["2019-20", "2021-22"]);
  });

  it("respecte deux saisons demandées différentes", () => {
    const result = resolveComparisonSeasons({
      seasons1: lebron,
      seasons2: rookie,
      requested1: "2019-20",
      requested2: "2022-23",
      samePlayer: false,
    });
    expect([result.season1, result.season2]).toEqual(["2019-20", "2022-23"]);
  });

  it("signale une saison demandée non jouée au lieu de la remplacer en silence", () => {
    const result = resolveComparisonSeasons({ seasons1: lebron, seasons2: rookie, requested2: "2019-20", samePlayer: false });
    expect(result.unavailable).toEqual([{ slot: "j2", season: "2019-20" }]);
    expect([result.season1, result.season2]).toEqual(["2022-23", "2022-23"]);
  });

  it("oppose deux saisons différentes d'un même joueur", () => {
    const base = { seasons1: lebron, seasons2: lebron, samePlayer: true };
    expect(resolveComparisonSeasons(base)).toMatchObject({ season1: "2021-22", season2: "2022-23" });
    expect(resolveComparisonSeasons({ ...base, requested1: "2019-20" })).toMatchObject({
      season1: "2019-20",
      season2: "2022-23",
    });
    expect(resolveComparisonSeasons({ ...base, requested2: "2022-23" })).toMatchObject({
      season1: "2021-22",
      season2: "2022-23",
    });
  });

  it("gère un joueur à une seule saison comparé à lui-même", () => {
    expect(resolveComparisonSeasons({ seasons1: ["2024-25"], seasons2: ["2024-25"], samePlayer: true })).toMatchObject({
      season1: "2024-25",
      season2: "2024-25",
    });
  });
});

describe("closestSeason", () => {
  it("préfère la plus récente à égale distance", () => {
    expect(closestSeason(["2018-19", "2020-21"], "2019-20")).toBe("2020-21");
    expect(closestSeason([], "2019-20")).toBeNull();
  });
});
