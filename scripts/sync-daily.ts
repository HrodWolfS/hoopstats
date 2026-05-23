/**
 * Sync quotidien — saison NBA en cours uniquement
 *
 * Ce script est déclenché chaque matin à 6h (Paris) par GitHub Actions.
 * Il met à jour :
 *   1. PlayerSeason 2025-26 (stats NBA Stats API leaguedashplayerstats)
 *   2. TeamSeason 2025-26 (standings NBA Stats API leaguestandingsv3)
 *   3. summaryFr des joueurs et équipes (régénération template)
 *   4. Invalide le cache ISR Vercel via /api/revalidate
 *
 * Run manuel: pnpm tsx scripts/sync-daily.ts
 */

import { PrismaClient } from "@prisma/client";
import { playerSlug } from "../lib/slugs";

const prisma = new PrismaClient({ log: ["error"] });

const CURRENT_SEASON = "2025-26";

const VERCEL_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

// Headers communs pour toutes les requêtes stats.nba.com
const NBA_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  Accept: "application/json",
  Referer: "https://www.nba.com/",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true",
};

// ─── NBA team name → abbr (pour standings NBA Stats API) ─────────────────────

const TEAM_NAME_TO_ABBR: Record<string, string> = {
  Celtics: "BOS",
  Nets: "BKN",
  Knicks: "NYK",
  "76ers": "PHI",
  Raptors: "TOR",
  Bulls: "CHI",
  Cavaliers: "CLE",
  Pistons: "DET",
  Pacers: "IND",
  Bucks: "MIL",
  Hawks: "ATL",
  Hornets: "CHA",
  Heat: "MIA",
  Magic: "ORL",
  Wizards: "WAS",
  Nuggets: "DEN",
  Timberwolves: "MIN",
  Thunder: "OKC",
  "Trail Blazers": "POR",
  Jazz: "UTA",
  Warriors: "GSW",
  Clippers: "LAC",
  Lakers: "LAL",
  Suns: "PHX",
  Kings: "SAC",
  Mavericks: "DAL",
  Rockets: "HOU",
  Grizzlies: "MEM",
  Pelicans: "NOP",
  Spurs: "SAS",
};

// ─── 1. Sync player stats (NBA Stats API) ────────────────────────────────────

