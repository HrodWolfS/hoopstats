import { ALL_SEASONS } from "@/lib/nba";
import { frDecimal, pct, stat } from "@/lib/format";
import { playerStatsOrigin } from "@/lib/data-sources";
import { tableUpdatedAt } from "@/lib/data-updates";
import { loadLeaderboard } from "@/lib/stats/leaderboard-data";
import { MULTI_TEAM_ABBR } from "@/lib/stats/season-consolidation";
import { ogDate, OG_SIZE, statCard } from "@/components/og/stat-card";

export const revalidate = 21600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Classement NBA hoopstats : les trois premiers, la valeur et la date des données";

export default async function Image({ params }: { params: Promise<{ season: string; metric: string }> }) {
  const { season, metric } = await params;
  const data = ALL_SEASONS.includes(season) ? await loadLeaderboard(season, metric) : null;
  if (!data) return statCard({ eyebrow: "Classements NBA", title: "hoopstats", lines: [], dateLine: "" });
  const { leaderboard, definition, leaders, ranks } = data;
  // Sans classement, pas de date : « Données au » d'avant la saison induirait en erreur.
  const dateLine = leaders.length > 0 ? ogDate(await tableUpdatedAt([playerStatsOrigin(season, leaderboard.metric)])) : "";
  return statCard({
    eyebrow: `Leaders NBA · saison ${season}`,
    title: leaderboard.label,
    lines: leaders.slice(0, 3).map(({ row, value }, index) => ({
      rank: ranks[index],
      label: `${row.player.firstName} ${row.player.lastName}`,
      sub: row.isMultiTeam ? MULTI_TEAM_ABBR : row.team.abbr,
      value: frDecimal(definition.mode === "percentage" ? `${pct(value)} %` : stat(value)),
    })),
    dateLine,
    empty: "Classement disponible après les premiers matchs",
  });
}
