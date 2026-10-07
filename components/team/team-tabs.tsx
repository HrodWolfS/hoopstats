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
import type { GameRow } from "@/components/team/recent-games";
import { TeamGamesView } from "@/components/team/team-games-view";

type TeamTabsProps = {
  primaryColor: string;
  teamId: string;
  roster: RosterPlayer[];
  currentSeason: SeasonStats | null;
  standings: ConferenceRow[];
  history: HistorySeason[];
  /** Matchs joués de la saison sélectionnée, du plus récent au plus ancien. */
  seasonGames: GameRow[];
  upcomingGames: GameRow[];
  rosterDate: string;
  locale: string;
  /** Saison sélectionnée : tous les onglets s'y rapportent, sauf l'historique. */
  season: string;
  teamSlug: string;
  /** Saison en cours : un effectif vide veut dire qu'aucun match n'est encore joué. */
  liveSeason: string;
};

export function TeamTabs({
  primaryColor,
  teamId,
  roster,
  currentSeason,
  standings,
  history,
  seasonGames,
  upcomingGames,
  rosterDate,
  locale,
  season,
  teamSlug,
  liveSeason,
}: TeamTabsProps) {
  const isLiveSeason = season === liveSeason;
  const [active, setActive] = useState("roster");
  // Portée de chaque onglet dans son libellé, comme sur la fiche joueur.
  const tabs = [
    { id: "roster", label: `Effectif ${season}` },
    { id: "season", label: `Saison ${season}` },
    { id: "games", label: `Matchs ${season}` },
    { id: "history", label: "Historique" },
  ];

  return (
    <div className="space-y-8">
      <Tabs tabs={tabs} active={active} onChange={setActive} />

      {active === "roster" && roster.length > 0 && (
        <RosterView players={roster} updatedAt={rosterDate} locale={locale} />
      )}
      {active === "roster" && roster.length === 0 && isLiveSeason && (
        <div className="py-16 text-center space-y-2">
          <p className="text-white/40 text-sm font-mono">
            Effectif à venir.
          </p>
          <p className="text-white/20 text-xs font-mono">
            Il apparaît après le premier match de l&apos;équipe cette saison.
          </p>
        </div>
      )}
      {active === "roster" && roster.length === 0 && !isLiveSeason && (
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
            Bilan et classement non disponibles pour {season}.
          </p>
        </div>
      )}
      {active === "history" && (
        <HistoryView
          seasons={history}
          primaryColor={primaryColor}
          selectedSeason={season}
          teamSlug={teamSlug}
          locale={locale}
          liveSeason={liveSeason}
        />
      )}
      {active === "games" && (
        <TeamGamesView
          games={seasonGames}
          upcoming={upcomingGames}
          season={season}
          liveSeason={liveSeason}
          primaryColor={primaryColor}
          locale={locale}
        />
      )}
    </div>
  );
}
