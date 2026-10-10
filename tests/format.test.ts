import { describe, expect, it } from "vitest";
import { count, pct, signed, stat, winPct } from "@/lib/format";
import { csvCell } from "@/lib/export";

// Règle d'arrondi commune (DECISIONS.md, 013).
describe("règle d'arrondi", () => {
  it("moyennes : 1 décimale, virgule, tiret si absente", () => {
    expect(stat(25.44)).toBe("25,4");
    expect(stat(25.46)).toBe("25,5");
    expect(stat(7)).toBe("7,0");
    expect(stat(null)).toBe("—");
    expect(stat(undefined)).toBe("—");
  });

  it("vrai signe moins, et pas de « -0,0 »", () => {
    expect(stat(-3.24)).toBe("−3,2");
    expect(stat(-0.04)).toBe("0,0");
    expect(stat(-0.4, 0)).toBe("0");
  });

  it("pourcentages : sur 100, 1 décimale", () => {
    expect(pct(0.5844)).toBe("58,4");
    expect(pct(1)).toBe("100,0");
    expect(pct(null)).toBe("—");
  });

  it("totaux : entiers, milliers séparés", () => {
    expect(count(1234.4)).toBe((1234).toLocaleString("fr-FR"));
    expect(count(12)).toBe("12");
    expect(count(null)).toBe("—");
  });

  it("écarts : signe explicite, zéro sans signe", () => {
    expect(signed(3.24)).toBe("+3,2");
    expect(signed(-1)).toBe("−1,0");
    expect(signed(0.04)).toBe("0,0");
    expect(signed(-0.04)).toBe("0,0");
    expect(signed(null)).toBe("—");
  });

  it("pourcentage de victoires", () => {
    expect(winPct(41, 41)).toBe("50,0");
    expect(winPct(0, 0)).toBe("0,0");
  });

  it("l'export garde un nombre lisible par le tableur", () => {
    expect(csvCell(stat(-3.24))).toBe("-3,2");
    expect(csvCell(signed(-1))).toBe("-1,0");
    expect(csvCell(signed(2))).toBe("+2,0");
  });
});
