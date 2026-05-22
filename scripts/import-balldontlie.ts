/**
 * Sprint 2.2 — Import joueurs + stats saisons depuis balldontlie.io
 *
 * Prérequis:
 *   - BALLDONTLIE_API_KEY dans .env (créer compte sur https://app.balldontlie.io)
 *   - 30 équipes déjà seedées (pnpm tsx scripts/seed-teams.ts)
 *
 * Run: pnpm tsx scripts/import-balldontlie.ts
 *
 * Durée estimée: ~2-3h (rate limit 60 req/min free tier)
 * Volume attendu: ~600 joueurs, ~5000 PlayerSeason
 */

import { PrismaClient } from "@prisma/client";
import { playerSlug } from "../lib/slugs";

const prisma = new PrismaClient({ log: ["error"] });

const BASE_URL = "https://api.balldontlie.io/v1";
const API_KEY = process.env.BALLDONTLIE_API_KEY ?? "";

// Saisons à importer : 2015-16 → 2024-25
const SEASONS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

// Format DB : 2024 → "2024-25"
function seasonLabel(year: number): string {
  return `${year}-${String(year + 1).slice(2)}`;
}

// Rate limit free tier: 60 req/min → 1 req/sec
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Types BDL ───────────────────────────────────────────────────────────────

type BdlTeam = {
  id: number;
  abbreviation: string;
  city: string;
  name: string;
  conference: string;
  division: string;
  full_name: string;
};

type BdlPlayer = {
  id: number;
  first_name: string;
  last_name: string;
  position: string | null;
  height: string | null;
  weight: string | null;
  jersey_number: string | null;
  college: string | null;
  country: string | null;
  draft_year: number | null;
  draft_round: number | null;
  draft_number: number | null;
  team: BdlTeam | null;
};

type BdlSeasonAverageStats = {
  ast: number;
  blk: number;
  dreb: number;
  fga: number;
  fgm: number;
  fg_pct: number | null;
  fg3a: number;
  fg3m: number;
  fg3_pct: number | null;
  fta: number;
  ftm: number;
  ft_pct: number | null;
  min: string | number; // BDL returns "32.5" or 32.5
  oreb: number;
  pf: number;
  pts: number;
  reb: number;
  stl: number;
  tov: number;
  gp?: number; // games played (présent dans certaines réponses)
};

type BdlSeasonAverage = {
  player: BdlPlayer;
  season: number;
  season_type: string;
  stats: BdlSeasonAverageStats;
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function bdlGet<T>(
  path: string,
  params: Record<string, string | number | string[]> = {},
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(`${key}[]`, String(v)));
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: API_KEY },
  });

  if (!res.ok) {
    throw new Error(`BDL ${res.status} on ${url.toString()}`);
  }

  return res.json() as Promise<T>;
}

