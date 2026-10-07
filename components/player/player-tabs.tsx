"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { ColumnHelpProvider } from "@/components/ui/column-help";
import { CareerView, type CareerSeason } from "@/components/player/career-view";
import type { SeasonShooting } from "@/lib/stats/career";
import type { SeasonTotals } from "@/lib/stats/season-aggregation";
import {
  AdvancedView,
  type AdvancedSeason,
} from "@/components/player/advanced-view";
import { GameLogView, type PlayerGameLog } from "@/components/player/game-log-view";

type PlayerTabsProps = {
  primaryColor: string;
  career: CareerSeason[];
  careerShooting: Record<string, SeasonShooting>;
  seasonTotals: Record<string, SeasonTotals>;
  advanced: AdvancedSeason[];
  gameLogs: PlayerGameLog[];
  /** Saison du journal des matchs : celle sélectionnée, ou la dernière jouée. */
  gameSeason: string;
  locale: string;
};

export function PlayerTabs({
  primaryColor,
  career,
  careerShooting,
  seasonTotals,
  advanced,
  gameLogs,
  gameSeason,
  locale,
}: PlayerTabsProps) {
  const [active, setActive] = useState("career");
  // Portée de chaque onglet dans son libellé : toute la carrière d'un côté,
  // une seule saison de l'autre.
  const tabs = [
    { id: "career", label: "Carrière" },
    { id: "advanced", label: "Stats avancées" },
    { id: "games", label: `Matchs ${gameSeason}` },
  ];

  return (
    <div className="space-y-8">
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      <ColumnHelpProvider key={active}>
        {active === "career" && (
          <CareerView
            seasons={career}
            exactShooting={careerShooting}
            seasonTotals={seasonTotals}
            primaryColor={primaryColor}
          />
        )}
        {active === "advanced" && (
          <AdvancedView seasons={advanced} primaryColor={primaryColor} />
        )}
        {active === "games" && <GameLogView logs={gameLogs} season={gameSeason} locale={locale} />}
      </ColumnHelpProvider>
    </div>
  );
}
