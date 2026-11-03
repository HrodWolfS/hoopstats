/**
 * Données de l'explorateur joueurs, mises en cache par saison.
 *
 * Une saison entière tient en quelques centaines de lignes : on la lit une
 * fois (rafraîchie toutes les 6 h ou à la fin de la synchro) et la recherche,
 * les filtres et le tri se font en mémoire. Chaque frappe de la recherche ne
 * relit donc plus la base.
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { consolidateSeasonRows } from "@/lib/stats/season-totals";

export const PLAYER_EXPLORER_CACHE_TAG = "player-explorer";
const REVALIDATE_SECONDS = 21600;

async function readExplorerSeason(season: string) {
  const stintRows = await prisma.playerSeason.findMany({
    where: { season },
    include: {
      player: {
        select: {
          firstName: true,
          lastName: true,
          slug: true,
          position: true,
          photoUrl: true,
        },
      },
      team: {
        select: {
          abbr: true,
          slug: true,
          primaryColor: true,
          secondaryColor: true,
        },
      },
    },
  });
  // Une ligne par joueur : les seuils s'appliquent à la saison entière d'un
  // joueur transféré, pas à chacun de ses passages.
  return consolidateSeasonRows(season, stintRows);
}

export type ExplorerSeasonRow = Awaited<ReturnType<typeof readExplorerSeason>>[number];

export const loadExplorerSeason = unstable_cache(
  readExplorerSeason,
  ["player-explorer-season"],
  { revalidate: REVALIDATE_SECONDS, tags: [PLAYER_EXPLORER_CACHE_TAG] },
);

export const loadExplorerTeams = unstable_cache(
  () =>
    prisma.team.findMany({
      orderBy: { abbr: "asc" },
      select: { abbr: true, city: true, name: true },
    }),
  ["player-explorer-teams"],
  { revalidate: REVALIDATE_SECONDS, tags: [PLAYER_EXPLORER_CACHE_TAG] },
);
