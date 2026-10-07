/**
 * Backfill idempotent du calendrier ESPN, par lots mensuels.
 *
 * Usage :
 *   pnpm backfill:games --dry-run
 *   pnpm backfill:games
 *   pnpm backfill:games --season=2024-25
 */

import { PrismaClient } from "@prisma/client";
import { currentSeason } from "../lib/nba";
import { gameStatusFromEspn } from "../lib/game-status";
import { seasonAndPhaseFromEspn } from "../lib/season-phase";
import { monthsBetween } from "../lib/espn-scoreboard";

const prisma = new PrismaClient({ log: ["error"] });

const ESPN_TO_DB: Record<string, string> = {
  NY: "NYK",
  WSH: "WAS",
  GS: "GSW",
  UTAH: "UTA",
  NO: "NOP",
  SA: "SAS",
};

type EspnEvent = {
  id: string;
  date: string;
  season?: { year?: number; type?: number };
  competitions?: Array<{
    type?: { abbreviation?: string };
    status?: { type?: { name?: string } };
    competitors?: Array<{
      homeAway?: "home" | "away";
      team?: { abbreviation?: string };
      score?: string;
    }>;
  }>;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const season =
    args.find((arg) => arg.startsWith("--season="))?.split("=")[1] ??
    currentSeason();

  if (!/^\d{4}-\d{2}$/.test(season)) {
    throw new Error(`Saison invalide : ${season}`);
  }

  return { season, dryRun: args.includes("--dry-run") };
}

/**
 * Mois d'octobre à juin de la saison, au format AAAAMM. ESPN refuse les plages
 * de dates (400) mais accepte un mois entier (voir lib/espn-scoreboard.ts).
 */
function seasonMonths(season: string): string[] {
  const startYear = Number.parseInt(season.split("-")[0], 10);
  return monthsBetween(`${startYear}1001`, `${startYear + 1}0630`);
}

async function fetchEvents(month: string): Promise<EspnEvent[]> {
  const url =
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard" +
    `?dates=${month}&limit=500`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`ESPN ${response.status} pour ${month}`);
  }

  const data = (await response.json()) as { events?: EspnEvent[] };
  return data.events ?? [];
}

async function main() {
  const { season, dryRun } = parseArgs();
  const startedAt = new Date();
  const allEvents = new Map<string, EspnEvent>();

  console.log(`Backfill calendrier ${season}${dryRun ? " — simulation" : ""}\n`);

  for (const month of seasonMonths(season)) {
    const events = await fetchEvents(month);
    events.forEach((event) => allEvents.set(event.id, event));
    console.log(`${month}: ${events.length} événement(s)`);
  }

  const teams = await prisma.team.findMany({ select: { id: true, abbr: true } });
  const teamByAbbr = new Map(teams.map((team) => [team.abbr, team.id]));
  const known = new Set(
    (await prisma.game.findMany({ where: { season }, select: { espnId: true } })).map((game) => game.espnId),
  );
  const phases: Record<string, number> = {};
  let fresh = 0;
  let valid = 0;
  let upserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const event of allEvents.values()) {
    const competition = event.competitions?.[0];
    const home = competition?.competitors?.find(
      (competitor) => competitor.homeAway === "home",
    );
    const away = competition?.competitors?.find(
      (competitor) => competitor.homeAway === "away",
    );
    const homeAbbrRaw = home?.team?.abbreviation;
    const awayAbbrRaw = away?.team?.abbreviation;

    if (!competition || !homeAbbrRaw || !awayAbbrRaw) {
      skipped++;
      errors.push(`${event.id}: compétition ou équipe manquante`);
      continue;
    }

    const homeAbbr = ESPN_TO_DB[homeAbbrRaw] ?? homeAbbrRaw;
    const awayAbbr = ESPN_TO_DB[awayAbbrRaw] ?? awayAbbrRaw;
    const homeTeamId = teamByAbbr.get(homeAbbr);
    const awayTeamId = teamByAbbr.get(awayAbbr);

    if (!homeTeamId || !awayTeamId) {
      skipped++;
      errors.push(`${event.id}: équipe inconnue ${awayAbbr}@${homeAbbr}`);
      continue;
    }

    const classification = seasonAndPhaseFromEspn(event);
    if (!classification) {
      skipped++;
      errors.push(`${event.id}: saison ESPN absente`);
      continue;
    }
    if (classification.season !== season) {
      // Une plage mensuelle peut déborder sur la saison voisine (présaison
      // d'octobre) : ce match sera repris avec la bonne saison, pas forcé ici.
      skipped++;
      continue;
    }
    const { phase } = classification;

    const statusName = competition.status?.type?.name;
    const status = gameStatusFromEspn(statusName);
    const homeScore = status === "final" ? Number.parseInt(home.score ?? "", 10) : null;
    const awayScore = status === "final" ? Number.parseInt(away.score ?? "", 10) : null;

    if (
      status === "final" &&
      (!Number.isFinite(homeScore) || !Number.isFinite(awayScore))
    ) {
      skipped++;
      errors.push(`${event.id}: score final invalide`);
      continue;
    }

    valid++;
    phases[phase] = (phases[phase] ?? 0) + 1;
    if (!known.has(event.id)) fresh++;
    if (dryRun) continue;

    await prisma.game.upsert({
      where: { espnId: event.id },
      update: {
        homeTeamId,
        awayTeamId,
        gameDate: new Date(event.date),
        season,
        phase,
        homeScore,
        awayScore,
        status,
      },
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
  }

  console.log(
    `\n${allEvents.size} unique(s), ${valid} valide(s), ${skipped} ignoré(s)`,
  );
  console.log(`${fresh} nouveau(x) en base, ${valid - fresh} déjà connu(s) · ${JSON.stringify(phases)}`);
  if (errors.length > 0) {
    console.log(errors.slice(0, 10).map((error) => `- ${error}`).join("\n"));
  }

  if (dryRun) return;

  await prisma.syncLog.create({
    data: {
      source: "backfill-games",
      status: skipped === 0 ? "success" : "partial",
      itemsProcessed: upserted,
      errors: { skipped, messages: errors.slice(0, 50) },
      startedAt,
      completedAt: new Date(),
    },
  });
  console.log(`${upserted} match(s) upserté(s)`);
}

main()
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Backfill échoué : ${message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
