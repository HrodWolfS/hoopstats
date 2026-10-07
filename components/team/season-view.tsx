import Image from "next/image";
import { winPct } from "@/lib/format";
import { TEAM_BOX_SCORES_SINCE } from "@/lib/data-sources";
import type { TeamRatingKey, TeamRatings } from "@/lib/stats/team-ratings";
import type { PlayoffOutcome } from "@/lib/playoff-outcome";
import { PlayoffBadge } from "@/components/team/playoff-badge";

export type SeasonStats = {
  season: string;
  wins: number;
  losses: number;
  conferenceRank: number | null;
  /** Calculés depuis les box scores ; `null` pour une saison sans box scores. */
  ratings: TeamRatings | null;
  playoff: PlayoffOutcome;
  /** Résumé recomposé à l'affichage depuis le bilan, le rang et les séries jouées. */
  summary: string;
};


const RATING_CARDS: { key: TeamRatingKey; code: string; label: string; hint: string }[] = [
  { key: "offRating", code: "ORtg", label: "Offensive Rating", hint: "Points marqués pour 100 possessions" },
  { key: "defRating", code: "DRtg", label: "Defensive Rating", hint: "Points encaissés pour 100 possessions (plus bas = mieux)" },
  { key: "netRating", code: "NRtg", label: "Net Rating", hint: "ORtg − DRtg : écart pour 100 possessions" },
  { key: "pace", code: "Pace", label: "Rythme", hint: "Possessions par 48 minutes (rang 1 = le plus rapide)" },
];

function formatRating(key: TeamRatingKey, value: number): string {
  const fixed = value.toFixed(1).replace(".", ",");
  return key === "netRating" && value > 0 ? `+${fixed}` : fixed.replace("-", "−");
}

function TeamRatingsBlock({ season, ratings }: { season: string; ratings: TeamRatings | null }) {
  return (
    <section
      aria-labelledby="team-ratings-title"
      className="rounded-2xl border border-white/[0.06] bg-[#111114] p-4 sm:p-5"
    >
      <h3 id="team-ratings-title" className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
        Ratings {season} · saison régulière
      </h3>
      {ratings ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
            {RATING_CARDS.map(({ key, code, label, hint }) => (
              <div key={key} className="min-w-0 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <dt className="text-[11px] text-white/50">
                  <abbr title={label} className="no-underline font-mono font-semibold text-white/70">
                    {code}
                  </abbr>
                  <span className="sr-only"> ({label})</span>
                </dt>
                <dd className="mt-1">
                  <span className="font-display font-semibold text-2xl tabular-nums">
                    {formatRating(key, ratings[key])}
                  </span>
                  <span className="block text-[11px] font-mono text-white/45">
                    {ratings.ranks[key]}
                    <sup>{ratings.ranks[key] === 1 ? "er" : "e"}</sup>/{ratings.teamCount} NBA
                  </span>
                  <span className="mt-1 block text-[10px] leading-snug text-white/30">{hint}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-white/35">
            Calculés par hoopstats sur {ratings.games} matchs, avec les possessions estimées
            (tirs tentés + 0,44 × lancers francs − rebonds offensifs + balles perdues). Peuvent
            différer de quelques dixièmes des chiffres NBA.com.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/45">
          {season < TEAM_BOX_SCORES_SINCE
            ? `Ratings non disponibles pour ${season} : les box scores d'équipe en base commencent en ${TEAM_BOX_SCORES_SINCE}.`
            : `Ratings disponibles après les premiers matchs de saison régulière ${season}.`}
        </p>
      )}
    </section>
  );
}

export type ConferenceRow = {
  conferenceRank: number | null;
  previousConferenceRank: number | null;
  wins: number;
  losses: number;
  team: {
    id: string;
    slug: string;
    city: string;
    name: string;
    abbr: string;
    logoUrl: string | null;
    primaryColor: string;
  };
};

type SeasonViewProps = {
  season: SeasonStats;
  primaryColor: string;
  teamId: string;
  standings: ConferenceRow[];
};

function RankArrow({
  current,
  previous,
}: {
  current: number | null;
  previous: number | null;
}) {
  if (!current || !previous || current === previous) {
    return <span className="text-white/20 text-xs">—</span>;
  }
  // Rang plus petit = meilleur classement
  if (current < previous) {
    return <span className="text-emerald-400 text-xs font-bold">↑</span>;
  }
  return <span className="text-red-400 text-xs font-bold">↓</span>;
}

export function SeasonView({
  season,
  primaryColor,
  teamId,
  standings,
}: SeasonViewProps) {
  // Games behind : calculé depuis le leader (rang 1)
  const leader = standings.find((r) => r.conferenceRank === 1);
  const leaderW = leader?.wins ?? 0;
  const leaderL = leader?.losses ?? 0;

  const gb = (row: ConferenceRow) => {
    if (row.conferenceRank === 1) return "—";
    const diff = (leaderW - row.wins + (row.losses - leaderL)) / 2;
    return diff % 1 === 0 ? String(diff) : diff.toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="text-white/50">Playoffs {season.season} :</span>
        <PlayoffBadge outcome={season.playoff} primaryColor={primaryColor} />
      </div>

      <TeamRatingsBlock season={season.season} ratings={season.ratings} />

      {/* Résumé texte */}
      <p className="text-white/60 text-sm leading-relaxed">{season.summary}</p>

      {/* Classement conférence */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <div className="px-4 pt-5 pb-3">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
            Classement conférence
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-[11px] text-white/30 font-medium px-4 py-2 w-8">
                #
              </th>
              <th className="text-left text-[11px] text-white/30 font-medium px-2 py-2">
                Équipe
              </th>
              <th className="text-right text-[11px] text-white/30 font-medium px-3 py-2">
                V
              </th>
              <th className="text-right text-[11px] text-white/30 font-medium px-3 py-2">
                D
              </th>
              <th className="text-right text-[11px] text-white/30 font-medium px-3 py-2">
                %
              </th>
              <th className="text-right text-[11px] text-white/30 font-medium px-4 py-2">
                GB
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const isCurrentTeam = row.team.id === teamId;
              return (
                <tr
                  key={row.team.id}
                  className="border-b border-white/[0.04] last:border-0 transition-colors"
                  style={
                    isCurrentTeam
                      ? {
                          background: `${primaryColor}18`,
                          borderLeft: `3px solid ${primaryColor}`,
                        }
                      : {}
                  }
                >
                  {/* Rang + flèche */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          isCurrentTeam
                            ? "font-bold tabular-nums"
                            : "text-white/50 tabular-nums"
                        }
                      >
                        {row.conferenceRank ?? "—"}
                      </span>
                      <RankArrow
                        current={row.conferenceRank}
                        previous={row.previousConferenceRank}
                      />
                    </div>
                  </td>

                  {/* Logo + nom */}
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      {row.team.logoUrl && (
                        <Image
                          src={row.team.logoUrl}
                          alt={row.team.abbr}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      )}
                      <span
                        className={
                          isCurrentTeam ? "font-semibold" : "text-white/70"
                        }
                      >
                        {row.team.city}{" "}
                        <span className="text-white/40">{row.team.name}</span>
                      </span>
                    </div>
                  </td>

                  {/* Stats */}
                  <td className="px-3 py-3 text-right tabular-nums">
                    {row.wins}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-white/50">
                    {row.losses}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-white/70">
                    .{winPct(row.wins, row.losses).replace(".", "")}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/40">
                    {gb(row)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
