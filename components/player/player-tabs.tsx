"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { CareerView, type CareerSeason } from "@/components/player/career-view";
import type { SeasonShooting } from "@/lib/stats/career";
import {
  AdvancedView,
  type AdvancedSeason,
} from "@/components/player/advanced-view";
import { GameLogView, type PlayerGameLog } from "@/components/player/game-log-view";

type PlayerTabsProps = {
  primaryColor: string;
  career: CareerSeason[];
  careerShooting: Record<string, SeasonShooting>;
  advanced: AdvancedSeason[];
  gameLogs: PlayerGameLog[];
  locale: string;
};

const TABS = [
  { id: "career", label: "Carrière" },
  { id: "advanced", label: "Stats avancées" },
  { id: "games", label: "Matchs" },
];

export function PlayerTabs({
  primaryColor,
  career,
  careerShooting,
  advanced,
  gameLogs,
  locale,
}: PlayerTabsProps) {
  const [active, setActive] = useState("career");

  return (
    <div className="space-y-8">
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      {active === "career" && (
        <CareerView
          seasons={career}
          exactShooting={careerShooting}
          primaryColor={primaryColor}
        />
      )}
      {active === "advanced" && (
        <AdvancedView seasons={advanced} primaryColor={primaryColor} />
      )}
      {active === "games" && <GameLogView logs={gameLogs} locale={locale} />}
    </div>
  );
}
