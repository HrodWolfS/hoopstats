/**
 * Règle « Français » : une seule définition pour l'accueil et le hub.
 */

import { describe, expect, it } from "vitest";
import { FRENCH_ADDITIONS, FRENCH_PLAYER_WHERE, FRENCH_RULES, isFrench } from "@/lib/french";

describe("qui compte comme Français", () => {
  it("retient la fiche NBA.com France", () => {
    expect(isFrench({ slug: "victor-wembanyama", country: "France" })).toBe(true);
    expect(isFrench({ slug: "luka-doncic", country: "Slovenia" })).toBe(false);
    expect(isFrench({ slug: "inconnu", country: null })).toBe(false);
  });

  it("ajoute les internationaux français que NBA.com classe ailleurs", () => {
    expect(isFrench({ slug: "joakim-noah", country: "USA" })).toBe(true);
    expect(isFrench({ slug: "yakhouba-diawara", country: "USA" })).toBe(true);
  });

  it("le filtre Prisma couvre les mêmes joueurs", () => {
    const slugs = FRENCH_PLAYER_WHERE.OR[1].slug?.in ?? [];
    expect(FRENCH_PLAYER_WHERE.OR[0].country).toBe("France");
    expect([...slugs].sort()).toEqual(FRENCH_ADDITIONS.map((addition) => addition.slug).sort());
  });

  it("chaque ajout est sourcé et publié", () => {
    const published = FRENCH_RULES.map((rule) => rule.rule).join(" ");
    for (const addition of FRENCH_ADDITIONS) {
      expect(addition.reason).toMatch(/équipe de France/);
      expect(published).toContain(addition.name);
    }
  });
});
