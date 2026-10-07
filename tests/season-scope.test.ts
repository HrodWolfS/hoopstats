/**
 * Sélecteur de saison de l'en-tête et adresses qui gardent la saison : la
 * page déclare son périmètre, le sélecteur n'invente jamais une saison.
 */

import { describe, expect, it } from "vitest";
import { seasonsThrough } from "@/lib/nba";
import { legacySeasonRedirect, queryRouteRewrite } from "@/lib/query-routes";
import { neighbourSeasons, pageHasSeason, seasonScopeHref, type SeasonScope } from "@/lib/season-scope";
import { playerSeasonHref, teamSeasonHref } from "@/lib/team-links";
import { frDecimal, pct, stat, winPct } from "@/lib/format";

const scope: SeasonScope = {
  seasons: ["2025-26", "2024-25", "2023-24"],
  season: "2024-25",
  defaultSeason: "2025-26",
};

describe("périmètre de saison", () => {
  it("masque le sélecteur sur les pages sans saison", () => {
    expect(pageHasSeason("/fr")).toBe(false);
    expect(pageHasSeason("/fr/matchs")).toBe(false);
    expect(pageHasSeason("/fr/matchs/401")).toBe(false);
    expect(pageHasSeason("/fr/comparer")).toBe(false);
    expect(pageHasSeason("/fr/guides/true-shooting")).toBe(false);
    expect(pageHasSeason("/fr/equipes/celtics")).toBe(true);
    expect(pageHasSeason("/fr/trophees")).toBe(true);
    // « /fr/matchsX » n'est pas la page des matchs.
    expect(pageHasSeason("/fr/matchsx")).toBe(true);
  });

  it("garde les autres paramètres et l'adresse nue pour la saison par défaut", () => {
    expect(seasonScopeHref(scope, "/fr/joueurs", "?stat=points&saison=2024-25", "2023-24")).toBe(
      "/fr/joueurs?stat=points&saison=2023-24",
    );
    expect(seasonScopeHref(scope, "/fr/joueurs", "?stat=points&saison=2024-25", "2025-26")).toBe(
      "/fr/joueurs?stat=points",
    );
    expect(seasonScopeHref(scope, "/fr/equipes/celtics", "", "2025-26")).toBe("/fr/equipes/celtics");
  });

  it("navigue par chemin quand la page en donne le modèle", () => {
    const leaders = { ...scope, pathTemplate: "/fr/classements/{saison}/rebonds" };
    expect(seasonScopeHref(leaders, "/fr/classements/2024-25/rebonds", "", "2023-24")).toBe(
      "/fr/classements/2023-24/rebonds",
    );
  });

  it("donne les saisons voisines, null en bout de liste", () => {
    expect(neighbourSeasons(scope)).toEqual({ older: "2023-24", newer: "2025-26" });
    expect(neighbourSeasons({ ...scope, season: "2025-26" })).toEqual({ older: "2024-25", newer: null });
    expect(neighbourSeasons({ ...scope, season: "2023-24" })).toEqual({ older: null, newer: "2024-25" });
    expect(neighbourSeasons({ ...scope, season: "1999-00" })).toEqual({ older: null, newer: null });
  });

  it("n'offre pas une saison pas encore commencée", () => {
    expect(seasonsThrough("2025-26", ["2026-27", "2025-26", "2024-25"])).toEqual(["2025-26", "2024-25"]);
  });
});

describe("liens qui gardent la saison", () => {
  it("adresse nue pour la saison en cours, ?saison= sinon", () => {
    expect(playerSeasonHref("fr", "luka-doncic", "2025-26", "2025-26")).toBe("/fr/joueurs/luka-doncic");
    expect(playerSeasonHref("fr", "luka-doncic", "2018-19", "2025-26")).toBe(
      "/fr/joueurs/luka-doncic?saison=2018-19",
    );
    expect(teamSeasonHref("fr", "celtics", "2015-16", "2025-26")).toBe("/fr/equipes/celtics?saison=2015-16");
  });
});

describe("trophées : ?season= devient ?saison=", () => {
  it("renvoie l'ancien paramètre vers le nouveau", () => {
    const target = legacySeasonRedirect(new URL("https://hoopstats.fr/fr/trophees?season=2018-19"));
    expect(target?.pathname).toBe("/fr/trophees");
    expect(target?.search).toBe("?saison=2018-19");
    expect(legacySeasonRedirect(new URL("https://hoopstats.fr/fr/trophees?saison=2018-19"))).toBeNull();
    expect(legacySeasonRedirect(new URL("https://hoopstats.fr/fr/equipes?season=2018-19"))).toBeNull();
  });

  it("sert ?saison= depuis la variante en cache", () => {
    const rewrite = queryRouteRewrite(new URL("https://hoopstats.fr/fr/trophees?saison=2018-19"));
    expect(rewrite?.pathname).toBe("/fr/trophees/saison/2018-19");
    expect(queryRouteRewrite(new URL("https://hoopstats.fr/fr/trophees?season=2018-19"))).toBeNull();
  });
});

describe("décimale à la française", () => {
  it("remplace le point par une virgule", () => {
    expect(frDecimal("32.7")).toBe("32,7");
    expect(frDecimal("58.4 %")).toBe("58,4 %");
    expect(frDecimal("—")).toBe("—");
  });

  it("stat, pct et winPct affichent la virgule", () => {
    expect(stat(19.6)).toBe("19,6");
    expect(stat(-3.25, 2)).toBe("-3,25");
    expect(stat(null)).toBe("—");
    expect(pct(0.584)).toBe("58,4");
    expect(winPct(41, 41)).toBe("50,0");
    expect(winPct(0, 0)).toBe("0,0");
  });
});
