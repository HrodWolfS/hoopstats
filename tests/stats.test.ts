/**
 * Cas de test minimaux de la feuille de route (§ 0.3), sur les fonctions de
 * calcul qu'utilisent les pages : chaque cas reproduit une erreur qui
 * fausserait un chiffre affiché.
 */

import { describe, expect, it } from "vitest";
import { periodLabel } from "@/lib/game-status";
import { seriesWinnerTeamId, seriesWinsRequired } from "@/lib/playoff-series";
import { gamePhaseFromEspn, REGULAR_SEASON_PHASE } from "@/lib/season-phase";
import { computeCareerAverages, type SeasonStint } from "@/lib/stats/career";
import { calculateMetricContext } from "@/lib/stats/context";
import { competitionRanks, scaledMinimumGames } from "@/lib/stats/leaders";
import {
  deriveSeasonFromBoxScores,
  parseMinutes,
  type BoxScoreLine,
} from "@/lib/stats/season-aggregation";
import {
  consolidatePlayerSeasons,
  MULTI_TEAM_ABBR,
} from "@/lib/stats/season-consolidation";

function stint(
  season: string,
  teamAbbr: string,
  gamesPlayed: number,
  pointsPerGame: number,
): SeasonStint {
  return {
    season,
    teamAbbr,
    gamesPlayed,
    pointsPerGame,
    minutesPerGame: 30,
    reboundsPerGame: 5,
    assistsPerGame: 3,
    stealsPerGame: 1,
    blocksPerGame: 0.5,
    fgPct: 0.5,
    threePtPct: 0.35,
    ftPct: 0.8,
  };
}

type Row = {
  playerId: string;
  teamAbbr: string;
  gamesPlayed: number;
  pointsPerGame: number;
  fgPct: number | null;
  winShares: number | null;
  per: number | null;
};

function row(partial: Partial<Row> & Pick<Row, "teamAbbr" | "gamesPlayed">): Row {
  return {
    playerId: "p1",
    pointsPerGame: 10,
    fgPct: 0.5,
    winShares: 1,
    per: 15,
    ...partial,
  };
}

function boxLine(partial: Partial<BoxScoreLine>): BoxScoreLine {
  return {
    minutes: "30",
    pts: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    fgm: 0,
    fga: 0,
    threePm: 0,
    threePa: 0,
    ftm: 0,
    fta: 0,
    ...partial,
  };
}

describe("joueur resté dans une seule équipe", () => {
  it("garde sa ligne telle quelle", () => {
    const [season] = consolidatePlayerSeasons([
      row({ teamAbbr: "SAS", gamesPlayed: 70, pointsPerGame: 24.3 }),
    ]);
    expect(season.isMultiTeam).toBe(false);
    expect(season.teamAbbr).toBe("SAS");
    expect(season.pointsPerGame).toBe(24.3);
    expect(season.fgPct).toBe(0.5);
    expect(season.per).toBe(15);
  });
});

describe("joueur transféré une fois", () => {
  const [season] = consolidatePlayerSeasons([
    row({ teamAbbr: "LAC", gamesPlayed: 10, pointsPerGame: 10, winShares: 0.5 }),
    row({ teamAbbr: "BKN", gamesPlayed: 60, pointsPerGame: 20, winShares: 4 }),
  ]);

  it("produit une seule ligne, pondérée par les matchs", () => {
    expect(season.isMultiTeam).toBe(true);
    expect(season.gamesPlayed).toBe(70);
    // (60 × 20 + 10 × 10) / 70, et non (20 + 10) / 2.
    expect(season.pointsPerGame).toBeCloseTo(1300 / 70, 10);
  });

  it("garde l'équipe principale pour les couleurs et additionne les cumuls", () => {
    expect(season.teamAbbr).toBe("BKN");
    expect(season.stints.map((s) => s.teamAbbr)).toEqual(["BKN", "LAC"]);
    expect(season.winShares).toBeCloseTo(4.5, 10);
  });

  it("n'invente ni pourcentage ni taux avancé sans les volumes", () => {
    expect(season.fgPct).toBeNull();
    expect(season.per).toBeNull();
  });

  it("reprend les pourcentages exacts des box scores quand ils existent", () => {
    const exact = deriveSeasonFromBoxScores([
      boxLine({ pts: 20, fgm: 8, fga: 16, ftm: 4, fta: 4 }),
    ])!;
    const [withTotals] = consolidatePlayerSeasons(
      [
        row({ teamAbbr: "LAC", gamesPlayed: 10 }),
        row({ teamAbbr: "BKN", gamesPlayed: 60 }),
      ],
      new Map([["p1", exact]]),
    );
    expect(withTotals.fgPct).toBe(0.5);
  });
});

describe("joueur ayant trois équipes ou plus", () => {
  it("additionne les matchs et ne compte la saison qu'une fois", () => {
    const career = computeCareerAverages([
      stint("2023-24", "MIL", 10, 6),
      stint("2023-24", "DET", 40, 12),
      stint("2023-24", "GSW", 30, 9),
    ]);
    expect(career.seasonsPlayed).toBe(1);
    expect(career.gamesPlayed).toBe(80);
    expect(career.pointsPerGame).toBeCloseTo((60 + 480 + 270) / 80, 10);
  });

  it("signale la ligne consolidée par TOT dans la carrière", () => {
    const rows = [
      row({ playerId: "p1", teamAbbr: "MIL", gamesPlayed: 10 }),
      row({ playerId: "p1", teamAbbr: "DET", gamesPlayed: 40 }),
      row({ playerId: "p1", teamAbbr: "GSW", gamesPlayed: 30 }),
      row({ playerId: "p2", teamAbbr: "SAS", gamesPlayed: 82 }),
    ];
    const consolidated = consolidatePlayerSeasons(rows);
    expect(consolidated).toHaveLength(2);
    expect(MULTI_TEAM_ABBR).toBe("TOT");
  });
});

