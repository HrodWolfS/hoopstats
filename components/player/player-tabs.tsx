"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { CareerView, type CareerSeason } from "@/components/player/career-view";
import {
  AdvancedView,
  type AdvancedSeason,
} from "@/components/player/advanced-view";
import { GameLogView, type PlayerGameLog } from "@/components/player/game-log-view";

type PlayerTabsProps = {
  primaryColor: string;
  career: CareerSeason[];
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
  advanced,
  gameLogs,
  locale,
}: PlayerTabsProps) {
  const [active, setActive] = useState("career");

  return (
    <div className="space-y-8">
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      {active === "career" && (
        <CareerView seasons={career} primaryColor={primaryColor} />
      )}
      {active === "advanced" && (
        <AdvancedView seasons={advanced} primaryColor={primaryColor} />
      )}
      {active === "games" && <GameLogView logs={gameLogs} locale={locale} />}
    </div>
  );
}
