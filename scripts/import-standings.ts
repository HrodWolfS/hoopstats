/**
 * Sprint 2.4 (rev) — Import TeamSeason depuis scripts/data/standings.json
 *
 * Prérequis:
 *   - python3 scripts/fetch-standings.py  (génère data/standings.json)
 *   - 30 équipes seedées
 *
 * Run: npm run import:standings
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient({ log: ["error"] });

type StandingRow = {
  team_abbr: string;
  season: string;
  wins: number;
  losses: number;
  conference_rank: number;
  playoff_result: string | null;
};

async function main() {
  const filePath = join(__dirname, "data", "standings.json");

  let rows: StandingRow[];
  try {
    rows = JSON.parse(readFileSync(filePath, "utf-8")) as StandingRow[];
  } catch {
    console.error(
      `❌ Fichier introuvable: ${filePath}\n` +
        `   Lance d'abord: python3 scripts/fetch-standings.py`,
    );
    process.exit(1);
  }

  console.log(`🏆 Import TeamSeason — ${rows.length} lignes\n`);

  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  const startedAt = new Date();
  let upserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const teamId = teamByAbbr.get(row.team_abbr);
    if (!teamId) {
      skipped++;
      continue;
    }

    try {
      await prisma.teamSeason.upsert({
        where: { teamId_season: { teamId, season: row.season } },
        update: {
          wins: row.wins,
          losses: row.losses,
          conferenceRank: row.conference_rank || undefined,
          playoffResult: row.playoff_result ?? undefined,
        },
        create: {
          teamId,
          season: row.season,
          wins: row.wins,
          losses: row.losses,
          conferenceRank: row.conference_rank || undefined,
          playoffResult: row.playoff_result ?? undefined,
        },
      });
      upserted++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${row.team_abbr}/${row.season}: ${msg}`);
      skipped++;
    }
  }

  await prisma.syncLog.create({
    data: {
      source: "import-standings",
      status: errors.length === 0 ? "success" : "partial",
      itemsProcessed: upserted,
      errors: errors.length > 0 ? errors : undefined,
      startedAt,
      completedAt: new Date(),
    },
  });

  console.log(`✅ ${upserted} TeamSeason upsertées`);
  if (skipped > 0) console.warn(`⏭️  ${skipped} skipped (équipe inconnue)`);
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
