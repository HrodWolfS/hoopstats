/**
 * Sprint 11.1 — Backfill historique TeamSeason via ESPN standings API
 *
 * Remonte jusqu'à la saison 2001-02 (la plus ancienne connue de l'API ESPN).
 * Les saisons déjà présentes en DB sont mises à jour (upsert idempotent).
 * Les franchises disparues (SEA, NJN avant BKN...) sont ignorées proprement.
 *
 * Run: pnpm tsx scripts/backfill-standings.ts
 * Dry run: pnpm tsx scripts/backfill-standings.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

// ESPN season end year de départ (2002 = saison 2001-02)
const BACKFILL_FROM_YEAR = 2002;
// On s'arrête à l'avant-dernière saison (la saison en cours est gérée par sync-daily)
const BACKFILL_TO_YEAR = 2025;

// Délai entre chaque requête ESPN pour éviter le rate-limit
const SLEEP_MS = 800;

// ESPN abréviation → abbr DB
// Inclut les abréviations historiques des franchises relocalisées ou renommées
const ESPN_TO_DB: Record<string, string> = {
  // Divergences permanentes (sync-daily)
  NY: "NYK",
  WSH: "WAS",
  GS: "GSW",
  UTAH: "UTA",
  NO: "NOP",
  SA: "SAS",
  // Noms historiques → identité actuelle
  NJ: "BKN", // New Jersey Nets → Brooklyn Nets (2012)
  NOH: "NOP", // New Orleans Hornets → Pelicans (2013)
  NOK: "NOP", // New Orleans/Oklahoma City Hornets (saison Katrina 2005-06)
  // Charlotte : les Bobcats (2004-2014) ont repris le nom Hornets.
  // ESPN les appelait CHB ou CHA selon la saison — on les mappe sur CHA.
  CHB: "CHA",
  // Seattle SuperSonics → OKC Thunder (2008). On ne mappe pas SEA→OKC car
  // hoopstats traite OKC comme une franchise distincte démarrant en 2008-09.
};

// Franchises ESPN qu'on ignore volontairement (n'existent plus dans la NBA actuelle)
const SKIP_ABBRS = new Set(["SEA"]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function espnSeasonLabel(endYear: number): string {
  const start = String(endYear - 1).slice(-2);
  const end = String(endYear).slice(-2);
  return `20${start}-${end}`;
}

async function fetchEspnStandings(endYear: number): Promise<
  Array<{
    espnAbbr: string;
    wins: number;
    losses: number;
    conferenceRank: number | null;
  }>
> {
  const url = `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${endYear}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "hoopstats-backfill/1.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`ESPN ${res.status} for season ${endYear}`);
  }

  const data = (await res.json()) as {
    children?: Array<{
      standings?: {
        entries?: Array<{
          team: { abbreviation: string };
          stats: Array<{ name: string; value: number }>;
        }>;
      };
    }>;
  };

  const results: Array<{
    espnAbbr: string;
    wins: number;
    losses: number;
    conferenceRank: number | null;
  }> = [];

  for (const conf of data.children ?? []) {
    for (const entry of conf.standings?.entries ?? []) {
      const statMap = new Map(entry.stats.map((s) => [s.name, s.value]));
      results.push({
        espnAbbr: entry.team.abbreviation,
        wins: Math.round(statMap.get("wins") ?? 0),
        losses: Math.round(statMap.get("losses") ?? 0),
        conferenceRank: Math.round(statMap.get("playoffSeed") ?? 0) || null,
      });
    }
  }

  return results;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) console.log("🔍 DRY RUN — aucune écriture en DB\n");

  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  let totalUpserted = 0;
  let totalSkipped = 0;
  const failedSeasons: string[] = [];

  for (
    let endYear = BACKFILL_FROM_YEAR;
    endYear <= BACKFILL_TO_YEAR;
    endYear++
  ) {
    const season = espnSeasonLabel(endYear);
    process.stdout.write(`  ${season}… `);

    try {
      const entries = await fetchEspnStandings(endYear);

      if (entries.length === 0) {
        console.log("0 équipes (saison vide, ignorée)");
        totalSkipped++;
        await sleep(SLEEP_MS);
        continue;
      }

      let seasonUpserted = 0;
      let seasonSkipped = 0;

      for (const { espnAbbr, wins, losses, conferenceRank } of entries) {
        if (SKIP_ABBRS.has(espnAbbr)) {
          seasonSkipped++;
          continue;
        }
        const dbAbbr = ESPN_TO_DB[espnAbbr] ?? espnAbbr;
        const teamId = teamByAbbr.get(dbAbbr);
        if (!teamId) {
          seasonSkipped++;
          continue;
        }

        if (!isDryRun) {
          await prisma.teamSeason.upsert({
            where: { teamId_season: { teamId, season } },
            update: { wins, losses, conferenceRank },
            create: { teamId, season, wins, losses, conferenceRank },
          });
        }
        seasonUpserted++;
      }

      console.log(
        `${seasonUpserted} équipes${seasonSkipped > 0 ? ` (${seasonSkipped} ignorées)` : ""}`,
      );
      totalUpserted += seasonUpserted;
      totalSkipped += seasonSkipped;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`ERREUR — ${msg}`);
      failedSeasons.push(season);
    }

    await sleep(SLEEP_MS);
  }

  console.log(`\n✅ ${totalUpserted} TeamSeason upsertées`);
  if (totalSkipped > 0)
    console.log(`⏭️  ${totalSkipped} ignorées (franchises disparues)`);
  if (failedSeasons.length > 0)
    console.warn(`⚠️  Saisons échouées : ${failedSeasons.join(", ")}`);

  if (!isDryRun) {
    await prisma.syncLog.create({
      data: {
        source: "backfill-standings",
        status: failedSeasons.length === 0 ? "success" : "partial",
        itemsProcessed: totalUpserted,
        errors: failedSeasons.length > 0 ? failedSeasons : undefined,
        startedAt: new Date(
          Date.now() - (BACKFILL_TO_YEAR - BACKFILL_FROM_YEAR + 1) * SLEEP_MS,
        ),
        completedAt: new Date(),
      },
    });
    console.log("📋 SyncLog enregistré.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Erreur fatale:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
