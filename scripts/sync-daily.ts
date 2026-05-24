/**
 * Sync quotidien — saison NBA en cours uniquement
 *
 * Ce script est déclenché chaque matin à 6h (Paris) par GitHub Actions.
 * Il met à jour :
 *   1. TeamSeason 2025-26 (standings ESPN API — fonctionne depuis GitHub Actions)
 *   2. summaryFr des équipes (régénération template)
 *   3. Invalide le cache ISR Vercel via /api/revalidate
 *
 * Note : les stats joueurs (PlayerSeason) ne sont pas syncées ici car
 * stats.nba.com et BDL bulk sont bloqués depuis les IPs CI.
 * Sync manuelle : pnpm tsx scripts/sync-player-stats.ts (en local).
 *
 * Run manuel: pnpm tsx scripts/sync-daily.ts
 */

import { PrismaClient } from "@prisma/client";
import { CURRENT_SEASON } from "../lib/nba";

const prisma = new PrismaClient({ log: ["error"] });

const VERCEL_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
const CRON_SECRET = process.env.CRON_SECRET ?? "";

// ESPN abréviation → abbr DB (6 divergences)
const ESPN_TO_DB: Record<string, string> = {
  NY: "NYK",
  WSH: "WAS",
  GS: "GSW",
  UTAH: "UTA",
  NO: "NOP",
  SA: "SAS",
};

// ─── 1. Sync standings (ESPN API) ────────────────────────────────────────────

async function syncStandings(): Promise<{
  upserted: number;
  skipped: number;
}> {
  console.log("\n🏆 Sync standings 2025-26 (ESPN API)…");

  // ESPN season = année de FIN de saison : "2025-26" → 2026
  const espnSeason = "20" + CURRENT_SEASON.split("-")[1];
  const url = `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${espnSeason}`;

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    console.warn(`  ⚠️  ESPN API ${res.status} — standings skippés. ${body}`);
    return { upserted: 0, skipped: 30 };
  }

  const data = (await res.json()) as {
    children: Array<{
      name: string;
      standings: {
        entries: Array<{
          team: { abbreviation: string };
          stats: Array<{ name: string; value: number }>;
        }>;
      };
    }>;
  };

  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  let upserted = 0;
  let skipped = 0;

  for (const conf of data.children ?? []) {
    for (const entry of conf.standings?.entries ?? []) {
      const espnAbbr = entry.team.abbreviation;
      const dbAbbr = ESPN_TO_DB[espnAbbr] ?? espnAbbr;
      const teamId = teamByAbbr.get(dbAbbr);
      if (!teamId) {
        skipped++;
        continue;
      }

      const statMap = new Map(entry.stats.map((s) => [s.name, s.value]));
      const wins = Math.round(statMap.get("wins") ?? 0);
      const losses = Math.round(statMap.get("losses") ?? 0);
      const conferenceRank =
        Math.round(statMap.get("playoffSeed") ?? 0) || null;

      try {
        // Lire le rang actuel avant d'écraser (pour l'indicateur ↑↓)
        const existing = await prisma.teamSeason.findUnique({
          where: { teamId_season: { teamId, season: CURRENT_SEASON } },
          select: { conferenceRank: true },
        });
        const previousConferenceRank = existing?.conferenceRank ?? null;

        await prisma.teamSeason.upsert({
          where: { teamId_season: { teamId, season: CURRENT_SEASON } },
          update: { wins, losses, conferenceRank, previousConferenceRank },
          create: {
            teamId,
            season: CURRENT_SEASON,
            wins,
            losses,
            conferenceRank,
            previousConferenceRank,
          },
        });
        upserted++;
      } catch {
        skipped++;
      }
    }
  }

  console.log(`  ✅ ${upserted} upserted, ${skipped} skipped`);
  return { upserted, skipped };
}

// ─── 2. Sync matchs (ESPN scoreboard) ────────────────────────────────────────

