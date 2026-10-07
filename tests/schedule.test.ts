import { describe, expect, it } from "vitest";
import {
  capitalizeFirst,
  checkScore,
  dayBounds,
  dayKeyOf,
  defaultDayKey,
  hasBlockingIssue,
  isDayKey,
  monthBounds,
  monthGrid,
  overtimeLabel,
  pickLeaders,
  shiftDay,
} from "@/lib/schedule";
import { isTeamParam, legacyMatchTabRedirect, queryRouteRewrite } from "@/lib/query-routes";

describe("journées NBA", () => {
  it("valide les dates d'adresse", () => {
    expect(isDayKey("2026-10-20")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("2026-1-05")).toBe(false);
    expect(isDayKey("1900-01-01")).toBe(false);
  });

  it("range un match de 1 h à Paris dans la journée de la veille à New York", () => {
    expect(dayKeyOf(new Date("2026-01-10T00:00:00Z"))).toBe("2026-01-09");
    expect(dayKeyOf(new Date("2026-01-09T01:00:00Z"))).toBe("2026-01-08");
  });

  it("bascule sur la nouvelle journée à midi à New York", () => {
    // 8 h à Paris le 7 octobre : on montre la nuit du 6 au 7.
    expect(defaultDayKey(new Date("2026-10-07T06:00:00Z"))).toBe("2026-10-06");
    // 19 h à Paris : la journée du 7 a commencé.
    expect(defaultDayKey(new Date("2026-10-07T17:00:00Z"))).toBe("2026-10-07");
  });

  it("calcule les bornes UTC avec le changement d'heure", () => {
    expect(dayBounds("2026-01-09").gte.toISOString()).toBe("2026-01-09T05:00:00.000Z");
    expect(dayBounds("2026-07-01").gte.toISOString()).toBe("2026-07-01T04:00:00.000Z");
    // Passage à l'heure d'été le 8 mars 2026 : la journée dure 23 h.
    const { gte, lt } = dayBounds("2026-03-08");
    expect((lt.getTime() - gte.getTime()) / 3_600_000).toBe(23);
    expect(gte.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    // Retour à l'heure d'hiver le 1er novembre 2026 : 25 h.
    const fall = dayBounds("2026-11-01");
    expect(fall.gte.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect((fall.lt.getTime() - fall.gte.getTime()) / 3_600_000).toBe(25);
  });

  it("décale les journées et borne les mois", () => {
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    const month = monthBounds("2026-02-14");
    expect(month.first).toBe("2026-02-01");
    expect(month.lt.toISOString()).toBe("2026-03-01T05:00:00.000Z");
  });

  it("construit une grille du lundi au dimanche", () => {
    const grid = monthGrid("2026-10-07");
    // Le 1er octobre 2026 est un jeudi.
    expect(grid[0]).toEqual([null, null, null, "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it("met seulement la première lettre en majuscule", () => {
    expect(capitalizeFirst("vendredi 9 janvier 2026")).toBe("Vendredi 9 janvier 2026");
  });
});

describe("prolongations", () => {
  it("nomme les prolongations au-delà de quatre périodes", () => {
    expect(overtimeLabel(4)).toBeNull();
    expect(overtimeLabel(null)).toBeNull();
    expect(overtimeLabel(5)).toBe("Prol.");
    expect(overtimeLabel(7)).toBe("3 prol.");
  });
});

describe("contrôle des scores", () => {
  const base = {
    status: "final",
    homeScore: 110,
    awayScore: 104,
    homeLinescores: [30, 25, 28, 27],
    awayLinescores: [26, 26, 26, 26],
    homePlayerPoints: 110,
    awayPlayerPoints: 104,
  };

  it("ne signale rien pour un match cohérent ou à venir", () => {
    expect(checkScore(base)).toEqual([]);
    expect(checkScore({ status: "scheduled", homeScore: null, awayScore: null })).toEqual([]);
  });

  it("bloque un score absent, une égalité ou des quarts-temps faux", () => {
    expect(checkScore({ ...base, homeScore: null })).toEqual(["missing_score"]);
    expect(checkScore({ ...base, awayScore: 110, awayLinescores: [30, 25, 28, 27], awayPlayerPoints: 110 })).toEqual(["tie"]);
    const wrong = checkScore({ ...base, homeScore: 112, homePlayerPoints: 112 });
    expect(wrong).toEqual(["linescore_mismatch"]);
    expect(hasBlockingIssue(wrong)).toBe(true);
    expect(checkScore({ ...base, homeLinescores: [30, 25, 28, 27, 0] })).toContain("linescore_length");
  });

  it("garde le score quand seul le box score joueurs est incomplet", () => {
    // Cas réel : ESPN liste un joueur sans identifiant à 0 pt, les Bulls ne totalisent que 82 pour 91 marqués.
    const issues = checkScore({ ...base, homePlayerPoints: 101 });
    expect(issues).toEqual(["player_points_mismatch"]);
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("accepte un match en prolongation", () => {
    expect(
      checkScore({ ...base, homeScore: 120, homeLinescores: [30, 25, 28, 21, 16], awayScore: 115, awayLinescores: [26, 26, 26, 26, 11], homePlayerPoints: 120, awayPlayerPoints: 115 }),
    ).toEqual([]);
  });
});

describe("meilleurs du match", () => {
  it("retient le meilleur de chaque catégorie, ex aequo compris", () => {
    const leaders = pickLeaders([
      { name: "A", slug: "a", pts: 30, reb: 5, ast: 8 },
      { name: "B", slug: null, pts: 22, reb: 11, ast: 8 },
      { name: "C", slug: "c", pts: null, reb: 2, ast: 0 },
    ]);
    expect(leaders.pts?.players.map((p) => p.name)).toEqual(["A"]);
    expect(leaders.reb).toMatchObject({ value: 11 });
    expect(leaders.ast?.players.map((p) => p.name)).toEqual(["A", "B"]);
  });

  it("n'invente pas de leader dans une catégorie vide", () => {
    expect(pickLeaders([{ name: "A", slug: null, pts: 0, reb: 0, ast: 0 }]).pts).toBeNull();
  });
});

describe("adresses de la page matchs", () => {
  const rewrite = (path: string) => queryRouteRewrite(new URL(`https://hoopstats.fr${path}`))?.pathname ?? null;

  it("sert la date et l'équipe depuis un segment mis en cache", () => {
    expect(rewrite("/fr/matchs?date=2026-10-20")).toBe("/fr/matchs/jour/2026-10-20");
    expect(rewrite("/fr/matchs?equipe=bos")).toBe("/fr/matchs/equipe/bos");
    expect(rewrite("/fr/matchs?date=2026-02-30")).toBeNull();
    expect(rewrite("/fr/matchs")).toBeNull();
    expect(isTeamParam("BOS")).toBe(false);
  });

  it("garde les saisons des autres pages", () => {
    expect(rewrite("/fr/equipes?saison=2024-25")).toBe("/fr/equipes/saison/2024-25");
  });

  it("renvoie les anciens onglets vers la journée voisine", () => {
    const now = new Date("2026-10-07T06:00:00Z");
    const target = (tab: string) => legacyMatchTabRedirect(new URL(`https://hoopstats.fr/fr/matchs?tab=${tab}`), now)?.search;
    expect(target("recents")).toBe("?date=2026-10-05");
    expect(target("a-venir")).toBe("?date=2026-10-07");
    expect(target("aujourd-hui")).toBe("");
    expect(legacyMatchTabRedirect(new URL("https://hoopstats.fr/fr/matchs"), now)).toBeNull();
  });
});
