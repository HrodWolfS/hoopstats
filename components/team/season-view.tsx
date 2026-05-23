import Image from "next/image";
import { winPct } from "@/lib/format";

export type SeasonStats = {
  wins: number;
  losses: number;
  offRating: number | null;
  defRating: number | null;
  netRating: number | null;
  pace: number | null;
  trueShooting: number | null;
  summaryFr: string | null;
};

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
      {/* Résumé texte */}
      {season.summaryFr && (
        <p className="text-white/60 text-sm leading-relaxed">
          {season.summaryFr}
        </p>
      )}

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
