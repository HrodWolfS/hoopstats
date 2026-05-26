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

type TeamBoxScore = {
  abbr: string;
  players: PlayerRow[];
  totals: {
    pts: string;
    reb: string;
    ast: string;
    stl: string;
    blk: string;
    to: string;
    fg: string;
    threePt: string;
    ft: string;
  } | null;
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

  function parseTeam(raw: EspnPlayerTeam, abbr: string): TeamBoxScore {
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

    // Team totals from boxscore.teams
    const teamData = espn.boxscore?.teams?.find(
      (t) => (t.team?.abbreviation ?? "").toLowerCase() === abbr.toLowerCase(),
    );
    const tStats = teamData?.statistics;
    const tGet = (label: string) =>
      tStats?.find(
        (s) =>
          s.label?.toLowerCase() === label.toLowerCase() ||
          s.name?.toLowerCase().includes(label.toLowerCase()),
      )?.displayValue ?? "—";

    const totals = tStats
      ? {
          pts: tGet("PTS"),
          reb: tGet("REB"),
          ast: tGet("AST"),
          stl: tGet("STL"),
          blk: tGet("BLK"),
          to: tGet("TO"),
          fg: tGet("FG"),
          threePt: tGet("3PT"),
          ft: tGet("FT"),
        }
      : null;

    return { abbr, players, totals };
  }

  // ESPN players[0] = away, players[1] = home (by ESPN convention)
  const awayRaw = playersData[0];
  const homeRaw = playersData[1];

  return {
    away: parseTeam(awayRaw, awayAbbr),
    home: parseTeam(homeRaw, homeAbbr),
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
            {team.totals && (
              <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                <td className="px-4 py-2.5 sticky left-0 bg-[#18181c] z-10">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">
                    Total
                  </span>
                </td>
                {cols.map((c) => {
                  const totalsKey = c.key as keyof typeof team.totals;
                  const val =
                    team.totals && totalsKey in team.totals
                      ? team.totals[
                          totalsKey as keyof NonNullable<typeof team.totals>
                        ]
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

  // Fetch ESPN box score for finished or live games
  const espnData = !isScheduled ? await fetchEspnBoxScore(game.espnId) : null;

  const boxScore =
    espnData && isFinal
      ? parsePlayerStats(espnData, game.awayTeam.abbr, game.homeTeam.abbr)
      : null;

  // Quarter scores from ESPN header
  const competition = espnData?.header?.competitions?.[0];
  const awayComp = competition?.competitors?.find((c) => c.homeAway === "away");
  const homeComp = competition?.competitors?.find((c) => c.homeAway === "home");
  const quarters = awayComp?.linescores?.map((ls, i) => ({
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
    timeZone: "America/New_York",
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
