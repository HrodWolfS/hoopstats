/**
 * Backfill idempotent du calendrier ESPN, par lots mensuels.
 *
 * Usage :
 *   pnpm backfill:games --dry-run
 *   pnpm backfill:games
 *   pnpm backfill:games --season=2024-25
 */

import { PrismaClient } from "@prisma/client";
import { CURRENT_SEASON } from "../lib/nba";
import { gameStatusFromEspn } from "../lib/game-status";

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
  competitions?: Array<{
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
    CURRENT_SEASON;

  if (!/^\d{4}-\d{2}$/.test(season)) {
    throw new Error(`Saison invalide : ${season}`);
  }

  return { season, dryRun: args.includes("--dry-run") };
}

function monthlyRanges(season: string): string[] {
  const startYear = Number.parseInt(season.split("-")[0], 10);
  const ranges: string[] = [];

  for (let offset = 0; offset < 9; offset++) {
    const monthIndex = 9 + offset;
    const year = startYear + Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    const first = new Date(Date.UTC(year, month, 1));
    const last = new Date(Date.UTC(year, month + 1, 0));
    const compact = (date: Date) => date.toISOString().slice(0, 10).replaceAll("-", "");
    ranges.push(`${compact(first)}-${compact(last)}`);
  }

  return ranges;
}

async function fetchEvents(range: string): Promise<EspnEvent[]> {
  const url =
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard" +
    `?dates=${range}&limit=500`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`ESPN ${response.status} pour ${range}`);
  }

  const data = (await response.json()) as { events?: EspnEvent[] };
  return data.events ?? [];
}

async function main() {
  const { season, dryRun } = parseArgs();
  const startedAt = new Date();
  const allEvents = new Map<string, EspnEvent>();

  console.log(`Backfill calendrier ${season}${dryRun ? " — simulation" : ""}\n`);

  for (const range of monthlyRanges(season)) {
    const events = await fetchEvents(range);
    events.forEach((event) => allEvents.set(event.id, event));
    console.log(`${range}: ${events.length} événement(s)`);
  }

  const teams = await prisma.team.findMany({ select: { id: true, abbr: true } });
  const teamByAbbr = new Map(teams.map((team) => [team.abbr, team.id]));
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
    if (dryRun) continue;

    await prisma.game.upsert({
      where: { espnId: event.id },
      update: {
        homeTeamId,
        awayTeamId,
        gameDate: new Date(event.date),
        season,
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
