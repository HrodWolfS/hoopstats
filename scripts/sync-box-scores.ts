/**
 * Sync des box scores ESPN pour les matchs terminés
 *
 * Pour chaque Game `status = "final"` sans GameBoxScore associé,
 * fetch le summary ESPN et persiste :
 *   - GameBoxScore (totaux équipe + linescores)
 *   - PlayerBoxScore (1 ligne par joueur par match)
 *
 * Run manuel :
 *   pnpm tsx scripts/sync-box-scores.ts            → tous les matchs sans box score
 *   pnpm tsx scripts/sync-box-scores.ts --recent   → 7 derniers jours uniquement
 *   pnpm tsx scripts/sync-box-scores.ts --force    → re-sync même si déjà présent
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

// ── Types ESPN ────────────────────────────────────────────────────────────────

type EspnStat = { name?: string; displayValue?: string; label?: string };

type EspnAthlete = {
  athlete?: {
    displayName?: string;
    jersey?: string;
    position?: { abbreviation?: string };
  };
  stats?: string[];
  starter?: boolean;
  didNotPlay?: boolean;
  reason?: string | null;
};

type EspnSummary = {
  header?: {
    competitions?: Array<{
      competitors?: Array<{
        homeAway?: string;
        linescores?: Array<{ displayValue?: string; value?: number }>;
        team?: { abbreviation?: string };
      }>;
    }>;
  };
  boxscore?: {
    teams?: Array<{
      team?: { abbreviation?: string };
      statistics?: EspnStat[];
    }>;
    players?: Array<{
      team?: { abbreviation?: string };
      statistics?: Array<{
        names?: string[];
        athletes?: EspnAthlete[];
      }>;
    }>;
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Récupère un stat équipe par patterns sur label ou name. */
function pickTeamStat(
  stats: EspnStat[] | undefined,
  patterns: string[],
): string | null {
  if (!stats) return null;
  const found = stats.find((s) => {
    const label = (s.label ?? "").toLowerCase();
    const name = (s.name ?? "").toLowerCase();
    return patterns.some((p) => {
      const lp = p.toLowerCase();
      return label === lp || name === lp;
    });
  });
  return found?.displayValue ?? null;
}

function toInt(v: string | null | undefined): number | null {
  if (v == null || v === "" || v === "—") return null;
  const n = parseInt(v.replace("+", ""), 10);
  return isNaN(n) ? null : n;
}

/** Parse "43-90" ou "43/90" → { made: 43, att: 90 }. */
function parseShootingPair(v: string | null): {
  made: number | null;
  att: number | null;
} {
  if (!v) return { made: null, att: null };
  const m = v.match(/^(\d+)[-/](\d+)$/);
  if (!m) return { made: null, att: null };
  return { made: parseInt(m[1], 10), att: parseInt(m[2], 10) };
}

function parseLinescores(
  arr: Array<{ displayValue?: string; value?: number }> | undefined,
): number[] | null {
  if (!arr || arr.length === 0) return null;
  return arr.map((q) => {
    const v = q.value;
    if (typeof v === "number") return v;
    const d = parseInt(q.displayValue ?? "0", 10);
    return isNaN(d) ? 0 : d;
  });
}

// ── ESPN fetch ────────────────────────────────────────────────────────────────

