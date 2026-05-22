/**
 * Sprint 2.2+2.3 (rev) — Import PlayerSeason depuis scripts/data/player-stats.json
 *
 * Prérequis:
 *   - python3 scripts/fetch-stats.py  (génère data/player-stats.json)
 *   - Joueurs déjà importés (npm run import:bdl)
 *
 * Run: npm run import:player-stats
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { playerSlug } from "../lib/slugs";

const prisma = new PrismaClient({ log: ["error"] });

type StatsRow = {
  player_name: string;
  team_abbr: string;
  season: string;
  gp: number;
  min: number;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  fg_pct: number | null;
  fg3_pct: number | null;
  ft_pct: number | null;
  ts_pct: number | null;
  usg_pct: number | null;
  per: number | null;
  off_rating: number | null;
  def_rating: number | null;
  net_rating: number | null;
};

async function main() {
  const filePath = join(__dirname, "data", "player-stats.json");

  let rows: StatsRow[];
  try {
    rows = JSON.parse(readFileSync(filePath, "utf-8")) as StatsRow[];
  } catch {
    console.error(
      `❌ Fichier introuvable: ${filePath}\n` +
        `   Lance d'abord: python3 scripts/fetch-stats.py`,
    );
    process.exit(1);
  }

  console.log(`📊 Import PlayerSeason — ${rows.length} lignes\n`);

  // ── Maps DB ───────────────────────────────────────────────────────────────
  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  const dbPlayers = await prisma.player.findMany({
    select: { id: true, slug: true },
  });
  const playerById = new Map(dbPlayers.map((p) => [p.slug, p.id]));

  console.log(
    `   ${dbTeams.length} équipes, ${dbPlayers.length} joueurs chargés depuis DB.\n`,
  );

  const startedAt = new Date();
  let upserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    // Reconstituer le slug du joueur
    const parts = row.player_name.trim().split(" ");
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ");
    const slug = playerSlug(firstName, lastName);

    const playerId = playerById.get(slug);
    const teamId = teamByAbbr.get(row.team_abbr);

    if (!playerId || !teamId) {
      skipped++;
      continue;
    }

    try {
      await prisma.playerSeason.upsert({
        where: {
          playerId_season_teamId: { playerId, season: row.season, teamId },
        },
        update: {
          gamesPlayed: row.gp,
          minutesPerGame: row.min,
          pointsPerGame: row.pts ?? 0,
          reboundsPerGame: row.reb ?? 0,
          assistsPerGame: row.ast ?? 0,
          stealsPerGame: row.stl ?? 0,
          blocksPerGame: row.blk ?? 0,
          fgPct: row.fg_pct ?? undefined,
          threePtPct: row.fg3_pct ?? undefined,
          ftPct: row.ft_pct ?? undefined,
          trueShooting: row.ts_pct ?? undefined,
          usageRate: row.usg_pct ?? undefined,
          per: row.per ?? undefined,
        },
        create: {
          playerId,
          teamId,
          season: row.season,
          gamesPlayed: row.gp,
          minutesPerGame: row.min,
          pointsPerGame: row.pts ?? 0,
          reboundsPerGame: row.reb ?? 0,
          assistsPerGame: row.ast ?? 0,
          stealsPerGame: row.stl ?? 0,
          blocksPerGame: row.blk ?? 0,
          fgPct: row.fg_pct ?? undefined,
          threePtPct: row.fg3_pct ?? undefined,
          ftPct: row.ft_pct ?? undefined,
          trueShooting: row.ts_pct ?? undefined,
          usageRate: row.usg_pct ?? undefined,
          per: row.per ?? undefined,
        },
      });
      upserted++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${slug}/${row.season}: ${msg}`);
      skipped++;
    }

    if (upserted % 500 === 0 && upserted > 0) {
      process.stdout.write(`\r  ${upserted} upsertés…`);
    }
  }

  console.log(`\r  ${upserted} upsertés.   `);

  await prisma.syncLog.create({
    data: {
      source: "import-player-stats",
      status: errors.length === 0 ? "success" : "partial",
      itemsProcessed: upserted,
      errors: errors.length > 0 ? errors : undefined,
      startedAt,
      completedAt: new Date(),
    },
  });

  console.log(`\n✅ ${upserted} PlayerSeason en DB`);
  console.log(`⏭️  ${skipped} skipped (joueur ou équipe inconnus)`);
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
