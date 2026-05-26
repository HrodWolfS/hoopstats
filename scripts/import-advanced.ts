/**
 * Sprint 2.3 — Import stats avancées depuis le JSON généré par enrich-advanced.py
 *
 * Run: pnpm tsx scripts/import-advanced.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { playerSlug } from "../lib/slugs";

const prisma = new PrismaClient({ log: ["error"] });
const BATCH = 8;

type AdvancedRow = {
  player_name: string;
  season: string;
  gp: number;
  per: number | null;
  ts_pct: number | null;
  usg_pct: number | null;
  off_rating: number | null;
  def_rating: number | null;
  net_rating: number | null;
  ast_pct: number | null;
  reb_pct: number | null;
};

async function main() {
  const filePath = join(__dirname, "data", "advanced-stats.json");

  let rows: AdvancedRow[];
  try {
    const raw = readFileSync(filePath, "utf-8");
    rows = JSON.parse(raw) as AdvancedRow[];
  } catch {
    console.error(
      `❌ Fichier introuvable: ${filePath}\n   Lance d'abord: python3 scripts/enrich-advanced.py`,
    );
    process.exit(1);
  }

  console.log(`📊 Import stats avancées — ${rows.length} lignes`);

  // Charger tous les joueurs en mémoire (slug → id)
  const allPlayers = await prisma.player.findMany({
    select: { id: true, slug: true },
  });
  const slugToId = new Map(allPlayers.map((p) => [p.slug, p.id]));
  console.log(`👥 ${slugToId.size} joueurs en cache`);

  const startedAt = new Date();
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Traitement par batches parallèles
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const pct = Math.round(((i + batch.length) / rows.length) * 100);
    process.stdout.write(`\r  ${i + batch.length}/${rows.length} (${pct}%)`);

    await Promise.all(
      batch.map(async (row) => {
        const parts = row.player_name.trim().split(" ");
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ");
        const slug = playerSlug(firstName, lastName);
        const playerId = slugToId.get(slug);

        if (!playerId) {
          skipped++;
          return;
        }

        try {
          const result = await prisma.playerSeason.updateMany({
            where: { playerId, season: row.season },
            data: {
              per: row.per ?? undefined,
              trueShooting: row.ts_pct ?? undefined,
              usageRate: row.usg_pct ?? undefined,
              offRating: row.off_rating ?? undefined,
              defRating: row.def_rating ?? undefined,
              netRating: row.net_rating ?? undefined,
            },
          });
          updated += result.count;
          if (result.count === 0) skipped++;
        } catch (e) {
          errors.push(
            `${slug}/${row.season}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }),
    );
  }

  console.log(`\n✅ ${updated} PlayerSeason enrichies`);
  console.log(`⏭️  ${skipped} skipped`);
  if (errors.length > 0) console.warn(`⚠️  ${errors.length} erreurs`);

  await prisma.syncLog.create({
    data: {
      source: "import-advanced",
      status: errors.length === 0 ? "success" : "partial",
      itemsProcessed: updated,
      errors: errors.length > 0 ? errors : undefined,
      startedAt,
      completedAt: new Date(),
    },
  });
  console.log("📋 SyncLog enregistré.");
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
