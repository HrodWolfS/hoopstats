/**
 * Sprint 11 — Import historique PlayerSeason (1980-81 → 2014-15)
 *
 * Lit scripts/data/player-stats-history.json généré par fetch-player-stats-history.py
 *
 * Stratégie :
 *  - Upsert Player par slug (firstName + lastName) — crée un joueur minimal si inconnu
 *  - Upsert PlayerSeason par (playerId, season, teamId)
 *  - Les stats avancées (PER, TS%, BPM…) restent null pour les saisons historiques
 *
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-player-stats-history.ts
 *      npm run import:player-stats-history   (si script ajouté dans package.json)
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { playerSlug } from "../lib/slugs";

const prisma = new PrismaClient({ log: ["error"] });

type HistoryRow = {
  nba_player_id: number;
  first_name: string;
  last_name: string;
  season: string;
  team_abbr: string;
  games_played: number;
  minutes_per_game: number | null;
  points_per_game: number | null;
  rebounds_per_game: number | null;
  assists_per_game: number | null;
  steals_per_game: number | null;
  blocks_per_game: number | null;
  fg_pct: number | null;
  three_pt_pct: number | null;
  ft_pct: number | null;
};

async function main() {
  const filePath = join(__dirname, "data", "player-stats-history.json");

  let rows: HistoryRow[];
  try {
    rows = JSON.parse(readFileSync(filePath, "utf-8")) as HistoryRow[];
  } catch {
    console.error(
      `❌ Fichier introuvable: ${filePath}\n` +
        `   Lance d'abord: python3 scripts/fetch-player-stats-history.py`,
    );
    process.exit(1);
  }

  console.log(`📊 Import PlayerSeason historique — ${rows.length} lignes\n`);

  // ── Maps DB ───────────────────────────────────────────────────────────────
  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  const dbPlayers = await prisma.player.findMany({
    select: { id: true, slug: true },
  });
  const playerBySlug = new Map(dbPlayers.map((p) => [p.slug, p.id]));

  console.log(
    `   ${dbTeams.length} équipes, ${dbPlayers.length} joueurs existants en DB.\n`,
  );

  const startedAt = new Date();
  let upsertedPlayers = 0;
  let upsertedSeasons = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Traiter par batch pour les logs
  let processed = 0;

  for (const row of rows) {
    processed++;

    // ── 1. Résoudre l'équipe ─────────────────────────────────────────────
    const teamId = teamByAbbr.get(row.team_abbr);
    if (!teamId) {
      // Équipe inconnue (franchise disparue non mappée, etc.)
      skipped++;
      continue;
    }

    // ── 2. Upsert Player ─────────────────────────────────────────────────
    const slug = playerSlug(row.first_name, row.last_name);

    let playerId = playerBySlug.get(slug);

    if (!playerId) {
      try {
        const player = await prisma.player.upsert({
          where: { slug },
          update: {}, // ne pas écraser les données riches existantes
          create: {
            firstName: row.first_name,
            lastName: row.last_name,
            slug,
          },
          select: { id: true },
        });
        playerId = player.id;
        playerBySlug.set(slug, playerId);
        upsertedPlayers++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`player/${slug}: ${msg}`);
        skipped++;
        continue;
      }
    }

    // ── 3. Upsert PlayerSeason ───────────────────────────────────────────
    try {
      await prisma.playerSeason.upsert({
        where: {
          playerId_season_teamId: { playerId, season: row.season, teamId },
        },
        update: {
          gamesPlayed: row.games_played,
          minutesPerGame: row.minutes_per_game ?? 0,
          pointsPerGame: row.points_per_game ?? 0,
          reboundsPerGame: row.rebounds_per_game ?? 0,
          assistsPerGame: row.assists_per_game ?? 0,
          stealsPerGame: row.steals_per_game ?? 0,
          blocksPerGame: row.blocks_per_game ?? 0,
          fgPct: row.fg_pct ?? undefined,
          threePtPct: row.three_pt_pct ?? undefined,
          ftPct: row.ft_pct ?? undefined,
        },
        create: {
          playerId,
          teamId,
          season: row.season,
          gamesPlayed: row.games_played,
          minutesPerGame: row.minutes_per_game ?? 0,
          pointsPerGame: row.points_per_game ?? 0,
          reboundsPerGame: row.rebounds_per_game ?? 0,
          assistsPerGame: row.assists_per_game ?? 0,
          stealsPerGame: row.steals_per_game ?? 0,
          blocksPerGame: row.blocks_per_game ?? 0,
          fgPct: row.fg_pct ?? undefined,
          threePtPct: row.three_pt_pct ?? undefined,
          ftPct: row.ft_pct ?? undefined,
          // Stats avancées non disponibles pour les saisons historiques
          per: undefined,
          trueShooting: undefined,
          usageRate: undefined,
          bpm: undefined,
          vorp: undefined,
          winShares: undefined,
        },
      });
      upsertedSeasons++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${slug}/${row.season}: ${msg}`);
      skipped++;
    }

    if (processed % 500 === 0) {
      process.stdout.write(
        `\r  ${processed}/${rows.length} traités — ${upsertedSeasons} saisons, ${upsertedPlayers} nouveaux joueurs…`,
      );
    }
  }

  console.log(
    `\r  ${processed}/${rows.length} traités — ${upsertedSeasons} saisons, ${upsertedPlayers} nouveaux joueurs.   `,
  );

  // ── SyncLog ──────────────────────────────────────────────────────────────
  await prisma.syncLog.create({
    data: {
      source: "import-player-stats-history",
      status: errors.length === 0 ? "success" : "partial",
      itemsProcessed: upsertedSeasons,
      errors: errors.length > 0 ? errors.slice(0, 50) : undefined,
      startedAt,
      completedAt: new Date(),
    },
  });

  console.log(`\n✅ ${upsertedSeasons} PlayerSeason upsertés`);
  console.log(`👤 ${upsertedPlayers} nouveaux joueurs créés`);
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