describe("saison partielle et moyennes de carrière", () => {
  it("pondère chaque saison par ses matchs", () => {
    const career = computeCareerAverages([
      stint("2022-23", "NYK", 72, 24),
      stint("2023-24", "NYK", 8, 12),
    ]);
    // La moyenne naïve des deux saisons donnerait 18.
    expect(career.pointsPerGame).toBeCloseTo((72 * 24 + 8 * 12) / 80, 10);
  });
});

describe("joueur sans match", () => {
  it("n'affiche aucune moyenne plutôt qu'un zéro", () => {
    const career = computeCareerAverages([stint("2026-27", "SAS", 0, 0)]);
    expect(career.gamesPlayed).toBe(0);
    expect(career.pointsPerGame).toBeNull();
    expect(deriveSeasonFromBoxScores([])).toBeNull();
  });

  it("laisse un pourcentage vide sans tentative", () => {
    const season = deriveSeasonFromBoxScores([boxLine({ pts: 2, fgm: 1, fga: 1 })])!;
    expect(season.threePtPct).toBeNull();
    expect(season.ftPct).toBeNull();
    expect(season.fgPct).toBe(1);
  });
});

describe("égalité dans un classement", () => {
  it("donne le même rang aux ex-aequo et saute le suivant", () => {
    expect(competitionRanks([30.1, 28, 28, 27.5, 27.5, 27.5, 20])).toEqual([
      1, 2, 2, 4, 4, 4, 7,
    ]);
  });

  it("classe à égalité dans le contexte statistique", () => {
    const context = calculateMetricContext([10, 20, 20, 30], 20, true);
    expect(context.rank).toBe(2);
    expect(context.percentile).toBe(25);
  });

  it("classe à l'envers quand une valeur basse est meilleure", () => {
    const context = calculateMetricContext([100, 105, 110, 120], 105, false);
    expect(context.rank).toBe(2);
  });
});

describe("seuil minimum de matchs", () => {
  it("suit l'avancement de la saison sans dépasser le seuil normal", () => {
    expect(scaledMinimumGames(0, 58)).toBe(1);
    expect(scaledMinimumGames(5, 58)).toBe(4);
    expect(scaledMinimumGames(82, 58)).toBe(58);
  });

  it("s'applique après regroupement des passages en équipe", () => {
    const [traded] = consolidatePlayerSeasons([
      row({ teamAbbr: "LAC", gamesPlayed: 30 }),
      row({ teamAbbr: "BKN", gamesPlayed: 35 }),
    ]);
    // Aucun passage n'atteint 58 matchs, la saison entière si.
    expect(traded.gamesPlayed).toBeGreaterThanOrEqual(scaledMinimumGames(82, 58));
  });
});

describe("saison régulière et playoffs", () => {
  it("ne compte que la saison régulière dans les moyennes", () => {
    expect(gamePhaseFromEspn({ season: { type: 2 } })).toBe(REGULAR_SEASON_PHASE);
    expect(gamePhaseFromEspn({ season: { type: 3 } })).toBe("playoffs");
    expect(gamePhaseFromEspn({ season: { type: 5 } })).toBe("play_in");
    expect(gamePhaseFromEspn({ season: { type: 1 } })).toBe("preseason");
  });

  it("écarte la finale de la NBA Cup, publiée en saison régulière", () => {
    expect(
      gamePhaseFromEspn({
        season: { type: 2 },
        competitions: [{ type: { abbreviation: "CC" } }],
      }),
    ).toBe("cup_final");
  });
});

describe("série gagnée par l'équipe la moins bien classée", () => {
  it("désigne l'outsider, pas la tête de série", () => {
    expect(
      seriesWinnerTeamId({
        completed: true,
        team1Id: "GSW",
        team2Id: "CLE",
        team1Wins: 3,
        team2Wins: 4,
      }),
    ).toBe("CLE");
  });

  it("applique le format historique du premier tour", () => {
    expect(seriesWinsRequired("1998-99", 1)).toBe(3);
    expect(seriesWinsRequired("2025-26", 1)).toBe(4);
  });
});

describe("match avec prolongation", () => {
  it("nomme les périodes au-delà du quatrième quart-temps", () => {
    expect([1, 4, 5, 6].map(periodLabel)).toEqual(["Q1", "Q4", "OT1", "OT2"]);
  });

  it("compte les minutes jouées en prolongation, secondes comprises", () => {
    expect(parseMinutes("53")).toBe(53);
    expect(parseMinutes("52:30")).toBe(52.5);
    expect(parseMinutes("--")).toBe(0);
    expect(parseMinutes(null)).toBe(0);

    const season = deriveSeasonFromBoxScores([
      boxLine({ minutes: "52:30" }),
      boxLine({ minutes: "37:30" }),
    ])!;
    expect(season.minutesPerGame).toBe(45);
  });
});

describe("True Shooting", () => {
  it("suit la formule NBA sur les totaux de la saison", () => {
    const season = deriveSeasonFromBoxScores([
      boxLine({ pts: 30, fga: 20, fta: 10 }),
      boxLine({ pts: 10, fga: 10, fta: 0 }),
    ])!;
    // 40 / (2 × (30 + 0,44 × 10))
    expect(season.trueShooting).toBeCloseTo(40 / (2 * 34.4), 10);
  });
});