// Fetch toutes les pages avec cursor pagination
async function bdlGetAll<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T[]> {
  const results: T[] = [];
  let cursor: number | null = null;

  do {
    const pageParams: Record<string, string | number> = {
      ...params,
      per_page: 100,
      ...(cursor !== null ? { cursor } : {}),
    };

    const data: { data: T[]; meta: { next_cursor?: number } } = await bdlGet<{
      data: T[];
      meta: { next_cursor?: number };
    }>(path, pageParams);

    results.push(...data.data);

    cursor = data.meta.next_cursor ?? null;

    process.stdout.write(
      `\r  fetched ${results.length} records (cursor: ${cursor ?? "done"})    `,
    );

    if (cursor !== null) {
      await sleep(1100); // rate limit
    }
  } while (cursor !== null);

  console.log(); // newline après la progression
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error(
      "❌ BALLDONTLIE_API_KEY manquante.\n" +
        "   1. Crée un compte sur https://app.balldontlie.io\n" +
        "   2. Copie la clé API dans .env : BALLDONTLIE_API_KEY=ta_clé\n",
    );
    process.exit(1);
  }

  const startedAt = new Date();
  let totalPlayers = 0;
  let totalSeasons = 0;
  const errors: { type: string; message: string }[] = [];

  // ── 1. Charger le mapping abbr → teamId depuis notre DB ──────────────────

  console.log("📋 Chargement équipes depuis DB…");
  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));
  console.log(`   ${dbTeams.length} équipes chargées.\n`);

  // ── 2. Import joueurs ─────────────────────────────────────────────────────

  console.log("👤 Import joueurs…");
  const bdlPlayers = await bdlGetAll<BdlPlayer>("/players", {});
  console.log(`   ${bdlPlayers.length} joueurs récupérés depuis BDL.\n`);

  // Map bdlId → { slug, dbId, teamAbbr }
  const playerMap = new Map<
    number,
    { slug: string; dbId: string; teamAbbr: string | null }
  >();

  console.log("💾 Upsert joueurs en DB…");
  let i = 0;
  for (const p of bdlPlayers) {
    i++;
    const slug = playerSlug(p.first_name, p.last_name);
    const teamAbbr = p.team?.abbreviation ?? null;

    try {
      const dbPlayer = await prisma.player.upsert({
        where: { slug },
        update: {
          firstName: p.first_name,
          lastName: p.last_name,
          position: p.position ?? undefined,
          height: p.height ?? undefined,
          weight: p.weight ?? undefined,
          country: p.country ?? undefined,
          college: p.college ?? undefined,
          draftYear: p.draft_year ?? undefined,
          draftPick: p.draft_number ?? undefined,
        },
        create: {
          slug,
          firstName: p.first_name,
          lastName: p.last_name,
          position: p.position ?? undefined,
          height: p.height ?? undefined,
          weight: p.weight ?? undefined,
          country: p.country ?? undefined,
          college: p.college ?? undefined,
          draftYear: p.draft_year ?? undefined,
          draftPick: p.draft_number ?? undefined,
        },
      });

      playerMap.set(p.id, { slug, dbId: dbPlayer.id, teamAbbr });
      totalPlayers++;
    } catch (e) {
      errors.push({
        type: "player_upsert",
        message: `${slug}: ${e instanceof Error ? e.message : String(e)}`,
      });
    }

    if (i % 50 === 0) {
      process.stdout.write(`\r  ${i}/${bdlPlayers.length} traités…`);
    }

    await sleep(50); // on est en DB pas en API, pas besoin de ralentir autant
  }

  console.log(`\n✅ ${totalPlayers} joueurs en DB.\n`);

  // ── 3. Import stats par saison ────────────────────────────────────────────

  for (const season of SEASONS) {
    const label = seasonLabel(season);
    console.log(`📊 Saison ${label} (API season=${season})…`);

    let seasonStats: BdlSeasonAverage[] = [];

    try {
      seasonStats = await bdlGetAll<BdlSeasonAverage>(
        "/season_averages/general",
        {
          season,
          season_type: "regular",
          type: "base",
        },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ⚠️  Erreur fetch saison ${label}: ${msg}`);
      errors.push({ type: "season_fetch", message: `${label}: ${msg}` });
      continue;
    }

    console.log(`   ${seasonStats.length} lignes reçues.`);

    let seasonInserted = 0;
    let seasonSkipped = 0;

    for (const row of seasonStats) {
      const playerInfo = playerMap.get(row.player.id);
      if (!playerInfo) {
        seasonSkipped++;
        continue;
      }

      // Résoudre l'équipe : d'abord celle de la réponse BDL, sinon celle du joueur
      const teamAbbr =
        row.player.team?.abbreviation ?? playerInfo.teamAbbr ?? null;

      const teamId = teamAbbr ? (teamByAbbr.get(teamAbbr) ?? null) : null;

      if (!teamId) {
        // Joueur sans équipe connue (free agent, G-League) → on skip
        seasonSkipped++;
        continue;
      }

      const { stats } = row;
      const gamesPlayed = stats.gp ?? 1; // fallback à 1 si absent
      const minutesPerGame =
        typeof stats.min === "string" ? parseFloat(stats.min) : stats.min;

      try {
        await prisma.playerSeason.upsert({
          where: {
            playerId_season_teamId: {
              playerId: playerInfo.dbId,
              season: label,
              teamId,
            },
          },
          update: {
            gamesPlayed,
            minutesPerGame,
            pointsPerGame: stats.pts,
            reboundsPerGame: stats.reb,
            assistsPerGame: stats.ast,
            stealsPerGame: stats.stl,
            blocksPerGame: stats.blk,
            fgPct: stats.fg_pct ?? undefined,
            threePtPct: stats.fg3_pct ?? undefined,
            ftPct: stats.ft_pct ?? undefined,
          },
          create: {
            playerId: playerInfo.dbId,
            teamId,
            season: label,
            gamesPlayed,
            minutesPerGame,
            pointsPerGame: stats.pts,
            reboundsPerGame: stats.reb,
            assistsPerGame: stats.ast,
            stealsPerGame: stats.stl,
            blocksPerGame: stats.blk,
            fgPct: stats.fg_pct ?? undefined,
            threePtPct: stats.fg3_pct ?? undefined,
            ftPct: stats.ft_pct ?? undefined,
          },
        });
        seasonInserted++;
        totalSeasons++;
      } catch (e) {
        errors.push({
          type: "playerseason_upsert",
          message: `${playerInfo.slug}/${label}: ${e instanceof Error ? e.message : String(e)}`,
        });
        seasonSkipped++;
      }
    }

    console.log(
      `   ✓ ${seasonInserted} upserted, ${seasonSkipped} skipped (no team / unknown player)\n`,
    );

    await sleep(1100); // rate limit entre les saisons
  }

  // ── 4. SyncLog ────────────────────────────────────────────────────────────

  await prisma.syncLog.create({
    data: {
      source: "import-balldontlie",
      status: errors.length === 0 ? "success" : "partial",
      itemsProcessed: totalPlayers + totalSeasons,
      errors: errors.length > 0 ? errors : undefined,
      startedAt,
      completedAt: new Date(),
    },
  });

  console.log("─".repeat(60));
  console.log(`✅ Import terminé`);
  console.log(`   Joueurs : ${totalPlayers}`);
  console.log(`   PlayerSeason : ${totalSeasons}`);
  if (errors.length > 0) {
    console.warn(`   ⚠️  ${errors.length} erreurs (voir SyncLog en DB)`);
  }
  console.log(`📋 SyncLog enregistré.`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur fatale:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