async function syncPlayerStats(): Promise<{
  upserted: number;
  skipped: number;
}> {
  console.log("\n📊 Sync stats joueurs 2025-26 (NBA Stats API)…");

  const url =
    `https://stats.nba.com/stats/leaguedashplayerstats` +
    `?Season=${CURRENT_SEASON}&SeasonType=Regular+Season&PerMode=PerGame&LeagueID=00&MeasureType=Base`;

  const res = await fetch(url, { headers: NBA_HEADERS });

  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    console.warn(
      `  ⚠️  NBA Stats API ${res.status} — player stats skippés. Body: ${body}`,
    );
    return { upserted: 0, skipped: 0 };
  }

  const data = (await res.json()) as {
    resultSets: Array<{ name: string; headers: string[]; rowSet: unknown[][] }>;
  };

  const statsSet = data.resultSets.find(
    (r) => r.name === "LeagueDashPlayerStats",
  );
  if (!statsSet) {
    console.warn("  ⚠️  Pas de resultSet LeagueDashPlayerStats");
    return { upserted: 0, skipped: 0 };
  }

  const h = statsSet.headers;
  const iName = h.indexOf("PLAYER_NAME");
  const iTeam = h.indexOf("TEAM_ABBREVIATION");
  const iGP = h.indexOf("GP");
  const iMin = h.indexOf("MIN");
  const iPts = h.indexOf("PTS");
  const iReb = h.indexOf("REB");
  const iAst = h.indexOf("AST");
  const iStl = h.indexOf("STL");
  const iBlk = h.indexOf("BLK");
  const iFgPct = h.indexOf("FG_PCT");
  const iFg3Pct = h.indexOf("FG3_PCT");
  const iFtPct = h.indexOf("FT_PCT");

  const [dbTeams, dbPlayers] = await Promise.all([
    prisma.team.findMany({ select: { id: true, abbr: true } }),
    prisma.player.findMany({ select: { id: true, slug: true } }),
  ]);

  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));
  const playerBySlug = new Map(dbPlayers.map((p) => [p.slug, p.id]));

  console.log(`  ${statsSet.rowSet.length} lignes récupérées depuis NBA Stats`);

  let upserted = 0;
  let skipped = 0;

  for (const row of statsSet.rowSet) {
    // "LeBron James" → slug "lebron-james"
    const fullName = String(row[iName]);
    const spaceIdx = fullName.indexOf(" ");
    const firstName = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName;
    const lastName = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : "";

    const slug = playerSlug(firstName, lastName);
    const playerId = playerBySlug.get(slug);
    if (!playerId) {
      skipped++;
      continue;
    }

    const teamAbbr = String(row[iTeam]);
    const teamId = teamByAbbr.get(teamAbbr) ?? null;
    if (!teamId) {
      skipped++;
      continue;
    }

    const gamesPlayed = Number(row[iGP]) || 1;
    const minutesPerGame = Number(row[iMin]) || 0;
    const pts = Number(row[iPts]) || 0;
    const reb = Number(row[iReb]) || 0;
    const ast = Number(row[iAst]) || 0;
    const stl = Number(row[iStl]) || 0;
    const blk = Number(row[iBlk]) || 0;
    const fgPct = row[iFgPct] != null ? Number(row[iFgPct]) : undefined;
    const fg3Pct = row[iFg3Pct] != null ? Number(row[iFg3Pct]) : undefined;
    const ftPct = row[iFtPct] != null ? Number(row[iFtPct]) : undefined;

    try {
      await prisma.playerSeason.upsert({
        where: {
          playerId_season_teamId: { playerId, season: CURRENT_SEASON, teamId },
        },
        update: {
          gamesPlayed,
          minutesPerGame,
          pointsPerGame: pts,
          reboundsPerGame: reb,
          assistsPerGame: ast,
          stealsPerGame: stl,
          blocksPerGame: blk,
          fgPct,
          threePtPct: fg3Pct,
          ftPct,
        },
        create: {
          playerId,
          teamId,
          season: CURRENT_SEASON,
          gamesPlayed,
          minutesPerGame,
          pointsPerGame: pts,
          reboundsPerGame: reb,
          assistsPerGame: ast,
          stealsPerGame: stl,
          blocksPerGame: blk,
          fgPct,
          threePtPct: fg3Pct,
          ftPct,
        },
      });
      upserted++;
    } catch {
      skipped++;
    }
  }

  console.log(`  ✅ ${upserted} upserted, ${skipped} skipped`);
  return { upserted, skipped };
}

// ─── 2. Sync standings (NBA Stats API) ───────────────────────────────────────

