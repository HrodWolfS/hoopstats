"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { RosterView, type RosterPlayer } from "@/components/team/roster-view";
import {
  SeasonView,
  type SeasonStats,
  type ConferenceRow,
} from "@/components/team/season-view";
import {
  HistoryView,
  type HistorySeason,
} from "@/components/team/history-view";
import { RecentGames, type GameRow } from "@/components/team/recent-games";
import { UpcomingGames } from "@/components/team/upcoming-games";

type TeamTabsProps = {
  primaryColor: string;
  teamId: string;
  roster: RosterPlayer[];
  currentSeason: SeasonStats | null;
  standings: ConferenceRow[];
  history: HistorySeason[];
  recentGames: GameRow[];
  upcomingGames: GameRow[];
  rosterDate: string;
  locale: string;
};

const TABS = [
  { id: "roster", label: "Effectif" },
  { id: "season", label: "Saison actuelle" },
  { id: "history", label: "Historique 10 saisons" },
  { id: "games", label: "Matchs" },
];

export function TeamTabs({
  primaryColor,
  teamId,
  roster,
  currentSeason,
  standings,
  history,
  recentGames,
  upcomingGames,
  rosterDate,
  locale,
}: TeamTabsProps) {
  const [active, setActive] = useState("roster");

  return (
    <div className="space-y-8">
      <Tabs tabs={TABS} active={active} onChange={setActive} />

      {active === "roster" && (
        <RosterView players={roster} updatedAt={rosterDate} locale={locale} />
      )}
      {active === "season" && currentSeason && (
        <SeasonView
          season={currentSeason}
          primaryColor={primaryColor}
          teamId={teamId}
          standings={standings}
        />
      )}
      {active === "season" && !currentSeason && (
        <p className="text-white/40 text-sm font-mono py-8">
          Données saison non disponibles.
        </p>
      )}
      {active === "history" && (
        <HistoryView seasons={history} primaryColor={primaryColor} />
      )}
      {active === "games" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RecentGames games={recentGames} primaryColor={primaryColor} />
          <UpcomingGames games={upcomingGames} />
        </div>
      )}
    </div>
  );
}
