/**
 * Corrige les matchs restés dans un statut non terminé alors que leur date est
 * passée depuis longtemps.
 *
 * Ces matchs ne sont jamais revisités : la synchronisation quotidienne ne
 * balaie qu'une fenêtre récente. Un report survenu il y a six mois resterait
 * donc affiché comme une rencontre en cours.
 *
 * Le statut réel est relu depuis ESPN, jamais deviné. Aucun score n'est touché.
 *
 * Run :
 *   pnpm tsx scripts/fix-stale-game-status.ts            (simulation)
 *   pnpm tsx scripts/fix-stale-game-status.ts --apply    (écriture)
 */

import { PrismaClient } from "@prisma/client";
import { gameStatusFromEspn, isStaleStatus } from "../lib/game-status";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  log: ["error"],
});

const SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=";

type EspnSummary = {
  header?: {
    competitions?: { status?: { type?: { name?: string } } }[];
  };
};

async function fetchEspnStatus(espnId: string): Promise<string | null> {
  const response = await fetch(`${SUMMARY_URL}${espnId}`);
  if (!response.ok) return null;

  const data = (await response.json()) as EspnSummary;
  return data.header?.competitions?.[0]?.status?.type?.name ?? null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const now = new Date();

  const candidates = (
    await prisma.game.findMany({
      where: {
        gameDate: { lt: now },
        status: { notIn: ["final", "postponed"] },
      },
      select: {
        id: true,
        espnId: true,
        gameDate: true,
        status: true,
        homeTeam: { select: { abbr: true } },
        awayTeam: { select: { abbr: true } },
      },
      orderBy: { gameDate: "desc" },
    })
  ).filter((game) => isStaleStatus(game.status, game.gameDate, now));

  if (candidates.length === 0) {
    console.log("Aucun match au statut figé. Rien à faire.");
    return;
  }

  console.log(
    `${candidates.length} match(s) au statut figé${apply ? "" : " — simulation, aucune écriture"}\n`,
  );

  let corrected = 0;
  let unchanged = 0;

  for (const game of candidates) {
    const espnStatus = await fetchEspnStatus(game.espnId);
    const label = `${game.gameDate.toISOString().slice(0, 10)} ${game.awayTeam.abbr}@${game.homeTeam.abbr}`;

    if (espnStatus == null) {
      console.log(`  ${label} : statut ESPN illisible, ignoré`);
      unchanged++;
      continue;
    }

    const resolved = gameStatusFromEspn(espnStatus);
    if (resolved === game.status) {
      console.log(`  ${label} : ESPN confirme « ${game.status} », inchangé`);
      unchanged++;
      continue;
    }

    console.log(`  ${label} : ${game.status} → ${resolved}  (ESPN ${espnStatus})`);
    if (apply) {
      await prisma.game.update({
        where: { id: game.id },
        data: { status: resolved },
      });
    }
    corrected++;
  }

  console.log(
    `\n${corrected} à corriger, ${unchanged} inchangé(s).` +
      (apply ? " Écritures effectuées." : " Relancer avec --apply pour écrire."),
  );
}

main()
  .catch((error) => {
    console.error("Échec :", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
