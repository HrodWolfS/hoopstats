/**
 * Sprint 2.4 — Import bilans équipes par saison (TeamSeason)
 *
 * Source: balldontlie /v1/standings?season=X
 * Crée les 30 × 10 = 300 lignes TeamSeason avec wins, losses, conferenceRank.
 *
 * Prérequis:
 *   - BALLDONTLIE_API_KEY dans .env
 *   - 30 équipes seedées
 *
 * Run: pnpm tsx scripts/import-standings.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

const BASE_URL = "https://api.balldontlie.io/v1";
const API_KEY = process.env.BALLDONTLIE_API_KEY ?? "";

const SEASONS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

function seasonLabel(year: number): string {
  return `${year}-${String(year + 1).slice(2)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type BdlStanding = {
  team: {
    id: number;
    abbreviation: string;
    city: string;
    name: string;
    conference: string;
    division: string;
  };
  season: number;
  wins: number;
  losses: number;
  conference_rank: number;
  division_rank: number;
  home_record: string;
  road_record: string;
};

async function fetchStandings(season: number): Promise<BdlStanding[]> {
  const url = new URL(`${BASE_URL}/standings`);
  url.searchParams.set("season", String(season));

  const res = await fetch(url.toString(), {
    headers: { Authorization: API_KEY },
  });

  if (!res.ok) {
    throw new Error(`BDL ${res.status} — standings season=${season}`);
  }

  const json = (await res.json()) as { data: BdlStanding[] };
  return json.data;
}

async function main() {
  if (!API_KEY) {
    console.error("❌ BALLDONTLIE_API_KEY manquante dans .env");
    process.exit(1);
  }

  const startedAt = new Date();
  let totalUpserted = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  // Map abbr → teamId
  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  console.log("🏆 Import standings équipes…\n");

  for (const season of SEASONS) {
    const label = seasonLabel(season);
    process.stdout.write(`  ${label}… `);

    let standings: BdlStanding[] = [];
    try {
      standings = await fetchStandings(season);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`ERREUR: ${msg}`);
      errors.push(`${label}: ${msg}`);
      await sleep(1100);
      continue;
    }

    let upserted = 0;

    for (const row of standings) {
      const teamId = teamByAbbr.get(row.team.abbreviation);
      if (!teamId) {
        totalSkipped++;
        continue;
      }

      try {
        await prisma.teamSeason.upsert({
          where: { teamId_season: { teamId, season: label } },
          update: {
            wins: row.wins,
            losses: row.losses,
            conferenceRank: row.conference_rank,
          },
          create: {
            teamId,
            season: label,
            wins: row.wins,
            losses: row.losses,
            conferenceRank: row.conference_rank,
          },
        });
        upserted++;
        totalUpserted++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${row.team.abbreviation}/${label}: ${msg}`);
        totalSkipped++;
      }
    }

    console.log(`${upserted}/30 équipes`);
    await sleep(1100);
  }

  await prisma.syncLog.create({
    data: {
      source: "import-standings",
      status: errors.length === 0 ? "success" : "partial",
      itemsProcessed: totalUpserted,
      errors: errors.length > 0 ? errors : undefined,
      startedAt,
      completedAt: new Date(),
    },
  });

  console.log(`\n✅ ${totalUpserted} TeamSeason upsertées`);
  if (totalSkipped > 0) console.warn(`⏭️  ${totalSkipped} skipped`);
  if (errors.length > 0)
    console.warn(`⚠️  ${errors.length} erreurs (voir SyncLog)`);
  console.log("📋 SyncLog enregistré.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur fatale:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
