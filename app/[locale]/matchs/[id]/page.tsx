import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

// ── ESPN Types ────────────────────────────────────────────────────────────────

type EspnCompetitor = {
  homeAway?: string;
  score?: string;
  winner?: boolean;
  linescores?: Array<{ displayValue?: string }>;
  team?: {
    abbreviation?: string;
    displayName?: string;
    color?: string;
    logo?: string;
  };
};

type EspnAthlete = {
  athlete?: {
    displayName?: string;
    jersey?: string;
    position?: { abbreviation?: string };
  };
  stats?: string[];
  starter?: boolean;
  active?: boolean;
  didNotPlay?: boolean;
  reason?: string | null;
};

type EspnPlayerTeam = {
  team?: { abbreviation?: string; color?: string };
  statistics?: Array<{
    names?: string[];
    athletes?: EspnAthlete[];
  }>;
};

type EspnTeamStats = {
  team?: { abbreviation?: string };
  statistics?: Array<{ name?: string; displayValue?: string; label?: string }>;
};

type EspnSummary = {
  header?: {
    competitions?: Array<{
      date?: string;
      status?: {
        type?: { name?: string; shortDetail?: string; state?: string };
      };
      competitors?: EspnCompetitor[];
    }>;
  };
  boxscore?: {
    teams?: EspnTeamStats[];
    players?: EspnPlayerTeam[];
  };
};

// ── Parsed types ──────────────────────────────────────────────────────────────

type PlayerRow = {
  name: string;
  jersey: string;
  position: string;
  starter: boolean;
  didNotPlay: boolean;
  dnpReason: string | null;
  min: string;
  pts: string;
  reb: string;
  ast: string;
  stl: string;
  blk: string;
  to: string;
  pf: string;
  fg: string;
  threePt: string;
  ft: string;
  plusMinus: string;
};

type TeamStats = {
  pts: string;
  reb: string;
  oreb: string;
  dreb: string;
  ast: string;
  stl: string;
  blk: string;
  to: string;
  pf: string;
  fg: string;
  fgPct: string;
  threePt: string;
  threePtPct: string;
  ft: string;
  ftPct: string;
};

type TeamBoxScore = {
  abbr: string;
  players: PlayerRow[];
  teamStats: TeamStats | null;
};

// ── ESPN fetch & parse ────────────────────────────────────────────────────────

async function fetchEspnBoxScore(espnId: string): Promise<EspnSummary | null> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnId}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as EspnSummary;
  } catch {
    return null;
  }
}

