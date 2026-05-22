/**
 * Sprint 5 — Import photos joueurs depuis scripts/data/photos.json
 *
 * Lit le JSON généré par fetch-photos.py et met à jour
 * les champs photoUrl + photoAttribution de chaque Player.
 *
 * Run: npm run import:photos
 */

import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import { join } from "path";

type PhotoEntry = {
  slug: string;
  photoUrl: string | null;
  photoAttribution: string | null;
};

async function main() {
  const filePath = join(process.cwd(), "scripts", "data", "photos.json");
  const entries: PhotoEntry[] = JSON.parse(readFileSync(filePath, "utf-8"));

  const withPhoto = entries.filter((e) => e.photoUrl);
  console.log(
    `📸 Import photos — ${entries.length} entrées, ${withPhoto.length} avec photo\n`,
  );

  // Charger tous les slugs players pour matcher
  const players = await prisma.player.findMany({
    select: { id: true, slug: true },
  });
  const slugMap = new Map(players.map((p) => [p.slug, p.id]));

  let updated = 0;
  let notFound = 0;
  let noPhoto = 0;

  for (const entry of entries) {
    if (!entry.photoUrl) {
      noPhoto++;
      continue;
    }

    const playerId = slugMap.get(entry.slug);
    if (!playerId) {
      // Essayer une correspondance partielle (ex: slug légèrement différent)
      notFound++;
      continue;
    }

    await prisma.player.update({
      where: { id: playerId },
      data: {
        photoUrl: entry.photoUrl,
        photoAttribution: entry.photoAttribution,
      },
    });
    updated++;

    if (updated % 50 === 0) process.stdout.write(`  ${updated} mis à jour…\n`);
  }

  // SyncLog
  await prisma.syncLog.create({
    data: {
      source: "import-photos",
      status: "success",
      itemsProcessed: updated,
      errors: { notFound, noPhoto },
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  console.log(`\n✅ ${updated} joueurs mis à jour avec photo`);
  console.log(`⏭️  ${noPhoto} sans photo trouvée`);
  console.log(`❓ ${notFound} slugs non trouvés en DB`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
