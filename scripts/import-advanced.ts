/**
 * Sprint 2.3 — Import stats avancées depuis le JSON généré par enrich-advanced.py
 *
 * Prérequis:
 *   - enrich-advanced.py déjà exécuté (génère scripts/data/advanced-stats.json)
 *   - PlayerSeason déjà importées (import-balldontlie.ts)
 *
 * Run: pnpm tsx scripts/import-advanced.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { playerSlug } from "../lib/slugs";

const prisma = new PrismaClient({ log: ["error"] });

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
      `❌ Fichier introuvable: ${filePath}\n` +
        `   Lance d'abord: python3 scripts/enrich-advanced.py`,
    );
    process.exit(1);
  }

  console.log(`📊 Import stats avancées — ${rows.length} lignes\n`);

  const startedAt = new Date();
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    // Reconstituer le slug depuis le nom complet
    const parts = row.player_name.trim().split(" ");
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ");
    const slug = playerSlug(firstName, lastName);

    try {
      // Trouver le joueur par slug
      const player = await prisma.player.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!player) {
        skipped++;
        continue;
      }

      // Mettre à jour toutes les PlayerSeason de ce joueur pour cette saison
      // (un joueur peut avoir joué pour plusieurs équipes → on update toutes les lignes)
      const result = await prisma.playerSeason.updateMany({
        where: { playerId: player.id, season: row.season },
        data: {
          per: row.per ?? undefined,
          trueShooting: row.ts_pct ?? undefined,
          usageRate: row.usg_pct ?? undefined,
        },
      });

      if (result.count > 0) {
        updated += result.count;
      } else {
        skipped++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${slug}/${row.season}: ${msg}`);
    }
  }

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

  console.log(`✅ ${updated} PlayerSeason enrichies`);
  console.log(`⏭️  ${skipped} skipped (joueur inconnu ou pas de PlayerSeason)`);
  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length} erreurs (voir SyncLog en DB)`);
  }
  console.log("📋 SyncLog enregistré.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur fatale:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
