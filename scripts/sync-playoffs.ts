/**
 * sync-playoffs.ts
 * Synchronise les séries playoff depuis l'API ESPN vers notre base de données.
 *
 * Usage :
 *   pnpm tsx scripts/sync-playoffs.ts                  → saison courante
 *   pnpm tsx scripts/sync-playoffs.ts --season 2024-25 → saison spécifique
 *   pnpm tsx scripts/sync-playoffs.ts --all            → toutes les saisons
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Saisons à backfiller avec --all ─────────────────────────────────────────

const ALL_SEASONS = [
  "2025-26",
  "2024-25",
  "2023-24",
  "2022-23",
  "2021-22",
  "2020-21",
  "2019-20",
  "2018-19",
  "2017-18",
  "2016-17",
  "2015-16",
];

const CURRENT_SEASON = "2025-26";

// ─── Types ESPN ───────────────────────────────────────────────────────────────

type EspnCompetitor = {
  id: string;
  team: { id: string; abbreviation: string; displayName: string };
  homeAway: string;
};

type EspnEvent = {
  id: string;
  date: string;
  competitions: Array<{
    notes?: Array<{ headline?: string; text?: string }>;
    series?: {
      completed: boolean;
      summary: string;
      competitors: Array<{ id: string; wins: number }>;
    };
    competitors: EspnCompetitor[];
    status: { type: { name: string } };
    broadcasts?: Array<{ names: string[] }>;
  }>;
};

// ─── Parsing ESPN note → conference / round ───────────────────────────────────

function parseNote(
  text: string,
): { conference: "WEST" | "EAST" | "FINALS"; round: 1 | 2 | 3 | 4 } | null {
  const t = text.toLowerCase().trim();
  if (t.includes("nba finals")) return { conference: "FINALS", round: 4 };

  const conference: "WEST" | "EAST" | null = t.startsWith("west")
    ? "WEST"
    : t.startsWith("east")
      ? "EAST"
      : null;
  if (!conference) return null;

  // "semifinals".includes("finals") === true → check semi FIRST
  if (t.includes("semi")) return { conference, round: 2 };
  if (t.includes("finals") || t.includes("final"))
    return { conference, round: 3 };
  if (t.includes("first") || t.includes("1st")) return { conference, round: 1 };

  return null;
}

// ─── Normalisation abréviations ESPN → notre DB ───────────────────────────────
// ESPN utilise des codes courts non-standard pour certaines franchises

const ESPN_TO_DB: Record<string, string> = {
  NY: "NYK", // New York Knicks
  SA: "SAS", // San Antonio Spurs
  GS: "GSW", // Golden State Warriors
  UTAH: "UTA", // Utah Jazz
  NO: "NOP", // New Orleans Pelicans
  WSH: "WAS", // Washington Wizards
};

function normalizeAbbr(espnAbbr: string): string {
  return ESPN_TO_DB[espnAbbr] ?? espnAbbr;
}

// ─── Plage de dates ESPN par saison ──────────────────────────────────────────
// - Saison normale : playoffs avr–juin (parfois juillet pour 2020-21)
// - 2019-20 (bulle COVID) : playoffs août–octobre 2020

function playoffDateRange(season: string, endYear: number): string {
  if (season === "2019-20") return `${endYear}0801-${endYear}1015`;
  if (season === "2020-21") return `${endYear}0419-${endYear}0731`;
  return `${endYear}0419-${endYear}0630`;
}

// ─── Sync d'une saison ────────────────────────────────────────────────────────

async function syncSeason(season: string): Promise<{
  upserted: number;
  skipped: number;
}> {
  console.log(`\n📋 Sync playoffs ${season}…`);

  const startYear = parseInt(season.split("-")[0]); // "2025-26" → 2025
  const endYear = 2000 + parseInt(season.split("-")[1]); // "2025-26" → 2026

  // ── 1. Fetch ESPN ──────────────────────────────────────────────────────────
  const [gamesRes, standingsRes] = await Promise.all([
    fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard` +
        `?seasontype=3&season=${startYear}&dates=${playoffDateRange(season, endYear)}&limit=200`,
    ),
    fetch(
      `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${endYear}`,
    ),
  ]);

  if (!gamesRes.ok) {
    console.warn(`  ⚠️  ESPN scoreboard ${gamesRes.status} — saison skippée`);
    return { upserted: 0, skipped: 1 };
  }

  const gamesData = await gamesRes.json();
  const standingsData = standingsRes.ok
    ? await standingsRes.json()
    : { children: [] };

  const events: EspnEvent[] = gamesData.events ?? [];
  if (events.length === 0) {
    console.log(`  ℹ️  Aucun match playoff trouvé pour ${season}`);
    return { upserted: 0, skipped: 0 };
  }
  console.log(`  ✓ ${events.length} événements ESPN récupérés`);

  // ── 2. Seeds depuis standings ──────────────────────────────────────────────
  const seedMap = new Map<string, number>(); // abbr → seed
  for (const conf of standingsData?.children ?? []) {
    for (const entry of conf.standings?.entries ?? []) {
      const abbr: string = entry.team?.abbreviation;
      const stat = (
        entry.stats as Array<{ name: string; value: number }> | undefined
      )?.find((s) => s.name === "playoffSeed");
      if (abbr && stat) seedMap.set(abbr, stat.value);
    }
  }

  // ── 3. Teams DB ───────────────────────────────────────────────────────────
  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  // ── 4. Grouper les événements en séries ───────────────────────────────────
  type SeriesAccum = {
    conf: "WEST" | "EAST" | "FINALS";
    round: 1 | 2 | 3 | 4;
    espnTeam1: EspnCompetitor;
    espnTeam2: EspnCompetitor;
    wins1: number;
    wins2: number;
    completed: boolean;
    summary: string;
    gameNumber: number;
    nextGameDate: string | null;
    nextGameNetwork: string | null;
  };

  const seriesMap = new Map<string, SeriesAccum>();

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const noteText = comp.notes?.[0]?.headline ?? comp.notes?.[0]?.text ?? "";
    const parsed = parseNote(noteText);
    if (!parsed) continue;

    const { conference, round } = parsed;
    const [c1, c2] = comp.competitors ?? [];
    if (!c1 || !c2) continue;

    const ids = [c1.team.id, c2.team.id].sort();
    const key = `${conference}-${round}-${ids[0]}-${ids[1]}`;

    const seriesObj = comp.series;
    const gameMatch = noteText.match(/game\s*(\d+)/i);
    const gameNumber = gameMatch ? parseInt(gameMatch[1]) : 1;
    const isScheduled = comp.status?.type?.name === "STATUS_SCHEDULED";

    if (!seriesMap.has(key)) {
      const wins1 =
        seriesObj?.competitors.find((c) => c.id === c1.id)?.wins ?? 0;
      const wins2 =
        seriesObj?.competitors.find((c) => c.id === c2.id)?.wins ?? 0;
      seriesMap.set(key, {
        conf: conference,
        round,
        espnTeam1: c1,
        espnTeam2: c2,
        wins1,
        wins2,
        completed: seriesObj?.completed ?? false,
        summary: seriesObj?.summary ?? "",
        gameNumber,
        nextGameDate: isScheduled ? event.date : null,
        nextGameNetwork: isScheduled
          ? (comp.broadcasts?.[0]?.names?.[0] ?? null)
          : null,
      });
    } else {
      const ex = seriesMap.get(key)!;
      if (seriesObj) {
        // Lookup par ID stocké (pas par position c1/c2 qui s'inverse home/away)
        const w1 = seriesObj.competitors.find(
          (c) => c.id === ex.espnTeam1.id,
        )?.wins;
        const w2 = seriesObj.competitors.find(
          (c) => c.id === ex.espnTeam2.id,
        )?.wins;
        if (w1 !== undefined) ex.wins1 = w1;
        if (w2 !== undefined) ex.wins2 = w2;
        ex.completed = seriesObj.completed ?? ex.completed;
        ex.summary = seriesObj.summary || ex.summary;
      }
      ex.gameNumber = Math.max(ex.gameNumber, gameNumber);
      if (isScheduled && !ex.nextGameDate) {
        ex.nextGameDate = event.date;
        ex.nextGameNetwork = comp.broadcasts?.[0]?.names?.[0] ?? null;
      }
    }
  }

  console.log(`  ✓ ${seriesMap.size} séries identifiées`);

  // ── 5. Upsert en base ─────────────────────────────────────────────────────
  let upserted = 0;
  let skipped = 0;

  for (const [, s] of seriesMap) {
    const abbr1 = normalizeAbbr(s.espnTeam1.team.abbreviation);
    const abbr2 = normalizeAbbr(s.espnTeam2.team.abbreviation);
    const dbId1 = teamByAbbr.get(abbr1);
    const dbId2 = teamByAbbr.get(abbr2);

    if (!dbId1 || !dbId2) {
      console.warn(
        `  ⚠️  Équipe non trouvée en base : ${abbr1} ou ${abbr2} — série skippée`,
      );
      skipped++;
      continue;
    }

    const seed1 =
      seedMap.get(abbr1) ?? seedMap.get(s.espnTeam1.team.abbreviation) ?? null;
    const seed2 =
      seedMap.get(abbr2) ?? seedMap.get(s.espnTeam2.team.abbreviation) ?? null;

    // Toujours mettre la meilleure tête de série en team1
    const flip = (seed1 ?? 9) > (seed2 ?? 9);
    const [t1Id, t2Id, w1, w2, s1, s2] = flip
      ? [dbId2, dbId1, s.wins2, s.wins1, seed2, seed1]
      : [dbId1, dbId2, s.wins1, s.wins2, seed1, seed2];

    try {
      await prisma.playoffSeries.upsert({
        where: {
          season_conference_round_team1Id_team2Id: {
            season,
            conference: s.conf,
            round: s.round,
            team1Id: t1Id,
            team2Id: t2Id,
          },
        },
        update: {
          team1Seed: s1,
          team2Seed: s2,
          team1Wins: w1,
          team2Wins: w2,
          completed: s.completed,
          summary: s.summary || null,
          gameNumber: s.gameNumber,
          nextGameDate: s.nextGameDate ? new Date(s.nextGameDate) : null,
          nextGameNetwork: s.nextGameNetwork,
        },
        create: {
          season,
          conference: s.conf,
          round: s.round,
          team1Id: t1Id,
          team2Id: t2Id,
          team1Seed: s1,
          team2Seed: s2,
          team1Wins: w1,
          team2Wins: w2,
          completed: s.completed,
          summary: s.summary || null,
          gameNumber: s.gameNumber,
          nextGameDate: s.nextGameDate ? new Date(s.nextGameDate) : null,
          nextGameNetwork: s.nextGameNetwork,
        },
      });
      upserted++;
    } catch (err) {
      console.warn(`  ⚠️  Upsert échoué pour ${abbr1} vs ${abbr2} :`, err);
      skipped++;
    }
  }

  console.log(`  ✅ ${upserted} séries upsertées, ${skipped} skippées`);
  return { upserted, skipped };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const allFlag = args.includes("--all");
  const seasonArg =
    args.find((a) => a.startsWith("--season="))?.split("=")[1] ??
    args[args.indexOf("--season") + 1];

  const seasons = allFlag ? ALL_SEASONS : [seasonArg ?? CURRENT_SEASON];

  console.log(`🏀 Sync playoffs — ${seasons.join(", ")}`);
  const startedAt = new Date();

  let totalUpserted = 0;
  let totalSkipped = 0;

  for (const season of seasons) {
    const { upserted, skipped } = await syncSeason(season);
    totalUpserted += upserted;
    totalSkipped += skipped;
    // Rate limit poli entre les saisons
    if (seasons.length > 1) await new Promise((r) => setTimeout(r, 800));
  }

  await prisma.syncLog.create({
    data: {
      source: "sync-playoffs",
      status: totalSkipped === 0 ? "success" : "partial",
      itemsProcessed: totalUpserted,
      errors: { skipped: totalSkipped },
      startedAt,
      completedAt: new Date(),
    },
  });

  console.log(
    `\n🏁 Terminé : ${totalUpserted} séries en base, ${totalSkipped} ignorées`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