async function syncStandings(): Promise<{
  upserted: number;
  skipped: number;
}> {
  console.log("\n🏆 Sync standings 2025-26 (NBA Stats API)…");

  const url = `https://stats.nba.com/stats/leaguestandingsv3?LeagueID=00&Season=${CURRENT_SEASON}&SeasonType=Regular+Season`;

  const res = await fetch(url, { headers: NBA_HEADERS });

  if (!res.ok) {
    console.warn(`  ⚠️  NBA Stats API ${res.status} — standings skippés`);
    return { upserted: 0, skipped: 30 };
  }

  const data = (await res.json()) as {
    resultSets: Array<{
      name: string;
      headers: string[];
      rowSet: unknown[][];
    }>;
  };

  const standingsSet = data.resultSets.find((r) => r.name === "Standings");
  if (!standingsSet) {
    console.warn("  ⚠️  Pas de resultSet Standings — standings skippés");
    return { upserted: 0, skipped: 30 };
  }

  const h = standingsSet.headers;
  const iTeamName = h.indexOf("TeamName");
  const iWins = h.indexOf("WINS");
  const iLosses = h.indexOf("LOSSES");
  const iRank = h.indexOf("PlayoffRank");
  const iClinch = h.indexOf("ClinchIndicator");

  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true, name: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  let upserted = 0;
  let skipped = 0;

  for (const row of standingsSet.rowSet) {
    const teamName = String(row[iTeamName]);
    const abbr = TEAM_NAME_TO_ABBR[teamName];
    if (!abbr) {
      skipped++;
      continue;
    }

    const teamId = teamByAbbr.get(abbr);
    if (!teamId) {
      skipped++;
      continue;
    }

    const wins = Number(row[iWins]);
    const losses = Number(row[iLosses]);
    const conferenceRank = Number(row[iRank]) || null;
    const clinch = row[iClinch] ? String(row[iClinch]).trim() || null : null;
    const playoffResult = clinch ? ` - ${clinch.toLowerCase()}` : null;

    try {
      await prisma.teamSeason.upsert({
        where: { teamId_season: { teamId, season: CURRENT_SEASON } },
        update: { wins, losses, conferenceRank, playoffResult },
        create: {
          teamId,
          season: CURRENT_SEASON,
          wins,
          losses,
          conferenceRank,
          playoffResult,
        },
      });
      upserted++;
    } catch {
      skipped++;
    }
  }

  console.log(`  ✅ ${upserted} upserted, ${skipped} skipped`);
  return { upserted, skipped };
}

// ─── 3. Régénération résumés saison courante ─────────────────────────────────

async function regenerateSummaries(): Promise<void> {
  console.log("\n📝 Régénération résumés saison courante…");

  // Joueurs
  const players = await prisma.player.findMany({
    where: { seasons: { some: { season: CURRENT_SEASON } } },
    include: {
      seasons: {
        where: { season: CURRENT_SEASON },
        include: { team: { select: { abbr: true, city: true, name: true } } },
      },
    },
  });

  const positionFr = (pos: string | null) => {
    const map: Record<string, string> = {
      G: "meneur/arrière",
      F: "ailier",
      C: "pivot",
      "G-F": "arrière-ailier",
      "F-G": "ailier-arrière",
      "F-C": "ailier-pivot",
      "C-F": "pivot-ailier",
    };
    return map[pos ?? ""] ?? pos?.toLowerCase() ?? "joueur";
  };

  let playerDone = 0;
  for (const p of players) {
    const ps = p.seasons[0];
    if (!ps) continue;
    const pos = positionFr(p.position);
    const team = `${ps.team.city} ${ps.team.name}`;
    const summary =
      `${p.firstName} ${p.lastName} est un ${pos} des ${team}. ` +
      `En ${ps.gamesPlayed} matchs lors de la saison ${CURRENT_SEASON}, ` +
      `il contribue à hauteur de ${ps.pointsPerGame.toFixed(1)} points, ` +
      `${ps.reboundsPerGame.toFixed(1)} rebonds et ${ps.assistsPerGame.toFixed(1)} passes par rencontre.`;
    await prisma.player.update({
      where: { id: p.id },
      data: { summaryFr: summary, summaryGeneratedAt: new Date() },
    });
    playerDone++;
  }
  console.log(`  ✅ ${playerDone} résumés joueurs régénérés`);

  // Équipes
  const teamSeasons = await prisma.teamSeason.findMany({
    where: { season: CURRENT_SEASON },
    include: { team: { select: { city: true, name: true, conference: true } } },
  });

  const perfLevel = (w: number, l: number) => {
    const pct = w / (w + l);
    if (pct >= 0.7) return "exceptionnelle";
    if (pct >= 0.6) return "très solide";
    if (pct >= 0.5) return "positive";
    if (pct >= 0.4) return "difficile";
    return "compliquée";
  };

  const rankLabel = (r: number | null) => {
    if (!r) return "";
    if (r === 1) return "en tête de leur conférence (1re place)";
    if (r <= 3) return `dans le top 3 de leur conférence (${r}e)`;
    if (r <= 6) return `en bonne position pour les playoffs (${r}e)`;
    return `au ${r}e rang de leur conférence`;
  };

  const playoffOutcome = (code: string | null) => {
    if (!code) return "n'ont pas de résultat de playoff enregistré";
    const c = code
      .replace(/\s*-\s*/, "")
      .toLowerCase()
      .trim();
    if (c === "w") return "ont remporté le titre NBA";
    if (c === "e")
      return "ont atteint les Finales NBA (champions de la Conférence Est)";
    if (["a", "se", "c"].includes(c))
      return "ont remporté leur division (Conférence Est)";
    if (["nw", "sw", "p"].includes(c))
      return "ont remporté leur division (Conférence Ouest)";
    if (c === "x") return "se sont qualifiés pour les playoffs";
    if (c === "pi") return "ont participé au play-in";
    return "n'ont pas accédé aux playoffs";
  };

  let teamDone = 0;
  for (const ts of teamSeasons) {
    const confFr = ts.team.conference === "East" ? "Est" : "Ouest";
    const perf = perfLevel(ts.wins, ts.losses);
    const rankStr = rankLabel(ts.conferenceRank);
    const outcome = playoffOutcome(ts.playoffResult);
    const summary =
      `Les ${ts.team.city} ${ts.team.name} ont réalisé une saison ${CURRENT_SEASON} ${perf} ` +
      `avec un bilan de ${ts.wins}-${ts.losses}${rankStr ? `, terminant ${rankStr}` : ""} ` +
      `en Conférence ${confFr}. À l'issue de la saison régulière, ils ${outcome}.`;
    await prisma.teamSeason.update({
      where: { id: ts.id },
      data: { summaryFr: summary },
    });
    teamDone++;
  }
  console.log(`  ✅ ${teamDone} résumés équipes régénérés`);
}

