import { describe, expect, it } from "vitest";
import {
  MERGED_PLAYER_SLUGS,
  mergedPlayerRedirect,
  SOURCE_NAME_ALIASES,
  sourcePlayerSlug,
  titleNamesPlayer,
} from "@/lib/player-names";

describe("titleNamesPlayer", () => {
  it("accepte le joueur, à l'accent, au suffixe et à la précision près", () => {
    expect(titleNamesPlayer("Luka Dončić", "Luka", "Doncic")).toBe(true);
    expect(titleNamesPlayer("Tyler Kolek (basketball)", "Tyler", "Kolek")).toBe(true);
    expect(titleNamesPlayer("Jimmy Butler", "Jimmy", "Butler III")).toBe(true);
    expect(titleNamesPlayer("P. J. Tucker", "P.J.", "Tucker")).toBe(true);
  });

  it("refuse un homonyme de nom de famille ou une page qui n'est pas le joueur", () => {
    expect(titleNamesPlayer("Ron Harper Jr.", "Dylan", "Harper")).toBe(false);
    expect(titleNamesPlayer("Vince Carter", "Carter", "Bryant")).toBe(false);
    expect(titleNamesPlayer("2023 NBA Finals", "Jamal", "Cain")).toBe(false);
    expect(titleNamesPlayer("List of oldest and youngest NBA players", "Miles", "Kelly")).toBe(false);
    expect(titleNamesPlayer("Anything", "", "")).toBe(false);
  });

  it("préfère pas de photo à une translittération devinée", () => {
    expect(titleNamesPlayer("Jakob Pöltl", "Jakob", "Poeltl")).toBe(false);
  });
});

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

describe("mergedPlayerRedirect", () => {
  it("renvoie l'ancienne fiche vers la fiche conservée, sous-chemin et paramètres compris", () => {
    const target = mergedPlayerRedirect(new URL("https://hoopstats.fr/fr/joueurs/jimmy-butler/saison/2019-20?x=1"));
    expect(target?.pathname).toBe("/fr/joueurs/jimmy-butler-iii/saison/2019-20");
    expect(target?.search).toBe("?x=1");
  });

  it("laisse passer les autres fiches", () => {
    expect(mergedPlayerRedirect(new URL("https://hoopstats.fr/fr/joueurs/jimmy-butler-iii"))).toBeNull();
    expect(mergedPlayerRedirect(new URL("https://hoopstats.fr/fr/joueurs/jameer-nelson-jr"))).toBeNull();
  });

  it("ne renvoie jamais vers une fiche elle-même redirigée", () => {
    for (const target of Object.values(MERGED_PLAYER_SLUGS)) {
      expect(MERGED_PLAYER_SLUGS[target]).toBeUndefined();
    }
  });
});
