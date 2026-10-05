/**
 * Classe les matchs déjà en base par saison et par phase, d'après ESPN.
 *
 * Avant l'ajout de `Game.phase`, la synchronisation rangeait tout match dans
 * `CURRENT_SEASON` : présaisons 2025 et 2026, play-in, playoffs et finale de
 * la NBA Cup se retrouvaient dans les moyennes de saison régulière.
 *
 * Une requête par journée de matchs (le scoreboard ESPN ne répond plus aux
 * plages de dates). Les matchs absents du scoreboard sont signalés, jamais
 * classés par supposition.
 *
 * Usage :
 *   pnpm tsx scripts/backfill-game-phases.ts            (simulation)
 *   pnpm tsx scripts/backfill-game-phases.ts --apply
 *   pnpm tsx scripts/backfill-game-phases.ts --all      (reclasse aussi les matchs déjà classés)
 */

import { PrismaClient } from "@prisma/client";
import {
  seasonAndPhaseFromEspn,
  type EspnSeasonInfo,
  type GamePhase,
} from "../lib/season-phase";

const prisma = new PrismaClient({ log: ["error"] });

/** Pause entre deux requêtes : ESPN n'est lié par aucun accord, restons discrets. */
const REQUEST_DELAY_MS = 250;

type EspnEvent = EspnSeasonInfo & { id: string };

/** Les `dates` du scoreboard ESPN sont des journées de l'Est américain. */
function espnDate(date: Date): string {
  return date
    .toLocaleDateString("en-CA", { timeZone: "America/New_York" })
    .replace(/-/g, "");
}

async function fetchDay(date: string): Promise<EspnEvent[] | null> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { events?: EspnEvent[] };
    return data.events ?? [];
  } catch {
    return null;
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const all = process.argv.includes("--all");

  const games = await prisma.game.findMany({
    where: all ? {} : { phase: null },
    select: { id: true, espnId: true, gameDate: true, season: true, phase: true },
  });

  const byDay = new Map<string, typeof games>();
  for (const game of games) {
    const day = espnDate(game.gameDate);
    byDay.set(day, [...(byDay.get(day) ?? []), game]);
  }

  console.log(
    `\n🗂️  ${games.length} match(s) à classer sur ${byDay.size} journée(s)` +
      (apply ? "" : " — simulation, aucune écriture"),
  );

  const updates: { id: string; season: string; phase: GamePhase }[] = [];
  const tally = new Map<string, number>();
  const missing: string[] = [];
  const failedDays: string[] = [];

  for (const [day, dayGames] of [...byDay.entries()].sort()) {
    const events = await fetchDay(day);
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    if (!events) {
      failedDays.push(day);
      continue;
    }

    const eventsById = new Map(events.map((event) => [event.id, event]));
    for (const game of dayGames) {
      const event = eventsById.get(game.espnId);
      const classification = event ? seasonAndPhaseFromEspn(event) : null;
      if (!classification) {
        missing.push(`${game.espnId} (${day})`);
        continue;
      }
      const key = `${classification.season} · ${classification.phase}`;
      tally.set(key, (tally.get(key) ?? 0) + 1);
      if (game.season !== classification.season || game.phase !== classification.phase) {
        updates.push({ id: game.id, ...classification });
      }
    }
  }

  for (const [key, count] of [...tally.entries()].sort()) {
    console.log(`  ${key.padEnd(28)} ${count}`);
  }
  console.log(`\n  ${updates.length} match(s) à mettre à jour`);
  if (missing.length > 0) {
    console.log(`  ⚠️  ${missing.length} absent(s) du scoreboard : ${missing.slice(0, 10).join(", ")}`);
  }
  if (failedDays.length > 0) {
    console.log(`  ⚠️  ${failedDays.length} journée(s) injoignable(s) : ${failedDays.join(", ")}`);
  }

  if (!apply) return;

  const BATCH = 100;
  for (let index = 0; index < updates.length; index += BATCH) {
    await prisma.$transaction(
      updates.slice(index, index + BATCH).map(({ id, season, phase }) =>
        prisma.game.update({ where: { id }, data: { season, phase } }),
      ),
    );
  }
  console.log(`  ✅ ${updates.length} match(s) mis à jour`);
}

main()
  .catch((error) => {
    console.error("Échec :", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