async function fetchEspnSummary(espnId: string): Promise<EspnSummary | null> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnId}`,
    );
    if (!res.ok) return null;
    return (await res.json()) as EspnSummary;
  } catch {
    return null;
  }
}

// ── Parse team totals ─────────────────────────────────────────────────────────

type TeamTotals = {
  reb: number | null;
  oreb: number | null;
  dreb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  pf: number | null;
  fgm: number | null;
  fga: number | null;
  threePm: number | null;
  threePa: number | null;
  ftm: number | null;
  fta: number | null;
};

function parseTeamTotals(stats: EspnStat[] | undefined): TeamTotals {
  const fg = parseShootingPair(
    pickTeamStat(stats, ["FG", "fieldGoalsMade-fieldGoalsAttempted"]),
  );
  const three = parseShootingPair(
    pickTeamStat(stats, [
      "3PT",
      "threePointFieldGoalsMade-threePointFieldGoalsAttempted",
    ]),
  );
  const ft = parseShootingPair(
    pickTeamStat(stats, ["FT", "freeThrowsMade-freeThrowsAttempted"]),
  );
  return {
    reb: toInt(pickTeamStat(stats, ["Rebounds", "totalRebounds", "REB"])),
    oreb: toInt(
      pickTeamStat(stats, ["Offensive Rebounds", "offensiveRebounds", "OREB"]),
    ),
    dreb: toInt(
      pickTeamStat(stats, ["Defensive Rebounds", "defensiveRebounds", "DREB"]),
    ),
    ast: toInt(pickTeamStat(stats, ["Assists", "assists", "AST"])),
    stl: toInt(pickTeamStat(stats, ["Steals", "steals", "STL"])),
    blk: toInt(pickTeamStat(stats, ["Blocks", "blocks", "BLK"])),
    tov: toInt(pickTeamStat(stats, ["Turnovers", "turnovers", "TO"])),
    pf: toInt(pickTeamStat(stats, ["Fouls", "fouls", "PF", "teamFouls"])),
    fgm: fg.made,
    fga: fg.att,
    threePm: three.made,
    threePa: three.att,
    ftm: ft.made,
    fta: ft.att,
  };
}

// ── Parse player rows ─────────────────────────────────────────────────────────

type PlayerRow = {
  playerName: string;
  teamAbbr: string;
  jersey: string | null;
  position: string | null;
  starter: boolean;
  didNotPlay: boolean;
  dnpReason: string | null;
  minutes: string | null;
  pts: number | null;
  reb: number | null;
  oreb: number | null;
  dreb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  pf: number | null;
  fgm: number | null;
  fga: number | null;
  threePm: number | null;
  threePa: number | null;
  ftm: number | null;
  fta: number | null;
  plusMinus: number | null;
};

function parsePlayers(
  espn: EspnSummary,
  awayDbAbbr: string,
  homeDbAbbr: string,
): PlayerRow[] {
  const rows: PlayerRow[] = [];
  const playersData = espn.boxscore?.players ?? [];

  // [0] = away, [1] = home par convention ESPN
  playersData.forEach((teamBlock, i) => {
    const teamAbbr = i === 0 ? awayDbAbbr : homeDbAbbr;
    const stats = teamBlock.statistics?.[0];
    const names = stats?.names ?? [];
    const idx = (col: string) => names.indexOf(col);

    (stats?.athletes ?? []).forEach((a) => {
      const s = a.stats ?? [];
      const get = (col: string): string | null => {
        const i = idx(col);
        if (i < 0) return null;
        return s[i] ?? null;
      };

      const fg = parseShootingPair(get("FG"));
      const three = parseShootingPair(get("3PT"));
      const ft = parseShootingPair(get("FT"));

      rows.push({
        playerName: a.athlete?.displayName ?? "—",
        teamAbbr,
        jersey: a.athlete?.jersey ?? null,
        position: a.athlete?.position?.abbreviation ?? null,
        starter: a.starter ?? false,
        didNotPlay: a.didNotPlay ?? false,
        dnpReason: a.reason ?? null,
        minutes: get("MIN"),
        pts: toInt(get("PTS")),
        reb: toInt(get("REB")),
        oreb: toInt(get("OREB")),
        dreb: toInt(get("DREB")),
        ast: toInt(get("AST")),
        stl: toInt(get("STL")),
        blk: toInt(get("BLK")),
        tov: toInt(get("TO")),
        pf: toInt(get("PF")),
        fgm: fg.made,
        fga: fg.att,
        threePm: three.made,
        threePa: three.att,
        ftm: ft.made,
        fta: ft.att,
        plusMinus: toInt(get("+/-")),
      });
    });
  });

  return rows;
}

// ── Sync principal ────────────────────────────────────────────────────────────

export async function syncBoxScores(
  opts: {
    recent?: boolean;
    force?: boolean;
  } = {},
): Promise<{ synced: number; skipped: number; errors: number }> {
  const where: {
    status: string;
    gameDate?: { gte: Date };
    boxScore?: { is: null };
  } = { status: "final" };

  if (opts.recent) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    where.gameDate = { gte: sevenDaysAgo };
  }

  if (!opts.force) {
    where.boxScore = { is: null };
  }

  const games = await prisma.game.findMany({
    where,
    select: {
      id: true,
      espnId: true,
      homeTeam: { select: { abbr: true } },
      awayTeam: { select: { abbr: true } },
    },
    orderBy: { gameDate: "desc" },
  });

  if (games.length === 0) {
    console.log("ℹ️  Aucun match à synchroniser");
    return { synced: 0, skipped: 0, errors: 0 };
  }

  console.log(`📊 ${games.length} matchs à synchroniser`);

  let synced = 0;
  let errors = 0;

  for (const game of games) {
    const espn = await fetchEspnSummary(game.espnId);
    if (!espn?.boxscore) {
      console.warn(`  ⚠️  ESPN data manquante pour ${game.espnId}`);
      errors++;
      continue;
    }

    try {
      // Linescores (header.competitions[0].competitors)
      const competitors = espn.header?.competitions?.[0]?.competitors ?? [];
      const awayComp = competitors.find((c) => c.homeAway === "away");
      const homeComp = competitors.find((c) => c.homeAway === "home");
      const awayLines = parseLinescores(awayComp?.linescores);
      const homeLines = parseLinescores(homeComp?.linescores);

      // Team totals — players[0]=away, [1]=home par convention
      const awayTotals = parseTeamTotals(espn.boxscore.teams?.[0]?.statistics);
      const homeTotals = parseTeamTotals(espn.boxscore.teams?.[1]?.statistics);

      // Player rows
      const players = parsePlayers(
        espn,
        game.awayTeam.abbr,
        game.homeTeam.abbr,
      );

      // Transaction : tout ou rien
      await prisma.$transaction([
        // Wipe avant rewrite si --force
        prisma.playerBoxScore.deleteMany({ where: { gameId: game.id } }),
        prisma.gameBoxScore.deleteMany({ where: { gameId: game.id } }),
        // Création
        prisma.gameBoxScore.create({
          data: {
            gameId: game.id,
            awayLinescores: awayLines ?? undefined,
            homeLinescores: homeLines ?? undefined,
            awayReb: awayTotals.reb,
            awayOreb: awayTotals.oreb,
            awayDreb: awayTotals.dreb,
            awayAst: awayTotals.ast,
            awayStl: awayTotals.stl,
            awayBlk: awayTotals.blk,
            awayTov: awayTotals.tov,
            awayPf: awayTotals.pf,
            awayFgm: awayTotals.fgm,
            awayFga: awayTotals.fga,
            awayThreePm: awayTotals.threePm,
            awayThreePa: awayTotals.threePa,
            awayFtm: awayTotals.ftm,
            awayFta: awayTotals.fta,
            homeReb: homeTotals.reb,
            homeOreb: homeTotals.oreb,
            homeDreb: homeTotals.dreb,
            homeAst: homeTotals.ast,
            homeStl: homeTotals.stl,
            homeBlk: homeTotals.blk,
            homeTov: homeTotals.tov,
            homePf: homeTotals.pf,
            homeFgm: homeTotals.fgm,
            homeFga: homeTotals.fga,
            homeThreePm: homeTotals.threePm,
            homeThreePa: homeTotals.threePa,
            homeFtm: homeTotals.ftm,
            homeFta: homeTotals.fta,
          },
        }),
        prisma.playerBoxScore.createMany({
          data: players.map((p) => ({ ...p, gameId: game.id })),
        }),
      ]);

      synced++;
      if (synced % 10 === 0) {
        console.log(`  ✅ ${synced}/${games.length} matchs synchronisés…`);
      }

      // Politesse — éviter de marteler ESPN
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ❌ Erreur ${game.espnId} : ${msg}`);
      errors++;
    }
  }

  console.log(`\n✅ Sync terminée : ${synced} ok, ${errors} erreurs`);
  return { synced, skipped: 0, errors };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const opts = {
    recent: args.includes("--recent"),
    force: args.includes("--force"),
  };

  console.log(
    `📊 Box score sync — ${opts.recent ? "7 derniers jours" : "tous les matchs"}${opts.force ? " (FORCE)" : ""}\n`,
  );

  const start = Date.now();
  try {
    await syncBoxScores(opts);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`⏱  ${elapsed}s`);
  } catch (e) {
    console.error("❌ Sync échouée :", e);
    process.exit(1);
  }
}

// Run only if invoked directly (not when imported by sync-daily.ts)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().finally(() => prisma.$disconnect());
}
