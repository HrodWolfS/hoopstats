/**
 * Les modules de calcul embarquent leurs propres cas de contrôle, exécutés
 * aussi par `pnpm health:data`. On les rejoue ici pour qu'une régression
 * casse les tests avant d'atteindre la production.
 */

import { describe, expect, it } from "vitest";
import { validateAccentOnDark } from "@/lib/color";
import { validateAnalyticsPayload } from "@/lib/analytics";
import { validateEspnAthleteParsing } from "@/lib/espn-athlete";
import { validateScoreboardMonths } from "@/lib/espn-scoreboard";
import { validateGameStatus } from "@/lib/game-status";
import { validatePlayoffCorrections } from "@/lib/playoff-corrections";
import { validatePlayoffSeriesWinner } from "@/lib/playoff-series";
import { validateSeasonPhase } from "@/lib/season-phase";
import { validateCareerAggregation } from "@/lib/stats/career";
import { validateStatisticalContext } from "@/lib/stats/context";
import { validatePlayerMetricRegistry } from "@/lib/stats/metrics";
import { validatePlayerAliases } from "@/lib/stats/player-aliases";
import { validatePlayerIdentityResolver } from "@/lib/stats/player-identity";
import { validatePlayerSimilarity } from "@/lib/stats/player-similarity";
import { validateSeasonAggregation } from "@/lib/stats/season-aggregation";
import { validateSeasonConsolidation } from "@/lib/stats/season-consolidation";

const SELF_CHECKS: Record<string, () => string[]> = {
  "couleurs d'accent": validateAccentOnDark,
  "mesure d'audience": validateAnalyticsPayload,
  "profils ESPN": validateEspnAthleteParsing,
  "découpage du scoreboard ESPN": validateScoreboardMonths,
  "statuts de match": validateGameStatus,
  "corrections de playoffs": validatePlayoffCorrections,
  "vainqueur de série": validatePlayoffSeriesWinner,
  "saison et phase ESPN": validateSeasonPhase,
  "agrégation de carrière": validateCareerAggregation,
  "contexte statistique": validateStatisticalContext,
  "registre des métriques": validatePlayerMetricRegistry,
  "alias de joueurs": validatePlayerAliases,
  "identité des joueurs": validatePlayerIdentityResolver,
  "joueurs similaires": validatePlayerSimilarity,
  "saison depuis les box scores": validateSeasonAggregation,
  "ligne TOT": validateSeasonConsolidation,
};

describe("auto-contrôles des modules", () => {
  it.each(Object.entries(SELF_CHECKS))("%s", (_, check) => {
    expect(check()).toEqual([]);
  });
});
