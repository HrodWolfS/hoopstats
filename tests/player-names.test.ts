import { describe, expect, it } from "vitest";
import { SOURCE_NAME_ALIASES, sourcePlayerSlug } from "@/lib/player-names";

describe("sourcePlayerSlug", () => {
  it("suit la table des surnoms et suffixes", () => {
    expect(sourcePlayerSlug("Alex Sarr")).toBe("alexandre-sarr");
    expect(sourcePlayerSlug("Nic Claxton")).toBe("nicolas-claxton");
    expect(sourcePlayerSlug("Kevin Knox II")).toBe("kevin-knox");
    expect(sourcePlayerSlug("  Bub Carrington ")).toBe("carlton-carrington");
  });

  it("construit le slug habituel hors de la table", () => {
    expect(sourcePlayerSlug("LeBron James")).toBe("lebron-james");
    expect(sourcePlayerSlug("Jimmy Butler III")).toBe("jimmy-butler-iii");
  });

  it("n'a que des slugs bien formés", () => {
    for (const slug of Object.values(SOURCE_NAME_ALIASES)) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
