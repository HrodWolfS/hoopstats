/**
 * Sync quotidien — saison NBA en cours uniquement
 *
 * Ce script est déclenché chaque matin à 6h (Paris) par GitHub Actions.
 * Il met à jour :
 *   1. TeamSeason de la saison en cours (standings ESPN API — fonctionne depuis GitHub Actions)
 *   2. Matchs, séries de playoffs, box scores et agrégats joueurs
 *   3. Invalide le cache ISR Vercel via /api/revalidate
 *
 * Le résumé de saison d'une équipe n'est plus écrit en base : la page le
 * compose au rendu depuis le bilan et les séries de playoffs vérifiés
 * (`teamSeasonSummary`). L'ancien gabarit lisait le code de qualification
 * ESPN comme un résultat de playoffs.
 *
 * Note : les stats joueurs (PlayerSeason) ne sont pas syncées ici car
 * stats.nba.com et BDL bulk sont bloqués depuis les IPs CI.
 * Sync manuelle : pnpm tsx scripts/sync-player-stats.ts (en local).
 *
 * Run manuel: pnpm tsx scripts/sync-daily.ts
 */

import { PrismaClient } from "@prisma/client";
import { currentSeason, espnSeasonYear } from "../lib/nba";
import { gameStatusFromEspn } from "../lib/game-status";
import { seasonAndPhaseFromEspn } from "../lib/season-phase";
import { fetchPlayoffEvents } from "../lib/espn-scoreboard";
import { syncBoxScores } from "./sync-box-scores";
import { syncPlayerSeasons } from "./sync-player-seasons";

