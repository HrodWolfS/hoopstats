/**
 * Sprint 11 — Import historique PlayoffSeries (1980-81 → 2014-15)
 *
 * Lit scripts/data/playoff-history.json généré par fetch-playoff-history.py
 *
 * Stratégie :
 *  - Pour chaque série : résoudre team1 et team2 via abbr → Team.id
 *  - Upsert PlayoffSeries par (season, conference, round, team1Id, team2Id)
 *    Si le couple team1/team2 est inversé en DB, skip (la clé unique ne matche pas
 *    mais c'est suffisant pour l'historique — on ne casse pas les données courantes)
 *  - team1 = vainqueur de la série (plus de victoires)
 *
 * Run: npm run import:playoff-history
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient({ log: ["error"] });

type PlayoffRow = {
  season: string;
  conference: string; // "WEST" | "EAST" | "FINALS"
  round: number; // 1-4
  team1_abbr: string;
  team2_abbr: string;
  team1_wins: number;
  team2_wins: number;
  completed: boolean;
  summary: string | null;
};

async function main() {
  const filePath = join(__dirname, "data", "playoff-history.json");

  let rows: PlayoffRow[];
  try {
    rows = JSON.parse(readFileSync(filePath, "utf-8")) as PlayoffRow[];
  } catch {
    console.error(
      `❌ Fichier introuvable: ${filePath}\n` +
        `   Lance d'abord: python3 scripts/fetch-playoff-history.py`,
    );
    process.exit(1);
  }

  console.log(`🏆 Import PlayoffSeries historique — ${rows.length} séries\n`);

  // ── Maps DB ───────────────────────────────────────────────────────────────
  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  console.log(`   ${dbTeams.length} équipes en DB.\n`);

  const startedAt = new Date();
  let upserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  let processed = 0;

  for (const row of rows) {
    processed++;

    // ── 1. Résoudre les équipes ──────────────────────────────────────────
    const team1Id = teamByAbbr.get(row.team1_abbr);
    const team2Id = teamByAbbr.get(row.team2_abbr);

    if (!team1Id || !team2Id) {
      skipped++;
      continue;
    }

    // ── 2. Upsert PlayoffSeries ──────────────────────────────────────────
    try {
      await prisma.playoffSeries.upsert({
        where: {
          season_conference_round_team1Id_team2Id: {
            season: row.season,
            conference: row.conference,
            round: row.round,
            team1Id,
            team2Id,
          },
        },
        update: {
          team1Wins: row.team1_wins,
          team2Wins: row.team2_wins,
          completed: row.completed,
          summary: row.summary ?? undefined,
        },
        create: {
          season: row.season,
          conference: row.conference,
          round: row.round,
          team1Id,
          team2Id,
          team1Wins: row.team1_wins,
          team2Wins: row.team2_wins,
          completed: row.completed,
          summary: row.summary ?? undefined,
        },
      });
      upserted++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(
        `${row.season} R${row.round} ${row.team1_abbr} vs ${row.team2_abbr}: ${msg}`,
      );
      skipped++;
    }

    if (processed % 100 === 0) {
      process.stdout.write(`\r  ${processed}/${rows.length}…`);
    }
  }

  process.stdout.write(`\r  ${processed}/${rows.length} traités.   \n`);

  // ── SyncLog ──────────────────────────────────────────────────────────────
  await prisma.syncLog.create({
    data: {
      source: "import-playoff-history",
      status: errors.length === 0 ? "success" : "partial",
      itemsProcessed: upserted,
      errors: errors.length > 0 ? errors.slice(0, 50) : undefined,
      startedAt,
      completedAt: new Date(),
    },
  });

  console.log(`\n✅ ${upserted} PlayoffSeries upsertées`);
  console.log(`⏭️  ${skipped} skipped (équipe inconnue ou erreur)`);
  if (errors.length > 0) {
    console.warn(
      `⚠️  ${errors.length} erreurs (voir SyncLog, max 50 stockées)`,
    );
    if (errors.length <= 10) errors.forEach((e) => console.warn("   ", e));
  }
  console.log("📋 SyncLog enregistré.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur fatale:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
