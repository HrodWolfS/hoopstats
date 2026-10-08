import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShareButton } from "@/components/analytics/share-button";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { periodLabel } from "@/lib/game-status";
import {
  capitalizeFirst,
  checkScore,
  dayKeyOf,
  dayShort,
  dayTitle,
  hasBlockingIssue,
  LEADER_STATS,
  overtimeLabel,
  pickLeaders,
  SCORE_ISSUE_LABELS,
  type LeaderLine,
} from "@/lib/schedule";
import { frDecimal, pct as formatPct } from "@/lib/format";
import { nightLabel } from "@/lib/stats/night";
import { SourceNote } from "@/components/ui/source-note";

export const revalidate = 300;

// Aucun match pré-rendu au build : chacun est généré à la première visite puis
// gardé en cache (ISR). Sans cette fonction, la page serait rendue à chaque visite.
export function generateStaticParams() {
  return [];
}

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
  slug: string | null;
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
      slug: null,
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
      include: { player: { select: { slug: true } } },
      orderBy: [{ starter: "desc" }, { pts: "desc" }],
    }),
  ]);

  if (!gbs || players.length === 0) return null;

  const fmtNum = (v: number | null): string => (v == null ? "—" : String(v));
  const fmtPair = (m: number | null, a: number | null): string =>
    m == null || a == null ? "—" : `${m}/${a}`;
  const fmtPct = (m: number | null, a: number | null): string =>
    m == null || a == null || a === 0 ? "—" : formatPct(m / a);
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
        slug: p.player?.slug ?? null,
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
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
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
    alternates: { canonical: `/${locale}/matchs/${id}` },
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
  locale,
}: {
  team: TeamBoxScore;
  primaryColor: string;
  teamName: string;
  locale: string;
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
            {player.slug ? (
              <Link href={`/${locale}/joueurs/${player.slug}`} className="text-xs text-white/80 font-medium truncate hover:text-orange-300">
                {player.name}
              </Link>
            ) : (
              <span className="text-xs text-white/80 font-medium truncate">{player.name}</span>
            )}
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
  const pct = (v: string) => (v !== "—" ? `${frDecimal(v)} %` : "—");

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

function toLeaderLine(player: PlayerRow): LeaderLine {
  const value = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return { name: player.name, slug: player.slug, pts: value(player.pts), reb: value(player.reb), ast: value(player.ast) };
}

/** Meilleur joueur de chaque équipe en points, rebonds et passes. */
function GameLeaders({
  away,
  home,
  awayAbbr,
  homeAbbr,
  locale,
}: {
  away: TeamBoxScore;
  home: TeamBoxScore;
  awayAbbr: string;
  homeAbbr: string;
  locale: string;
}) {
  const played = (team: TeamBoxScore) => team.players.filter((player) => !player.didNotPlay).map(toLeaderLine);
  const leaders = { away: pickLeaders(played(away)), home: pickLeaders(played(home)) };
  const cell = (side: "away" | "home", key: (typeof LEADER_STATS)[number]["key"]) => {
    const leader = leaders[side][key];
    if (!leader) return <span className="text-white/25">—</span>;
    return (
      <span className="[overflow-wrap:anywhere]">
        {leader.players.map((player, index) => (
          <span key={player.name}>
            {index > 0 && ", "}
            {player.slug ? (
              <Link href={`/${locale}/joueurs/${player.slug}`} className="text-white/80 hover:text-orange-300 hover:underline">
                {player.name}
              </Link>
            ) : (
              <span className="text-white/80">{player.name}</span>
            )}
          </span>
        ))}{" "}
        <span className="font-mono tabular-nums text-white">{leader.value}</span>
      </span>
    );
  };
  return (
    <section aria-labelledby="leaders-titre" className="space-y-3">
      <h2 id="leaders-titre" className="font-display font-semibold text-lg tracking-tight">
        Meilleurs du match
      </h2>
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-white/35 font-mono">
              <th className="w-[4.5rem] sm:w-28 px-3 py-2 text-left font-medium">Stat</th>
              <th className="px-2 py-2 text-left font-medium">{awayAbbr}</th>
              <th className="px-2 py-2 text-left font-medium">{homeAbbr}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {LEADER_STATS.map(({ key, label }) => (
              <tr key={key} className="align-top">
                <th scope="row" className="px-3 py-2.5 text-left text-xs font-normal text-white/45">{label}</th>
                <td className="px-2 py-2.5">{cell("away", key)}</td>
                <td className="px-2 py-2.5">{cell("home", key)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

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
  const isPostponed = game.status === "postponed";

  // Try DB first (cron-synced), fallback ESPN API for fresh/live games.
  // Un match programmé ou reporté n'a jamais de box score.
  const hasBoxScore = !isScheduled && !isPostponed;
  const dbBoxScore = hasBoxScore
    ? await loadBoxScoreFromDb(game.id, game.awayTeam.abbr, game.homeTeam.abbr)
    : null;

  const espnData =
    hasBoxScore && !dbBoxScore ? await fetchEspnBoxScore(game.espnId) : null;

  const boxScore = dbBoxScore
    ? { away: dbBoxScore.away, home: dbBoxScore.home }
    : espnData && isFinal
      ? parsePlayerStats(espnData, game.awayTeam.abbr, game.homeTeam.abbr)
      : null;

  const playerPointsTotal = (team: TeamBoxScore): number =>
    team.players.reduce((total, player) => {
      const points = Number.parseInt(player.pts, 10);
      return total + (Number.isFinite(points) ? points : 0);
    }, 0);

  // Contrôle du score avant affichage (lib/schedule.ts, règles sur /sources#matchs).
  const scoreIssues = checkScore({
    status: game.status,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    homeLinescores: dbBoxScore?.linescores?.home ?? null,
    awayLinescores: dbBoxScore?.linescores?.away ?? null,
    homePlayerPoints: boxScore ? playerPointsTotal(boxScore.home) : null,
    awayPlayerPoints: boxScore ? playerPointsTotal(boxScore.away) : null,
  });
  const scoreUnverified = hasBlockingIssue(scoreIssues);
  const hasIncompletePlayerTotals = scoreIssues.includes("player_points_mismatch");

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

  const decided = isFinal && !scoreUnverified;
  const homeWon = decided && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = decided && (game.awayScore ?? 0) > (game.homeScore ?? 0);
  const overtime = isFinal && quarters ? overtimeLabel(quarters.length) : null;
  const dayKey = dayKeyOf(game.gameDate);
  const parisTime = game.gameDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

  // Journée NBA (date de New York), comme la page Matchs et le fil d'Ariane.
  const displayDate = dayTitle(dayKey);
  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hoopstats.fr";
  const jsonLdGame = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${game.awayTeam.city} ${game.awayTeam.name} @ ${game.homeTeam.city} ${game.homeTeam.name}`,
    startDate: game.gameDate.toISOString(),
    url: `${BASE_URL}/${locale}/matchs/${id}`,
    eventStatus: isFinal
      ? "https://schema.org/EventCompleted"
      : isLive
        ? "https://schema.org/EventInProgress"
        : "https://schema.org/EventScheduled",
    awayTeam: {
      "@type": "SportsTeam",
      name: `${game.awayTeam.city} ${game.awayTeam.name}`,
      url: `${BASE_URL}/${locale}/equipes/${game.awayTeam.slug}`,
    },
    homeTeam: {
      "@type": "SportsTeam",
      name: `${game.homeTeam.city} ${game.homeTeam.name}`,
      url: `${BASE_URL}/${locale}/equipes/${game.homeTeam.slug}`,
    },
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/30">
        <Link
          href={`/${locale}/matchs`}
          className="hover:text-white/60 transition"
        >
          Matchs
        </Link>
        <span>/</span>
        <Link
          href={`/${locale}/matchs?date=${dayKey}`}
          className="hover:text-white/60 transition"
        >
          Journée du {dayShort(dayKey)}
        </Link>
        <span>/</span>
        <span className="text-white/50">
          {game.awayTeam.abbr} @ {game.homeTeam.abbr}
        </span>
      </div>
      <ShareButton dimension="game" />
      </div>

      {/* Titre de la page pour les lecteurs d'écran et les moteurs : le
          bandeau de score le montre déjà visuellement. */}
      <h1 className="sr-only">
        {game.awayTeam.city} {game.awayTeam.name} – {game.homeTeam.city}{" "}
        {game.homeTeam.name}, {displayDate}
      </h1>

      {/* Score header */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] px-3 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          {/* Away team */}
          <Link
            href={`/${locale}/equipes/${game.awayTeam.slug}`}
            className="flex flex-col items-center gap-3 flex-1 min-w-0 group"
          >
            <TeamLogo
              logoUrl={game.awayTeam.logoUrl}
              abbr={game.awayTeam.abbr}
              size={64}
            />
            <div className="text-center max-w-full break-words">
              <div className="text-xs text-white/40 font-mono">
                {game.awayTeam.city}
              </div>
              <div
                className={`font-display font-semibold text-sm sm:text-base break-words group-hover:opacity-80 transition ${awayWon ? "text-white" : "text-white/60"}`}
              >
                {game.awayTeam.name}
              </div>
            </div>
          </Link>

          {/* Score center */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            {isFinal || isLive ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <span
                  className={`font-display font-bold text-4xl sm:text-5xl tabular-nums tracking-tight ${awayWon ? "text-white" : "text-white/40"}`}
                >
                  {game.awayScore ?? "–"}
                </span>
                <span className="text-white/20 text-xl sm:text-2xl">—</span>
                <span
                  className={`font-display font-bold text-4xl sm:text-5xl tabular-nums tracking-tight ${homeWon ? "text-white" : "text-white/40"}`}
                >
                  {game.homeScore ?? "–"}
                </span>
              </div>
            ) : (
              <div className="font-mono text-white/30 text-2xl">vs</div>
            )}

            <div className="flex flex-col items-center gap-1">
              {isFinal && !scoreUnverified && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                  Final{overtime ? ` · ${overtime}` : ""}
                </span>
              )}
              {scoreUnverified && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80">
                  Score à vérifier
                </span>
              )}
              {isScheduled && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
                  À venir · {parisTime} à Paris
                </span>
              )}
              {isLive && (
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En cours
                </span>
              )}
              {isPostponed && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/70">
                  Reporté
                </span>
              )}
              <span className="text-[11px] text-white/35 text-center">
                {capitalizeFirst(displayDate)}
                <br />
                <span className="text-white/25">{nightLabel(dayKey)} en France</span>
              </span>
            </div>
          </div>

          {/* Home team */}
          <Link
            href={`/${locale}/equipes/${game.homeTeam.slug}`}
            className="flex flex-col items-center gap-3 flex-1 min-w-0 group"
          >
            <TeamLogo
              logoUrl={game.homeTeam.logoUrl}
              abbr={game.homeTeam.abbr}
              size={64}
            />
            <div className="text-center max-w-full break-words">
              <div className="text-xs text-white/40 font-mono">
                {game.homeTeam.city}
              </div>
              <div
                className={`font-display font-semibold text-sm sm:text-base break-words group-hover:opacity-80 transition ${homeWon ? "text-white" : "text-white/60"}`}
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
                        {periodLabel(q.q)}
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

      <nav aria-label="Calendriers" className="flex flex-wrap gap-x-4 gap-y-1 text-sm -mt-4">
        <Link href={`/${locale}/matchs?date=${dayKey}`} className="min-h-11 flex items-center text-orange-300 hover:underline">
          Tous les matchs de la journée
        </Link>
        <Link href={`/${locale}/matchs?equipe=${game.awayTeam.abbr.toLowerCase()}`} className="min-h-11 flex items-center text-white/60 hover:text-white hover:underline">
          Calendrier {game.awayTeam.abbr}
        </Link>
        <Link href={`/${locale}/matchs?equipe=${game.homeTeam.abbr.toLowerCase()}`} className="min-h-11 flex items-center text-white/60 hover:text-white hover:underline">
          Calendrier {game.homeTeam.abbr}
        </Link>
      </nav>

      {scoreUnverified && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-5 py-4 flex items-start gap-3">
          <span className="text-amber-400/70 shrink-0">⚠</span>
          <div className="space-y-1">
            <p className="text-sm text-amber-200/80">Score en cours de vérification</p>
            <p className="text-xs text-white/40 leading-relaxed">
              {scoreIssues.filter((issue) => issue !== "player_points_mismatch").map((issue) => capitalizeFirst(SCORE_ISSUE_LABELS[issue])).join(". ")}.
              Le score est affiché tel que publié par la source, sans vainqueur, jusqu&apos;à la prochaine synchronisation.
            </p>
          </div>
        </div>
      )}

      {hasIncompletePlayerTotals && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-5 py-4 flex items-start gap-3">
          <span className="text-amber-400/70 shrink-0">⚠</span>
          <div className="space-y-1">
            <p className="text-sm text-amber-200/80">
              Box score joueurs partiellement incomplet
            </p>
            <p className="text-xs text-white/40 leading-relaxed">
              Certaines lignes individuelles sont absentes de la source ESPN.
              Le score final et les statistiques collectives restent valides.
            </p>
          </div>
        </div>
      )}

      {boxScore && isFinal && (
        <GameLeaders
          away={boxScore.away}
          home={boxScore.home}
          awayAbbr={game.awayTeam.abbr}
          homeAbbr={game.homeTeam.abbr}
          locale={locale}
        />
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
            locale={locale}
          />
          <PlayerTable
            team={boxScore.home}
            primaryColor={game.homeTeam.primaryColor}
            teamName={`${game.homeTeam.city} ${game.homeTeam.name}`}
            locale={locale}
          />
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdGame).replace(/</g, "\\u003c"),
        }}
      />
      <SourceNote origins={["games"]} locale={locale} />
    </div>
  );
}