function parsePlayerStats(
  espn: EspnSummary,
  awayAbbr: string,
  homeAbbr: string,
): { away: TeamBoxScore; home: TeamBoxScore } | null {
  const playersData = espn.boxscore?.players;
  if (!playersData || playersData.length < 2) return null;

  // ESPN arrays: [0] = away, [1] = home (consistent convention)
  function parseTeam(
    raw: EspnPlayerTeam,
    teamStatsRaw: EspnTeamStats | undefined,
    abbr: string,
  ): TeamBoxScore {
    const stats = raw.statistics?.[0];
    const names = stats?.names ?? [];
    const idx = (col: string) => names.indexOf(col);

    const players: PlayerRow[] = (stats?.athletes ?? []).map((a) => {
      const s = a.stats ?? [];
      const get = (col: string) => s[idx(col)] ?? "—";
      return {
        name: a.athlete?.displayName ?? "—",
        jersey: a.athlete?.jersey ?? "",
        position: a.athlete?.position?.abbreviation ?? "",
        starter: a.starter ?? false,
        didNotPlay: a.didNotPlay ?? false,
        dnpReason: a.reason ?? null,
        min: get("MIN"),
        pts: get("PTS"),
        reb: get("REB"),
        ast: get("AST"),
        stl: get("STL"),
        blk: get("BLK"),
        to: get("TO"),
        pf: get("PF"),
        fg: get("FG"),
        threePt: get("3PT"),
        ft: get("FT"),
        plusMinus: get("+/-"),
      };
    });

    // Team totals — ESPN uses long-form labels ("Rebounds", "Assists", etc.)
    // and short-form for shooting ("FG", "3PT", "FT"). We match either.
    const tStats = teamStatsRaw?.statistics;
    const tGet = (patterns: string[]): string => {
      const found = tStats?.find((s) => {
        const label = (s.label ?? "").toLowerCase();
        const name = (s.name ?? "").toLowerCase();
        return patterns.some((p) => {
          const lp = p.toLowerCase();
          return label === lp || name === lp;
        });
      });
      return found?.displayValue ?? "—";
    };

    const teamStats: TeamStats | null = tStats
      ? {
          // Points are not in the team stats array — populated by caller from header score
          pts: "—",
          reb: tGet(["Rebounds", "totalRebounds", "REB"]),
          oreb: tGet(["Offensive Rebounds", "offensiveRebounds", "OREB"]),
          dreb: tGet(["Defensive Rebounds", "defensiveRebounds", "DREB"]),
          ast: tGet(["Assists", "assists", "AST"]),
          stl: tGet(["Steals", "steals", "STL"]),
          blk: tGet(["Blocks", "blocks", "BLK"]),
          to: tGet(["Turnovers", "turnovers", "TO"]),
          pf: tGet(["Fouls", "fouls", "PF", "teamFouls"]),
          fg: tGet(["FG", "fieldGoalsMade-fieldGoalsAttempted"]),
          fgPct: tGet([
            "Field Goal %",
            "fieldGoalPct",
            "FG%",
            "fieldGoalsPercentage",
          ]),
          threePt: tGet([
            "3PT",
            "threePointFieldGoalsMade-threePointFieldGoalsAttempted",
          ]),
          threePtPct: tGet([
            "Three Point %",
            "threePointFieldGoalPct",
            "3P%",
            "threePointPercentage",
          ]),
          ft: tGet(["FT", "freeThrowsMade-freeThrowsAttempted"]),
          ftPct: tGet([
            "Free Throw %",
            "freeThrowPct",
            "FT%",
            "freeThrowsPercentage",
          ]),
        }
      : null;

    return { abbr, players, teamStats };
  }

  return {
    away: parseTeam(playersData[0], espn.boxscore?.teams?.[0], awayAbbr),
    home: parseTeam(playersData[1], espn.boxscore?.teams?.[1], homeAbbr),
  };
}

// ── DB box score loader ──────────────────────────────────────────────────────

/**
 * Charge le box score depuis la DB et le convertit au format `TeamBoxScore`
 * (compatible avec le rendu existant). Retourne null si pas encore syncé.
 */