async function syncRecentGames(): Promise<{
  upserted: number;
  skipped: number;
}> {
  console.log("\n🏀 Sync matchs récents (ESPN scoreboard)…");

  // Dates à synchroniser : J-3, J-1, J, J+1, J+2
  const offsets = [-3, -1, 0, 1, 2];
  const dates = offsets.map((d) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return dt.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  });

  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  let upserted = 0;
  let skipped = 0;

  for (const date of dates) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`;
    type EspnEvent = {
      id: string;
      date: string;
      competitions: Array<{
        status: { type: { name: string } };
        competitors: Array<{
          homeAway: string;
          team: { abbreviation: string };
          score: string;
        }>;
      }>;
    };

    let data: { events?: EspnEvent[] };
    try {
      const res = await fetch(url);
      if (!res.ok) {
        skipped++;
        continue;
      }
      data = (await res.json()) as { events?: EspnEvent[] };
    } catch {
      skipped++;
      continue;
    }

    for (const event of data.events ?? []) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const home = comp.competitors.find((c) => c.homeAway === "home");
      const away = comp.competitors.find((c) => c.homeAway === "away");
      if (!home || !away) continue;

      const homeAbbr =
        ESPN_TO_DB[home.team.abbreviation] ?? home.team.abbreviation;
      const awayAbbr =
        ESPN_TO_DB[away.team.abbreviation] ?? away.team.abbreviation;
      const homeTeamId = teamByAbbr.get(homeAbbr);
      const awayTeamId = teamByAbbr.get(awayAbbr);
      if (!homeTeamId || !awayTeamId) {
        skipped++;
        continue;
      }

      const isFinal = comp.status.type.name === "STATUS_FINAL";
      const status = isFinal ? "final" : "scheduled";
      const homeScore = isFinal ? parseInt(home.score, 10) : null;
      const awayScore = isFinal ? parseInt(away.score, 10) : null;

      try {
        await prisma.game.upsert({
          where: { espnId: event.id },
          update: { homeScore, awayScore, status },
          create: {
            espnId: event.id,
            homeTeamId,
            awayTeamId,
            gameDate: new Date(event.date),
            season: CURRENT_SEASON,
            homeScore,
            awayScore,
            status,
          },
        });
        upserted++;
      } catch {
        skipped++;
      }
    }
  }

  console.log(`  ✅ ${upserted} matchs upserted, ${skipped} skipped`);
  return { upserted, skipped };
}

// ─── 3. Régénération résumés équipes ─────────────────────────────────────────
// Note : les biographies joueurs sont générées séparément (script one-shot)
// car elles sont stables dans le temps (draft, université, parcours).

async function regenerateSummaries(): Promise<void> {
  console.log("\n📝 Régénération résumés équipes…");

  // Équipes
  const teamSeasons = await prisma.teamSeason.findMany({
    where: { season: CURRENT_SEASON },
    include: { team: { select: { city: true, name: true, conference: true } } },
  });

  const perfLevel = (w: number, l: number) => {
    const pct = w / (w + l);
    if (pct >= 0.7) return "exceptionnelle";
    if (pct >= 0.6) return "très solide";
    if (pct >= 0.5) return "positive";
    if (pct >= 0.4) return "difficile";
    return "compliquée";
  };

  const rankLabel = (r: number | null) => {
    if (!r) return "";
    if (r === 1) return "en tête de leur conférence (1re place)";
    if (r <= 3) return `dans le top 3 de leur conférence (${r}e)`;
    if (r <= 6) return `en bonne position pour les playoffs (${r}e)`;
    return `au ${r}e rang de leur conférence`;
  };

  const playoffOutcome = (code: string | null) => {
    if (!code) return "n'ont pas de résultat de playoff enregistré";
    const c = code
      .replace(/\s*-\s*/, "")
      .toLowerCase()
      .trim();
    if (c === "w") return "ont remporté le titre NBA";
    if (c === "e")
      return "ont atteint les Finales NBA (champions de la Conférence Est)";
    if (["a", "se", "c"].includes(c))
      return "ont remporté leur division (Conférence Est)";
    if (["nw", "sw", "p"].includes(c))
      return "ont remporté leur division (Conférence Ouest)";
    if (c === "x") return "se sont qualifiés pour les playoffs";
    if (c === "pi") return "ont participé au play-in";
    return "n'ont pas accédé aux playoffs";
  };

  let teamDone = 0;
  for (const ts of teamSeasons) {
    const confFr = ts.team.conference === "East" ? "Est" : "Ouest";
    const perf = perfLevel(ts.wins, ts.losses);
    const rankStr = rankLabel(ts.conferenceRank);
    const outcome = playoffOutcome(ts.playoffResult);
    const summary =
      `Les ${ts.team.city} ${ts.team.name} ont réalisé une saison ${CURRENT_SEASON} ${perf} ` +
      `avec un bilan de ${ts.wins}-${ts.losses}${rankStr ? `, terminant ${rankStr}` : ""} ` +
      `en Conférence ${confFr}. À l'issue de la saison régulière, ils ${outcome}.`;
    await prisma.teamSeason.update({
      where: { id: ts.id },
      data: { summaryFr: summary },
    });
    teamDone++;
  }
  console.log(`  ✅ ${teamDone} résumés équipes régénérés`);
}

// ─── 4. Revalidate Vercel ISR ─────────────────────────────────────────────────

async function revalidateVercel(): Promise<void> {
  if (!VERCEL_URL || !CRON_SECRET) {
    console.log(
      "\n⚠️  VERCEL_URL ou CRON_SECRET absent — revalidation skippée",
    );
    return;
  }
  console.log("\n🔄 Revalidation cache Vercel…");
  try {
    const res = await fetch(`${VERCEL_URL}/api/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (res.ok) {
      console.log("  ✅ Cache invalidé");
    } else {
      console.warn(`  ⚠️  /api/revalidate a répondu ${res.status}`);
    }
  } catch (e) {
    console.warn(`  ⚠️  Revalidation échouée : ${e}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = new Date();
  console.log(`🏀 Sync quotidien NBA — ${CURRENT_SEASON}`);
  console.log(`   Démarré à : ${startedAt.toISOString()}\n`);

  let status = "success";
  const errors: string[] = [];

  try {
    const standingsResult = await syncStandings();
    const gamesResult = await syncRecentGames();
    await regenerateSummaries();
    await revalidateVercel();

    await prisma.syncLog.create({
      data: {
        source: "sync-daily",
        status,
        itemsProcessed: standingsResult.upserted + gamesResult.upserted,
        errors: {
          standingsSkipped: standingsResult.skipped,
          gamesSkipped: gamesResult.skipped,
          messages: errors,
        },
        startedAt,
        completedAt: new Date(),
      },
    });
  } catch (e) {
    status = "error";
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ Sync échouée : ${msg}`);
    await prisma.syncLog.create({
      data: {
        source: "sync-daily",
        status,
        itemsProcessed: 0,
        errors: { fatal: msg },
        startedAt,
        completedAt: new Date(),
      },
    });
    process.exit(1);
  }

  const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);
  console.log(`\n✅ Sync terminée en ${elapsed}s`);
}

main().finally(() => prisma.$disconnect());
