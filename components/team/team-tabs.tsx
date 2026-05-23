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

type TeamTabsProps = {
  primaryColor: string;
  teamId: string;
  roster: RosterPlayer[];
  currentSeason: SeasonStats | null;
  standings: ConferenceRow[];
  history: HistorySeason[];
  rosterDate: string;
  locale: string;
};

const TABS = [
  { id: "roster", label: "Effectif" },
  { id: "season", label: "Saison actuelle" },
  { id: "history", label: "Historique 10 saisons" },
];

export function TeamTabs({
  primaryColor,
  teamId,
  roster,
  currentSeason,
  standings,
  history,
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
    </div>
  );
}