async function loadBoxScoreFromDb(
  gameId: string,
  awayAbbr: string,
  homeAbbr: string,
): Promise<{
  away: TeamBoxScore;
  home: TeamBoxScore;
  linescores: { away: number[]; home: number[] } | null;
} | null> {
  const [gbs, players] = await Promise.all([
    prisma.gameBoxScore.findUnique({ where: { gameId } }),
    prisma.playerBoxScore.findMany({
      where: { gameId },
      orderBy: [{ starter: "desc" }, { pts: "desc" }],
    }),
  ]);

  if (!gbs || players.length === 0) return null;

  const fmtNum = (v: number | null): string => (v == null ? "—" : String(v));
  const fmtPair = (m: number | null, a: number | null): string =>
    m == null || a == null ? "—" : `${m}/${a}`;
  const fmtPct = (m: number | null, a: number | null): string =>
    m == null || a == null || a === 0 ? "—" : ((m / a) * 100).toFixed(1);
  const fmtSigned = (v: number | null): string =>
    v == null ? "—" : v > 0 ? `+${v}` : String(v);

  function buildTeamStats(side: "away" | "home"): TeamStats {
    const pick = <K extends string>(k: K) =>
      (gbs as unknown as Record<string, number | null>)[`${side}${k}`] ?? null;
    return {
      pts: "—", // populated by caller (from header score)
      reb: fmtNum(pick("Reb")),
      oreb: fmtNum(pick("Oreb")),
      dreb: fmtNum(pick("Dreb")),
      ast: fmtNum(pick("Ast")),
      stl: fmtNum(pick("Stl")),
      blk: fmtNum(pick("Blk")),
      to: fmtNum(pick("Tov")),
      pf: fmtNum(pick("Pf")),
      fg: fmtPair(pick("Fgm"), pick("Fga")),
      fgPct: fmtPct(pick("Fgm"), pick("Fga")),
      threePt: fmtPair(pick("ThreePm"), pick("ThreePa")),
      threePtPct: fmtPct(pick("ThreePm"), pick("ThreePa")),
      ft: fmtPair(pick("Ftm"), pick("Fta")),
      ftPct: fmtPct(pick("Ftm"), pick("Fta")),
    };
  }

  function buildTeam(side: "away" | "home", abbr: string): TeamBoxScore {
    const teamPlayers: PlayerRow[] = players
      .filter((p) => p.teamAbbr === abbr)
      .map((p) => ({
        name: p.playerName,
        jersey: p.jersey ?? "",
        position: p.position ?? "",
        starter: p.starter,
        didNotPlay: p.didNotPlay,
        dnpReason: p.dnpReason,
        min: p.minutes ?? "—",
        pts: fmtNum(p.pts),
        reb: fmtNum(p.reb),
        ast: fmtNum(p.ast),
        stl: fmtNum(p.stl),
        blk: fmtNum(p.blk),
        to: fmtNum(p.tov),
        pf: fmtNum(p.pf),
        fg: fmtPair(p.fgm, p.fga),
        threePt: fmtPair(p.threePm, p.threePa),
        ft: fmtPair(p.ftm, p.fta),
        plusMinus: fmtSigned(p.plusMinus),
      }));
    return { abbr, players: teamPlayers, teamStats: buildTeamStats(side) };
  }

  // Linescores depuis le JSON Prisma
  const awayLines = Array.isArray(gbs.awayLinescores)
    ? (gbs.awayLinescores as number[])
    : null;
  const homeLines = Array.isArray(gbs.homeLinescores)
    ? (gbs.homeLinescores as number[])
    : null;

  return {
    away: buildTeam("away", awayAbbr),
    home: buildTeam("home", homeAbbr),
    linescores:
      awayLines && homeLines ? { away: awayLines, home: homeLines } : null,
  };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const game = await prisma.game.findUnique({
    where: { id },
    select: {
      homeTeam: { select: { abbr: true } },
      awayTeam: { select: { abbr: true } },
      gameDate: true,
    },
  });
  if (!game) return { title: "Match | hoopstats" };
  return {
    title: `${game.awayTeam.abbr} @ ${game.homeTeam.abbr} | hoopstats`,
    description: `Box score et statistiques du match ${game.awayTeam.abbr} @ ${game.homeTeam.abbr}`,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TeamLogo({
  logoUrl,
  abbr,
  size,
}: {
  logoUrl: string | null;
  abbr: string;
  size: number;
}) {
  if (!logoUrl)
    return (
      <div
        className="rounded flex items-center justify-center text-xs font-mono text-white/50 bg-white/[0.05]"
        style={{ width: size, height: size }}
      >
        {abbr}
      </div>
    );
  return (
    <Image
      src={logoUrl}
      alt={abbr}
      width={size}
      height={size}
      className="object-contain"
      unoptimized
    />
  );
}

function PlayerTable({
  team,
  primaryColor,
  teamName,
}: {
  team: TeamBoxScore;
  primaryColor: string;
  teamName: string;
}) {
  const starters = team.players.filter((p) => p.starter && !p.didNotPlay);
  const bench = team.players.filter((p) => !p.starter && !p.didNotPlay);
  const dnp = team.players.filter((p) => p.didNotPlay);

  const cols = [
    { key: "pts", label: "PTS" },
    { key: "min", label: "MIN" },
    { key: "reb", label: "REB" },
    { key: "ast", label: "AST" },
    { key: "stl", label: "STL" },
    { key: "blk", label: "BLK" },
    { key: "to", label: "TO" },
    { key: "pf", label: "PF" },
    { key: "fg", label: "FG" },
    { key: "threePt", label: "3PT" },
    { key: "ft", label: "FT" },
    { key: "plusMinus", label: "+/-" },
  ] as const;

  function PlayerRow({
    player,
    highlight,
  }: {
    player: PlayerRow;
    highlight?: boolean;
  }) {
    if (player.didNotPlay) return null;
    return (
      <tr
        className={`border-b border-white/[0.04] transition ${highlight ? "bg-white/[0.015]" : "hover:bg-white/[0.02]"}`}
      >
        <td className="px-4 py-2.5 sticky left-0 bg-[#111114] z-10">
          <div className="flex items-center gap-2 min-w-[140px]">
            {player.starter && (
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: primaryColor }}
              />
            )}
            {!player.starter && <span className="h-1.5 w-1.5 shrink-0" />}
            <span className="text-xs text-white/80 font-medium truncate">
              {player.name}
            </span>
            <span className="text-[10px] text-white/25 font-mono shrink-0">
              {player.position}
            </span>
          </div>
        </td>
        {cols.map((c) => {
          const val = player[c.key];
          const isPts = c.key === "pts";
          const isPlusMinus =
            c.key === "plusMinus" && val !== "—" && val !== "0" && val !== "+0";
          const isPositive = isPlusMinus && !val.startsWith("-");
          return (
            <td
              key={c.key}
              className={`px-3 py-2.5 text-right font-mono text-xs tabular-nums ${
                isPts
                  ? "text-white font-semibold"
                  : isPlusMinus
                    ? isPositive
                      ? "text-emerald-400"
                      : "text-rose-400"
                    : "text-white/50"
              }`}
            >
              {val}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
      {/* Team header */}
      <div
        className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2"
        style={{ borderLeftColor: primaryColor, borderLeftWidth: 3 }}
      >
        <span className="font-display font-semibold text-sm text-white">
          {teamName}
        </span>
        <span className="text-[10px] font-mono text-white/30">{team.abbr}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-white/25">
              <th className="text-left px-4 py-2 font-medium sticky left-0 bg-[#111114] z-10 min-w-[160px]">
                Joueur
              </th>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className="text-right px-3 py-2 font-medium whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {starters.map((p) => (
              <PlayerRow key={p.name} player={p} />
            ))}
            {bench.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={cols.length + 1}
                    className="px-4 py-1.5 text-[9px] uppercase tracking-widest text-white/20 font-mono bg-white/[0.01] border-b border-white/[0.04]"
                  >
                    Remplaçants
                  </td>
                </tr>
                {bench.map((p) => (
                  <PlayerRow key={p.name} player={p} />
                ))}
              </>
            )}
            {/* Totals row */}
            {team.teamStats && (
              <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                <td className="px-4 py-2.5 sticky left-0 bg-[#18181c] z-10">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                    Total
                  </span>
                </td>
                {cols.map((c) => {
                  const val =
                    team.teamStats && c.key in team.teamStats
                      ? team.teamStats[c.key as keyof TeamStats]
                      : "—";
                  return (
                    <td
                      key={c.key}
                      className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-white/60 font-medium"
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DNP */}
      {dnp.length > 0 && (
        <div className="px-4 py-3 border-t border-white/[0.04] flex flex-wrap gap-x-4 gap-y-1">
          {dnp.map((p) => (
            <span key={p.name} className="text-[11px] text-white/25">
              <span className="text-white/40">{p.name}</span>
              {p.dnpReason && (
                <span className="ml-1 text-white/20">({p.dnpReason})</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Team Stats Comparison ─────────────────────────────────────────────────────

function TeamStatsComparison({
  away,
  home,
  awayColor,
  homeColor,
  awayScore,
  homeScore,
}: {
  away: TeamBoxScore;
  home: TeamBoxScore;
  awayColor: string;
  homeColor: string;
  awayScore: number | null;
  homeScore: number | null;
}) {
  if (!away.teamStats || !home.teamStats) return null;
  const a = {
    ...away.teamStats,
    pts: awayScore != null ? String(awayScore) : "—",
  };
  const h = {
    ...home.teamStats,
    pts: homeScore != null ? String(homeScore) : "—",
  };

  const num = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  // Format "43-90" or "43/90" → "43/90"
  const shoot = (v: string) => v.replace("-", "/");
  const pct = (v: string) => (v !== "—" ? `${v}%` : "—");

  type Row = {
    label: string;
    awayVal: string;
    homeVal: string;
    awayNum: number | null;
    homeNum: number | null;
    lowerIsBetter?: boolean;
    dim?: boolean; // sub-row (lighter style)
    sep?: boolean; // visual separator before this row
  };

  const rows: Row[] = [
    {
      label: "Points",
      awayVal: a.pts,
      homeVal: h.pts,
      awayNum: num(a.pts),
      homeNum: num(h.pts),
    },
    {
      label: "Rebonds",
      awayVal: a.reb,
      homeVal: h.reb,
      awayNum: num(a.reb),
      homeNum: num(h.reb),
    },
    {
      label: "↳ Offensifs",
      awayVal: a.oreb,
      homeVal: h.oreb,
      awayNum: num(a.oreb),
      homeNum: num(h.oreb),
      dim: true,
    },
    {
      label: "Passes décisives",
      awayVal: a.ast,
      homeVal: h.ast,
      awayNum: num(a.ast),
      homeNum: num(h.ast),
    },
    {
      label: "Interceptions",
      awayVal: a.stl,
      homeVal: h.stl,
      awayNum: num(a.stl),
      homeNum: num(h.stl),
    },
    {
      label: "Contres",
      awayVal: a.blk,
      homeVal: h.blk,
      awayNum: num(a.blk),
      homeNum: num(h.blk),
    },
    {
      label: "Pertes de balle",
      awayVal: a.to,
      homeVal: h.to,
      awayNum: num(a.to),
      homeNum: num(h.to),
      lowerIsBetter: true,
    },
    {
      label: "Fautes",
      awayVal: a.pf,
      homeVal: h.pf,
      awayNum: num(a.pf),
      homeNum: num(h.pf),
      lowerIsBetter: true,
    },
    {
      label: "Tirs (FG)",
      awayVal: shoot(a.fg),
      homeVal: shoot(h.fg),
      awayNum: num(a.fgPct),
      homeNum: num(h.fgPct),
      sep: true,
    },
    {
      label: "FG%",
      awayVal: pct(a.fgPct),
      homeVal: pct(h.fgPct),
      awayNum: num(a.fgPct),
      homeNum: num(h.fgPct),
      dim: true,
    },
    {
      label: "3 Points",
      awayVal: shoot(a.threePt),
      homeVal: shoot(h.threePt),
      awayNum: num(a.threePtPct),
      homeNum: num(h.threePtPct),
    },
    {
      label: "3P%",
      awayVal: pct(a.threePtPct),
      homeVal: pct(h.threePtPct),
      awayNum: num(a.threePtPct),
      homeNum: num(h.threePtPct),
      dim: true,
    },
    {
      label: "Lancers francs",
      awayVal: shoot(a.ft),
      homeVal: shoot(h.ft),
      awayNum: num(a.ftPct),
      homeNum: num(h.ftPct),
    },
    {
      label: "LF%",
      awayVal: pct(a.ftPct),
      homeVal: pct(h.ftPct),
      awayNum: num(a.ftPct),
      homeNum: num(h.ftPct),
      dim: true,
    },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm">Stats par équipe</h3>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span style={{ color: awayColor }}>{away.abbr}</span>
          <span className="text-white/20">·</span>
          <span style={{ color: homeColor }}>{home.abbr}</span>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider border-b border-white/[0.04]">
            <th
              className="text-right px-5 py-2 font-semibold w-[38%]"
              style={{ color: awayColor }}
            >
              {away.abbr}
            </th>
            <th className="text-center px-3 py-2 font-medium text-white/20 w-[24%]">
              Stat
            </th>
            <th
              className="text-left px-5 py-2 font-semibold w-[38%]"
              style={{ color: homeColor }}
            >
              {home.abbr}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const awayBetter =
              row.awayNum !== null &&
              row.homeNum !== null &&
              (row.lowerIsBetter
                ? row.awayNum < row.homeNum
                : row.awayNum > row.homeNum);
            const homeBetter =
              row.awayNum !== null &&
              row.homeNum !== null &&
              (row.lowerIsBetter
                ? row.homeNum < row.awayNum
                : row.homeNum > row.awayNum);

            return (
              <tr
                key={row.label}
                className={`border-b border-white/[0.03] ${row.sep ? "border-t border-t-white/[0.06]" : ""}`}
              >
                <td
                  className={`text-right px-5 py-2 font-mono tabular-nums ${
                    row.dim ? "text-xs text-white/30" : "text-sm"
                  } ${awayBetter ? "text-white font-semibold" : row.dim ? "" : "text-white/50"}`}
                >
                  {row.awayVal}
                </td>
                <td
                  className={`text-center px-3 py-2 ${
                    row.dim
                      ? "text-[10px] text-white/20"
                      : "text-xs text-white/30"
                  }`}
                >
                  {row.label}
                </td>
                <td
                  className={`text-left px-5 py-2 font-mono tabular-nums ${
                    row.dim ? "text-xs text-white/30" : "text-sm"
                  } ${homeBetter ? "text-white font-semibold" : row.dim ? "" : "text-white/50"}`}
                >
                  {row.homeVal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MatchPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const game = await prisma.game.findUnique({
    where: { id },
    select: {
      id: true,
      espnId: true,
      gameDate: true,
      status: true,
      homeScore: true,
      awayScore: true,
      homeTeam: {
        select: {
          abbr: true,
          city: true,
          name: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          slug: true,
        },
      },
      awayTeam: {
        select: {
          abbr: true,
          city: true,
          name: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
          slug: true,
        },
      },
    },
  });

  if (!game) notFound();

  const isFinal = game.status === "final";
  const isLive = game.status === "in_progress";
  const isScheduled = game.status === "scheduled";

  // Try DB first (cron-synced), fallback ESPN API for fresh/live games
  const dbBoxScore = !isScheduled
    ? await loadBoxScoreFromDb(game.id, game.awayTeam.abbr, game.homeTeam.abbr)
    : null;

  const espnData =
    !isScheduled && !dbBoxScore ? await fetchEspnBoxScore(game.espnId) : null;

  const boxScore = dbBoxScore
    ? { away: dbBoxScore.away, home: dbBoxScore.home }
    : espnData && isFinal
      ? parsePlayerStats(espnData, game.awayTeam.abbr, game.homeTeam.abbr)
      : null;

  // Quarter scores : DB en priorité, sinon ESPN header
  const competition = espnData?.header?.competitions?.[0];
  const awayComp = competition?.competitors?.find((c) => c.homeAway === "away");
  const homeComp = competition?.competitors?.find((c) => c.homeAway === "home");

  const quarters = dbBoxScore?.linescores
    ? dbBoxScore.linescores.away.map((awayQ, i) => ({
        q: i + 1,
        away: String(awayQ),
        home: String(dbBoxScore.linescores!.home[i] ?? "—"),
      }))
    : awayComp?.linescores?.map((ls, i) => ({
        q: i + 1,
        away: ls.displayValue ?? "—",
        home: homeComp?.linescores?.[i]?.displayValue ?? "—",
      }));

  const homeWon = isFinal && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = isFinal && (game.awayScore ?? 0) > (game.homeScore ?? 0);

  const gameDate = new Date(game.gameDate);
  const displayDate = gameDate.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-white/30">
        <Link
          href={`/${locale}/matchs`}
          className="hover:text-white/60 transition"
        >
          Matchs
        </Link>
        <span>/</span>
        <span className="text-white/50">
          {game.awayTeam.abbr} @ {game.homeTeam.abbr}
        </span>
      </div>

      {/* Score header */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] px-6 py-8">
        <div className="flex items-center justify-between gap-6">
          {/* Away team */}
          <Link
            href={`/${locale}/equipes/${game.awayTeam.slug}`}
            className="flex flex-col items-center gap-3 flex-1 group"
          >
            <TeamLogo
              logoUrl={game.awayTeam.logoUrl}
              abbr={game.awayTeam.abbr}
              size={64}
            />
            <div className="text-center">
              <div className="text-xs text-white/40 font-mono">
                {game.awayTeam.city}
              </div>
              <div
                className={`font-display font-semibold text-base group-hover:opacity-80 transition ${awayWon ? "text-white" : "text-white/60"}`}
              >
                {game.awayTeam.name}
              </div>
            </div>
          </Link>

          {/* Score center */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            {isFinal || isLive ? (
              <div className="flex items-center gap-3">
                <span
                  className={`font-display font-bold text-5xl tabular-nums tracking-tight ${awayWon ? "text-white" : "text-white/40"}`}
                >
                  {game.awayScore ?? "–"}
                </span>
                <span className="text-white/20 text-2xl">—</span>
                <span
                  className={`font-display font-bold text-5xl tabular-nums tracking-tight ${homeWon ? "text-white" : "text-white/40"}`}
                >
                  {game.homeScore ?? "–"}
                </span>
              </div>
            ) : (
              <div className="font-mono text-white/30 text-2xl">vs</div>
            )}

            <div className="flex flex-col items-center gap-1">
              {isFinal && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                  Final
                </span>
              )}
              {isLive && (
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En cours
                </span>
              )}
              <span className="text-[11px] text-white/25 capitalize">
                {displayDate}
              </span>
            </div>
          </div>

          {/* Home team */}
          <Link
            href={`/${locale}/equipes/${game.homeTeam.slug}`}
            className="flex flex-col items-center gap-3 flex-1 group"
          >
            <TeamLogo
              logoUrl={game.homeTeam.logoUrl}
              abbr={game.homeTeam.abbr}
              size={64}
            />
            <div className="text-center">
              <div className="text-xs text-white/40 font-mono">
                {game.homeTeam.city}
              </div>
              <div
                className={`font-display font-semibold text-base group-hover:opacity-80 transition ${homeWon ? "text-white" : "text-white/60"}`}
              >
                {game.homeTeam.name}
              </div>
            </div>
          </Link>
        </div>

        {/* Quarter scores */}
        {quarters && quarters.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <div className="overflow-x-auto">
              <table className="mx-auto text-xs font-mono tabular-nums">
                <thead>
                  <tr className="text-[10px] text-white/25 uppercase tracking-wider">
                    <th className="text-left pr-6 py-1 font-medium">Équipe</th>
                    {quarters.map((q) => (
                      <th
                        key={q.q}
                        className="text-center px-3 py-1 font-medium"
                      >
                        {q.q <= 4 ? `Q${q.q}` : `OT${q.q - 4}`}
                      </th>
                    ))}
                    <th className="text-center px-3 py-1 font-medium text-white/50">
                      T
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pr-6 py-1.5 text-white/50">
                      {game.awayTeam.abbr}
                    </td>
                    {quarters.map((q) => (
                      <td
                        key={q.q}
                        className="text-center px-3 py-1.5 text-white/60"
                      >
                        {q.away}
                      </td>
                    ))}
                    <td
                      className={`text-center px-3 py-1.5 font-semibold ${awayWon ? "text-white" : "text-white/40"}`}
                    >
                      {game.awayScore ?? "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-6 py-1.5 text-white/50">
                      {game.homeTeam.abbr}
                    </td>
                    {quarters.map((q) => (
                      <td
                        key={q.q}
                        className="text-center px-3 py-1.5 text-white/60"
                      >
                        {q.home}
                      </td>
                    ))}
                    <td
                      className={`text-center px-3 py-1.5 font-semibold ${homeWon ? "text-white" : "text-white/40"}`}
                    >
                      {game.homeScore ?? "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Box score */}
      {isScheduled && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] py-12 flex flex-col items-center gap-3">
          <div className="text-3xl opacity-20">📋</div>
          <p className="text-white/30 text-sm">Match non commencé</p>
          <p className="text-white/20 text-xs">
            Le box score sera disponible après la rencontre
          </p>
        </div>
      )}

      {(isLive || isFinal) && !boxScore && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] py-12 flex flex-col items-center gap-3">
          <div className="text-3xl opacity-20">📊</div>
          <p className="text-white/30 text-sm">Statistiques non disponibles</p>
          <p className="text-white/20 text-xs">
            Les données ESPN n&apos;ont pas pu être récupérées
          </p>
        </div>
      )}

      {/* Team stats comparison */}
      {boxScore && (
        <TeamStatsComparison
          away={boxScore.away}
          home={boxScore.home}
          awayColor={game.awayTeam.primaryColor}
          homeColor={game.homeTeam.primaryColor}
          awayScore={game.awayScore}
          homeScore={game.homeScore}
        />
      )}

      {boxScore && (
        <div className="space-y-4">
          <h2 className="font-display font-semibold text-lg tracking-tight">
            Box score
          </h2>
          <PlayerTable
            team={boxScore.away}
            primaryColor={game.awayTeam.primaryColor}
            teamName={`${game.awayTeam.city} ${game.awayTeam.name}`}
          />
          <PlayerTable
            team={boxScore.home}
            primaryColor={game.homeTeam.primaryColor}
            teamName={`${game.homeTeam.city} ${game.homeTeam.name}`}
          />
        </div>
      )}

      {/* Source note */}
      <p className="text-[11px] text-white/20 leading-relaxed">
        Statistiques issues de l&apos;API ESPN (site.api.espn.com) ·{" "}
        <Link
          href={`/${locale}/sources`}
          className="hover:text-white/40 transition underline underline-offset-2"
        >
          Sources & Méthodologie
        </Link>
      </p>
    </div>
  );
}