// ─── 4. Revalidate Vercel ISR ─────────────────────────────────────────────────

async function revalidateVercel(): Promise<void> {
  if (!VERCEL_URL || !CRON_SECRET) {
    console.log(
      "\n⚠️  VERCEL_URL ou CRON_SECRET absent — revalidation skippée",
    );
    return;
  }
  console.log("\n🔄 Revalidation cache Vercel…");
  try {
    const res = await fetch(`${VERCEL_URL}/api/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (res.ok) {
      console.log("  ✅ Cache invalidé");
    } else {
      console.warn(`  ⚠️  /api/revalidate a répondu ${res.status}`);
    }
  } catch (e) {
    console.warn(`  ⚠️  Revalidation échouée : ${e}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = new Date();
  console.log(`🏀 Sync quotidien NBA — ${CURRENT_SEASON}`);
  console.log(`   Démarré à : ${startedAt.toISOString()}\n`);

  let status = "success";
  const errors: string[] = [];

  try {
    const playerResult = await syncPlayerStats();
    const standingsResult = await syncStandings();
    await regenerateSummaries();
    await revalidateVercel();

    await prisma.syncLog.create({
      data: {
        source: "sync-daily",
        status,
        itemsProcessed: playerResult.upserted + standingsResult.upserted,
        errors: {
          playerSkipped: playerResult.skipped,
          standingsSkipped: standingsResult.skipped,
          messages: errors,
        },
        startedAt,
        completedAt: new Date(),
      },
    });
  } catch (e) {
    status = "error";
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ Sync échouée : ${msg}`);
    await prisma.syncLog.create({
      data: {
        source: "sync-daily",
        status,
        itemsProcessed: 0,
        errors: { fatal: msg },
        startedAt,
        completedAt: new Date(),
      },
    });
    process.exit(1);
  }

  const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);
  console.log(`\n✅ Sync terminée en ${elapsed}s`);
}

main().finally(() => prisma.$disconnect());
