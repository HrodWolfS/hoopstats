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
  { id: "season", label: "Classement" },
  { id: "history", label: "Historique" },
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

      {active === "roster" && roster.length > 0 && (
        <RosterView players={roster} updatedAt={rosterDate} locale={locale} />
      )}
      {active === "roster" && roster.length === 0 && (
        <div className="py-16 text-center space-y-2">
          <p className="text-white/40 text-sm font-mono">
            Effectif non disponible pour cette saison.
          </p>
          <p className="text-white/20 text-xs font-mono">
            Les données d&apos;effectif historiques sont en cours
            d&apos;intégration (2015-16+ disponibles).
          </p>
        </div>
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
        <div className="py-16 text-center space-y-2">
          <p className="text-white/40 text-sm font-mono">
            Classement non disponible pour cette saison.
          </p>
        </div>
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
