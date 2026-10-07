import { prisma } from "@/lib/prisma";
import { currentSeason } from "@/lib/nba";
import {
  buildSearchIndex,
  careerSpan,
  PLAYER_SEARCH_ALIASES,
  TEAM_SEARCH_ALIASES,
  type SearchEntry,
  type SearchIndex,
} from "@/lib/search";

/**
 * Index de la recherche globale : tous les joueurs ayant au moins une saison
 * en base (depuis 1980-81) et les 30 équipes. Quelques milliers d'entrées,
 * gardées en mémoire de l'instance et reconstruites toutes les 6 heures,
 * au rythme de la revalidation des pages.
 */
const TTL_MS = 6 * 60 * 60 * 1000;
const POSITION_FR: Record<string, string> = { G: "Arrière", F: "Ailier", C: "Pivot" };

let cached: { index: SearchIndex; builtAt: number } | null = null;
let pending: Promise<SearchIndex> | null = null;

function positionLabel(position: string | null): string | null {
  if (!position) return null;
  return position
    .split("-")
    .map((part) => POSITION_FR[part] ?? part)
    .join("-");
}

async function loadEntries(): Promise<SearchEntry[]> {
  const liveSeason = currentSeason();
  const [players, teams] = await Promise.all([
    prisma.player.findMany({
      where: { seasons: { some: {} } },
      select: {
        slug: true,
        firstName: true,
        lastName: true,
        position: true,
        photoUrl: true,
        seasons: {
          select: {
            season: true,
            gamesPlayed: true,
            team: { select: { abbr: true, primaryColor: true, secondaryColor: true } },
          },
          orderBy: { season: "asc" },
        },
      },
    }),
    prisma.team.findMany({
      select: { slug: true, abbr: true, city: true, name: true, logoUrl: true, primaryColor: true, secondaryColor: true },
    }),
  ]);

  const aliasesByName = new Map<string, string[]>();
  for (const [alias, canonical] of Object.entries(PLAYER_SEARCH_ALIASES)) {
    aliasesByName.set(canonical, [...(aliasesByName.get(canonical) ?? []), alias]);
  }

  const playerEntries = players.map((player): SearchEntry => {
    const name = `${player.firstName} ${player.lastName}`.trim();
    const first = player.seasons[0];
    const last = player.seasons[player.seasons.length - 1];
    const lastTeams = player.seasons.filter((row) => row.season === last.season);
    // Saison en plusieurs équipes : sans ordre des passages en base, on
    // retient l'équipe où il a le plus joué.
    const lastTeam = lastTeams.reduce((a, b) => (b.gamesPlayed > a.gamesPlayed ? b : a)).team;
    const active = last.season === liveSeason;
    const sub = active
      ? [positionLabel(player.position), lastTeams.length > 1 ? `${lastTeams.length} équipes` : lastTeam.abbr, liveSeason]
      : [careerSpan(first.season, last.season), `dernière équipe ${lastTeam.abbr}`];
    return {
      result: {
        type: "player",
        slug: player.slug,
        label: name,
        sub: sub.filter(Boolean).join(" · "),
        photoUrl: player.photoUrl,
        primaryColor: lastTeam.primaryColor,
        secondaryColor: lastTeam.secondaryColor,
      },
      names: [name],
      aliases: aliasesByName.get(name),
      weight: player.seasons.reduce((sum, row) => sum + row.gamesPlayed, 0),
    };
  });

  const teamEntries = teams.map((team): SearchEntry => {
    const aliases = Object.entries(TEAM_SEARCH_ALIASES)
      .filter(([, abbr]) => abbr === team.abbr)
      .map(([alias]) => alias);
    return {
      result: {
        type: "team",
        slug: team.slug,
        label: `${team.city} ${team.name}`,
        sub: team.abbr,
        logoUrl: team.logoUrl,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
      },
      // « Lakers » et « Los Angeles » doivent suffire : le nom seul est un
      // nom complet à part entière.
      names: [`${team.city} ${team.name}`, team.name],
      aliases,
      codes: [team.abbr],
      // Les équipes passent devant un joueur à pertinence égale.
      weight: Number.MAX_SAFE_INTEGER,
    };
  });

  return [...teamEntries, ...playerEntries];
}

export async function getSearchIndex(): Promise<SearchIndex> {
  if (cached && Date.now() - cached.builtAt < TTL_MS) return cached.index;
  pending ??= loadEntries()
    .then((entries) => {
      const index = buildSearchIndex(entries);
      cached = { index, builtAt: Date.now() };
      return index;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
