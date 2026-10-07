import { describe, expect, it } from "vitest";
import {
  boundedEditDistance,
  buildSearchIndex,
  careerSpan,
  normalizeSearch,
  searchEntries,
  type SearchEntry,
} from "@/lib/search";

function player(label: string, weight: number, aliases: string[] = []): SearchEntry {
  return {
    result: { type: "player", slug: label.toLowerCase().replace(/\W+/g, "-"), label, sub: "", primaryColor: "#000", secondaryColor: "#fff" },
    names: [label],
    aliases,
    weight,
  };
}

function team(city: string, name: string, abbr: string, aliases: string[] = []): SearchEntry {
  return {
    result: { type: "team", slug: name.toLowerCase(), label: `${city} ${name}`, sub: abbr, primaryColor: "#000", secondaryColor: "#fff" },
    names: [`${city} ${name}`, name],
    aliases,
    codes: [abbr],
    weight: Number.MAX_SAFE_INTEGER,
  };
}

const index = buildSearchIndex([
  team("Boston", "Celtics", "BOS"),
  team("Los Angeles", "Lakers", "LAL", ["Les Lakers"]),
  team("Philadelphia", "76ers", "PHI", ["Sixers"]),
  player("Nikola Jokic", 800),
  player("Luka Dončić", 500),
  player("Shaquille O'Neal", 1207, ["Shaq"]),
  player("Kareem Abdul-Jabbar", 1560),
  player("LeBron James", 1560),
  player("James Harden", 1100),
  player("Mike James", 300),
  player("Victor Wembanyama", 150),
  player("Jimmy Butler III", 900, ["Jimmy Butler"]),
]);

const labels = (query: string, kind?: "all" | "player") =>
  searchEntries(index, query, { kind }).results.map((r) => r.label);

describe("normalizeSearch", () => {
  it("retire accents, casse, apostrophes et points", () => {
    expect(normalizeSearch("Dončić")).toBe("doncic");
    expect(normalizeSearch("O’Neal")).toBe("oneal");
    expect(normalizeSearch("J.R. Smith")).toBe("jr smith");
    expect(normalizeSearch("  Abdul-Jabbar ")).toBe("abdul jabbar");
  });
});

describe("searchEntries", () => {
  it("trouve un nom accentué ou non dans les deux sens", () => {
    expect(labels("doncic")[0]).toBe("Luka Dončić");
    expect(labels("jokić")[0]).toBe("Nikola Jokic");
  });

  it("ignore apostrophes et tirets", () => {
    expect(labels("oneal")[0]).toBe("Shaquille O'Neal");
    expect(labels("o'neal")[0]).toBe("Shaquille O'Neal");
    expect(labels("abdul jabbar")[0]).toBe("Kareem Abdul-Jabbar");
    expect(labels("abduljabbar")[0]).toBe("Kareem Abdul-Jabbar");
  });

  it("accepte le prénom, le nom, l'ordre inversé", () => {
    expect(labels("kareem")[0]).toBe("Kareem Abdul-Jabbar");
    expect(labels("james lebron")[0]).toBe("LeBron James");
    expect(labels("leb jam")[0]).toBe("LeBron James");
  });

  it("passe par les surnoms et indique l'alias utilisé", () => {
    const [first] = searchEntries(index, "shaq").results;
    expect(first.label).toBe("Shaquille O'Neal");
    expect(first.matchedAlias).toBe("Shaq");
    expect(labels("jimmy butler")[0]).toBe("Jimmy Butler III");
    expect(labels("sixers")[0]).toBe("Philadelphia 76ers");
  });

  it("trouve les équipes par nom, ville ou abréviation", () => {
    expect(labels("BOS")[0]).toBe("Boston Celtics");
    const [lakers] = searchEntries(index, "lakers").results;
    expect(lakers.label).toBe("Los Angeles Lakers");
    expect(lakers.matchedAlias).toBeUndefined();
    expect(labels("los angeles")[0]).toBe("Los Angeles Lakers");
  });

  it("classe le nom de famille puis la carrière la plus longue d'abord", () => {
    expect(labels("james")).toEqual(["LeBron James", "Mike James", "James Harden"]);
  });

  it("restreint aux joueurs pour le comparateur", () => {
    expect(labels("lakers", "player")).toEqual([]);
    expect(labels("bos", "player")).toEqual([]);
  });

  it("propose des orthographes proches faute de correspondance exacte", () => {
    const outcome = searchEntries(index, "wembanyamma");
    expect(outcome.approximate).toBe(true);
    expect(outcome.results[0].label).toBe("Victor Wembanyama");
    expect(searchEntries(index, "wemby").approximate).toBe(false);
  });

  it("ne renvoie rien sous deux caractères ni pour du bruit", () => {
    expect(labels("j")).toEqual([]);
    expect(labels("--")).toEqual([]);
    expect(searchEntries(index, "zzzzzz")).toEqual({ results: [], approximate: false });
  });
});

describe("boundedEditDistance", () => {
  it("borne la distance", () => {
    expect(boundedEditDistance("jokic", "jokic", 1)).toBe(0);
    expect(boundedEditDistance("jokik", "jokic", 1)).toBe(1);
    expect(boundedEditDistance("abcdef", "uvwxyz", 2)).toBe(3);
  });
});

describe("careerSpan", () => {
  it("donne les années de carrière", () => {
    expect(careerSpan("1984-85", "2002-03")).toBe("1984-2003");
    expect(careerSpan("2024-25", "2024-25")).toBe("2024-25");
  });
});