/** Saison synchronisée : figée au lancement pour que toutes les étapes concordent. */
const CURRENT_SEASON = currentSeason();

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
  console.log(`\n🏆 Sync standings ${CURRENT_SEASON} (ESPN API)…`);

  // ESPN season = année de FIN de saison : "2025-26" → 2026. Sans
  // seasontype=2, ESPN renvoie les bilans de présaison avant la reprise.
  const espnSeason = espnSeasonYear(CURRENT_SEASON);
  const url = `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${espnSeason}&seasontype=2`;

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

  // Dates à synchroniser : J-3 à J+2 (fenêtre glissante complète)
  const offsets = [-3, -2, -1, 0, 1, 2];
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
      season?: { year?: number; type?: number };
      competitions: Array<{
        type?: { abbreviation?: string };
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

      // Saison et phase viennent de l'événement : un match de présaison
      // d'octobre appartient à la saison qui commence, pas à CURRENT_SEASON.
      const classification = seasonAndPhaseFromEspn(event);
      if (!classification) {
        skipped++;
        continue;
      }
      const { season, phase } = classification;

      const statusName = comp.status.type.name;
      const status = gameStatusFromEspn(statusName);
      const isFinal = status === "final";
      const homeScore = isFinal ? parseInt(home.score, 10) : null;
      const awayScore = isFinal ? parseInt(away.score, 10) : null;

      try {
        await prisma.game.upsert({
          where: { espnId: event.id },
          // Ne mettre à jour le score que si le match est terminé
          // (évite d'écraser "final" avec un statut en cours lors d'un retry)
          update: isFinal
            ? { homeScore, awayScore, status, season, phase }
            : { status, season, phase },
          create: {
            espnId: event.id,
            homeTeamId,
            awayTeamId,
            gameDate: new Date(event.date),
            season,
            phase,
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

// ─── 3. Sync playoffs (saison courante) ──────────────────────────────────────

function parsePlayoffNote(
  text: string,
): { conference: "WEST" | "EAST" | "FINALS"; round: 1 | 2 | 3 | 4 } | null {
  const t = text.toLowerCase().trim();
  if (t.includes("nba finals")) return { conference: "FINALS", round: 4 };
  const conference: "WEST" | "EAST" | null = t.startsWith("west")
    ? "WEST"
    : t.startsWith("east")
      ? "EAST"
      : null;
  if (!conference) return null;
  if (t.includes("semi")) return { conference, round: 2 };
  if (t.includes("finals") || t.includes("final"))
    return { conference, round: 3 };
  if (t.includes("first") || t.includes("1st")) return { conference, round: 1 };
  return null;
}

async function syncCurrentPlayoffs(): Promise<{
  upserted: number;
  skipped: number;
}> {
  console.log("\n🏆 Sync playoffs en cours…");

  const season = CURRENT_SEASON;
  const endYear = 2000 + parseInt(season.split("-")[1]);

  type EspnCompetitor = {
    id: string;
    team: { id: string; abbreviation: string; displayName: string };
    homeAway: string;
  };
  type EspnEvent = {
    id: string;
    date: string;
    season?: { type?: number };
    competitions: Array<{
      notes?: Array<{ headline?: string; text?: string }>;
      series?: {
        completed: boolean;
        summary: string;
        competitors: Array<{ id: string; wins: number }>;
      };
      competitors: EspnCompetitor[];
      status: { type: { name: string } };
      broadcasts?: Array<{ names: string[] }>;
    }>;
  };

  const [games, standingsRes] = await Promise.all([
    fetchPlayoffEvents<EspnEvent>(`${endYear}0401`, `${endYear}0731`),
    fetch(
      `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${endYear}`,
    ),
  ]);

  if (!games.ok) {
    console.warn(`  ⚠️  ESPN scoreboard ${games.status} — playoffs skippés`);
    return { upserted: 0, skipped: 1 };
  }

  const standingsData = standingsRes.ok
    ? await standingsRes.json()
    : { children: [] };
  const { events } = games;

  if (events.length === 0) {
    console.log("  ℹ️  Aucun match playoff trouvé (hors saison)");
    return { upserted: 0, skipped: 0 };
  }

  // Seeds depuis standings
  const seedMap = new Map<string, number>();
  for (const conf of (
    standingsData as {
      children?: Array<{
        standings?: {
          entries?: Array<{
            team?: { abbreviation?: string };
            stats?: Array<{ name: string; value: number }>;
          }>;
        };
      }>;
    }
  ).children ?? []) {
    for (const entry of conf.standings?.entries ?? []) {
      const abbr = entry.team?.abbreviation;
      const stat = entry.stats?.find((s) => s.name === "playoffSeed");
      if (abbr && stat) seedMap.set(abbr, stat.value);
    }
  }

  // Teams DB
  const dbTeams = await prisma.team.findMany({
    select: { id: true, abbr: true },
  });
  const teamByAbbr = new Map(dbTeams.map((t) => [t.abbr, t.id]));

  // Grouper les événements en séries
  type SeriesAccum = {
    conf: "WEST" | "EAST" | "FINALS";
    round: 1 | 2 | 3 | 4;
    espnTeam1: EspnCompetitor;
    espnTeam2: EspnCompetitor;
    wins1: number;
    wins2: number;
    completed: boolean;
    summary: string;
    gameNumber: number;
    nextGameDate: string | null;
    nextGameNetwork: string | null;
  };

  const seriesMap = new Map<string, SeriesAccum>();

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const noteText = comp.notes?.[0]?.headline ?? comp.notes?.[0]?.text ?? "";
    const parsed = parsePlayoffNote(noteText);
    if (!parsed) continue;
    const { conference, round } = parsed;
    const [c1, c2] = comp.competitors ?? [];
    if (!c1 || !c2) continue;

    const ids = [c1.team.id, c2.team.id].sort();
    const key = `${conference}-${round}-${ids[0]}-${ids[1]}`;
    const seriesObj = comp.series;
    const gameMatch = noteText.match(/game\s*(\d+)/i);
    const gameNumber = gameMatch ? parseInt(gameMatch[1]) : 1;
    const isScheduled = comp.status?.type?.name === "STATUS_SCHEDULED";

    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        conf: conference,
        round,
        espnTeam1: c1,
        espnTeam2: c2,
        wins1: seriesObj?.competitors.find((c) => c.id === c1.id)?.wins ?? 0,
        wins2: seriesObj?.competitors.find((c) => c.id === c2.id)?.wins ?? 0,
        completed: seriesObj?.completed ?? false,
        summary: seriesObj?.summary ?? "",
        gameNumber,
        nextGameDate: isScheduled ? event.date : null,
        nextGameNetwork: isScheduled
          ? (comp.broadcasts?.[0]?.names?.[0] ?? null)
          : null,
      });
    } else {
      const ex = seriesMap.get(key)!;
      if (seriesObj) {
        const w1 = seriesObj.competitors.find(
          (c) => c.id === ex.espnTeam1.id,
        )?.wins;
        const w2 = seriesObj.competitors.find(
          (c) => c.id === ex.espnTeam2.id,
        )?.wins;
        // Toujours prendre le max — ESPN peut retourner les events hors ordre,
        // et le score d'un vieux match écraserait sinon le score actuel.
        if (w1 !== undefined) ex.wins1 = Math.max(ex.wins1, w1);
        if (w2 !== undefined) ex.wins2 = Math.max(ex.wins2, w2);
        ex.completed = seriesObj.completed || ex.completed;
        ex.summary = seriesObj.summary || ex.summary;
      }
      ex.gameNumber = Math.max(ex.gameNumber, gameNumber);
      if (isScheduled && !ex.nextGameDate) {
        ex.nextGameDate = event.date;
        ex.nextGameNetwork = comp.broadcasts?.[0]?.names?.[0] ?? null;
      }
    }
  }

  let upserted = 0;
  let skipped = 0;

  for (const [, s] of seriesMap) {
    const abbr1 =
      ESPN_TO_DB[s.espnTeam1.team.abbreviation] ??
      s.espnTeam1.team.abbreviation;
    const abbr2 =
      ESPN_TO_DB[s.espnTeam2.team.abbreviation] ??
      s.espnTeam2.team.abbreviation;
    const dbId1 = teamByAbbr.get(abbr1);
    const dbId2 = teamByAbbr.get(abbr2);
    if (!dbId1 || !dbId2) {
      skipped++;
      continue;
    }

    const seed1 =
      seedMap.get(abbr1) ?? seedMap.get(s.espnTeam1.team.abbreviation) ?? null;
    const seed2 =
      seedMap.get(abbr2) ?? seedMap.get(s.espnTeam2.team.abbreviation) ?? null;
    const flip = (seed1 ?? 9) > (seed2 ?? 9);
    const [t1Id, t2Id, w1, w2, s1, s2] = flip
      ? [dbId2, dbId1, s.wins2, s.wins1, seed2, seed1]
      : [dbId1, dbId2, s.wins1, s.wins2, seed1, seed2];

    try {
      await prisma.playoffSeries.upsert({
        where: {
          season_conference_round_team1Id_team2Id: {
            season,
            conference: s.conf,
            round: s.round,
            team1Id: t1Id,
            team2Id: t2Id,
          },
        },
        update: {
          team1Seed: s1,
          team2Seed: s2,
          team1Wins: w1,
          team2Wins: w2,
          completed: s.completed,
          summary: s.summary || null,
          gameNumber: s.gameNumber,
          nextGameDate: s.nextGameDate ? new Date(s.nextGameDate) : null,
          nextGameNetwork: s.nextGameNetwork,
        },
        create: {
          season,
          conference: s.conf,
          round: s.round,
          team1Id: t1Id,
          team2Id: t2Id,
          team1Seed: s1,
          team2Seed: s2,
          team1Wins: w1,
          team2Wins: w2,
          completed: s.completed,
          summary: s.summary || null,
          gameNumber: s.gameNumber,
          nextGameDate: s.nextGameDate ? new Date(s.nextGameDate) : null,
          nextGameNetwork: s.nextGameNetwork,
        },
      });
      upserted++;
    } catch {
      skipped++;
    }
  }

  console.log(`  ✅ ${upserted} séries upsertées, ${skipped} skippées`);
  return { upserted, skipped };
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

  try {
    const standingsResult = await syncStandings();
    const gamesResult = await syncRecentGames();
    const playoffsResult = await syncCurrentPlayoffs();

    // Box scores ESPN pour les matchs terminés des 7 derniers jours
    console.log("\n📊 Sync box scores ESPN…");
    const boxScoreResult = await syncBoxScores({ recent: true });

    // Agrégats de saison, recalculés depuis les box scores qui viennent
    // d'arriver. Sans cette étape, les moyennes affichées restent figées à
    // la dernière exécution manuelle (décision 001).
    console.log("\n🧮 Recalcul des agrégats joueurs…");
    const seasonResult = await syncPlayerSeasons(CURRENT_SEASON);
    console.log(`  ✅ ${seasonResult.written} ligne(s) écrites`);
    if (seasonResult.skipped.length > 0) {
      console.log(
        `  ⚠️  ${seasonResult.skipped.length} conservée(s) : le total de matchs reculerait`,
      );
    }

    await revalidateVercel();

    const issueCount =
      standingsResult.skipped +
      gamesResult.skipped +
      playoffsResult.skipped +
      boxScoreResult.errors;
    const status = issueCount === 0 ? "success" : "partial";

    await prisma.syncLog.create({
      data: {
        source: "sync-daily",
        status,
        itemsProcessed:
          standingsResult.upserted +
          gamesResult.upserted +
          playoffsResult.upserted +
          boxScoreResult.synced +
          seasonResult.written,
        errors: {
          standingsSkipped: standingsResult.skipped,
          gamesSkipped: gamesResult.skipped,
          playoffsSkipped: playoffsResult.skipped,
          boxScoresErrors: boxScoreResult.errors,
          playerSeasonsSkipped: seasonResult.skipped.length,
          issueCount,
        },
        startedAt,
        completedAt: new Date(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\n❌ Sync échouée : ${msg}`);
    await prisma.syncLog.create({
      data: {
        source: "sync-daily",
        status: "error",
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
