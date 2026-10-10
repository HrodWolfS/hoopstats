import { signed, stat } from "@/lib/format";
import { loadTrends, trendSeasons } from "@/lib/stats/trends-data";
import { DEFAULT_TREND_WINDOW, sortTrends, trendDelta } from "@/lib/stats/trends";
import { ogDate, statCard } from "@/components/og/stat-card";

/** Carte de la vue par défaut des tendances : plus fortes hausses de points sur la fenêtre par défaut. */
export async function trendsCard(saison?: string) {
  const seasons = await trendSeasons();
  const season = saison && seasons.includes(saison) ? saison : seasons[0];
  if (!season) return statCard({ eyebrow: "Tendances NBA", title: "hoopstats", lines: [], dateLine: "" });
  const data = await loadTrends(season);
  const window = DEFAULT_TREND_WINDOW;
  const rows = sortTrends(
    data.windows[window].map((row) => {
      const player = data.players[row.playerId];
      return { ...row, name: player ? `${player.firstName} ${player.lastName}` : "" };
    }),
    "pts",
    "hausse",
  );
  return statCard({
    eyebrow: `Tendances NBA · saison ${season}`,
    title: `En forme : points sur les ${window} derniers matchs`,
    lines: rows.slice(0, 3).map((row) => {
      const delta = trendDelta(row, "pts") ?? 0;
      return {
        label: row.name,
        sub: `${stat(row.recent.pts)} pts (saison ${stat(row.season.pts)})`,
        value: signed(delta),
        tone: delta >= 0.05 ? "up" : delta <= -0.05 ? "down" : "plain",
      };
    }),
    dateLine: ogDate(data.lastGameDate, "Matchs joués jusqu'au"),
    empty: `Pas encore ${window} matchs joués par joueur`,
  });
}

