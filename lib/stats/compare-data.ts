import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getPlayerMetric, type PlayerMetricKey } from "@/lib/stats/metrics";
import { isQualified, leaderboardValue, minimumGamesFor, seasonTeamGames } from "@/lib/stats/leaders";
import {
  leagueDistribution,
  resolveComparisonSeasons,
  type LeagueDistribution,
} from "@/lib/stats/compare";
import { consolidatePlayerCareer, consolidateSeasonRows } from "@/lib/stats/season-totals";
import type { Consolidated } from "@/lib/stats/season-consolidation";

/**
 * Données du comparateur, partagées par la page et son image de partage :
 * mêmes joueurs, mêmes saisons, mêmes chiffres des deux côtés.
 */

async function fetchPlayer(slug: string) {
  // Carrière complète : une saison commune aux deux joueurs peut être
  // ancienne, la tronquer empêcherait de la trouver.
  return prisma.player.findUnique({
    where: { slug },
    include: {
      seasons: {
        orderBy: { season: "desc" },
        include: {
          team: { select: { abbr: true, primaryColor: true, secondaryColor: true } },
        },
      },
    },
  });
}

export type ComparedPlayer = NonNullable<Awaited<ReturnType<typeof fetchPlayer>>>;
export type ComparedSeason = Consolidated<ComparedPlayer["seasons"][number]>;

/** Mémorisé par requête : la page et ses métadonnées lisent la même chose. */
export const loadPlayer = cache(fetchPlayer);

/**
 * Regroupe les lignes d'une même saison en une seule (ligne TOT).
 *
 * Sans cela, `seasons[0]` d'un joueur transféré désigne un passage en équipe
 * choisi arbitrairement, donc une saison partielle. Même politique que la
 * fiche joueur : comptage pondéré par les matchs, pourcentages de tir
 * recalculés sur les box scores, PER et Net Rating indisponibles.
 */
const seasonRowsBySeason = cache(async (slug: string) => {
  const player = await loadPlayer(slug);
  if (!player) return new Map<string, ComparedSeason>();
  const { seasons } = await consolidatePlayerCareer(player.seasons);
  return new Map(seasons.map((row) => [row.season, row]));
});

export const loadComparison = cache(async (j1: string, j2: string, s1?: string, s2?: string, saison?: string) => {
  const [p1, p2] = await Promise.all([loadPlayer(j1), loadPlayer(j2)]);
  if (!p1 || !p2) return null;
  const [seasons1, seasons2] = await Promise.all([seasonRowsBySeason(j1), seasonRowsBySeason(j2)]);
  const samePlayer = p1.slug === p2.slug;
  // Même saison par défaut, saisons demandées respectées, saison absente
  // signalée plutôt que remplacée en silence (lib/stats/compare.ts). La
  // saison globale du site (`saison`) sert de demande commune.
  const choice = resolveComparisonSeasons({
    seasons1: [...seasons1.keys()],
    seasons2: [...seasons2.keys()],
    requested1: s1 ?? (samePlayer ? null : saison),
    requested2: s2 ?? (samePlayer ? null : saison),
    samePlayer,
  });
  return {
    p1,
    p2,
    seasons1,
    seasons2,
    samePlayer,
    choice,
    s1: choice.season1 ? (seasons1.get(choice.season1) ?? null) : null,
    s2: choice.season2 ? (seasons2.get(choice.season2) ?? null) : null,
  };
});

export type ComparisonData = NonNullable<Awaited<ReturnType<typeof loadComparison>>>;

/** Métriques situées par rapport à la ligue dans le comparateur. */
export const LEAGUE_METRICS = [
  "pointsPerGame",
  "reboundsPerGame",
  "assistsPerGame",
  "stealsPerGame",
  "blocksPerGame",
  "fgPct",
  "threePtPct",
  "trueShooting",
  "per",
  "netRating",
] as const satisfies readonly PlayerMetricKey[];

export type LeagueMetric = (typeof LEAGUE_METRICS)[number];
export type LeagueReference = Partial<Record<LeagueMetric, LeagueDistribution>>;

/**
 * Moyenne et distribution des joueurs qualifiés d'une saison, métrique par
 * métrique, avec le seuil du catalogue (le même que les classements). Une
 * saison passée ne change plus : mémoire de l'instance, renouvelée toutes
 * les 6 heures comme l'index de recherche.
 */
const TTL_MS = 6 * 60 * 60 * 1000;
const references = new Map<string, { builtAt: number; value: Promise<LeagueReference> }>();

async function buildLeagueReference(season: string): Promise<LeagueReference> {
  const rows = await prisma.playerSeason.findMany({ where: { season } });
  const consolidated = await consolidateSeasonRows(season, rows);
  const teamGames = seasonTeamGames(consolidated);
  const reference: LeagueReference = {};
  for (const metric of LEAGUE_METRICS) {
    const { qualification } = getPlayerMetric(metric);
    const minimumGames = minimumGamesFor(qualification, teamGames);
    const values = consolidated
      .filter((row) => isQualified(row, qualification, minimumGames))
      .map((row) => leaderboardValue(row, metric))
      .filter((value): value is number => value != null);
    const distribution = leagueDistribution(values);
    if (distribution) reference[metric] = distribution;
  }
  return reference;
}

export function loadLeagueReference(season: string): Promise<LeagueReference> {
  const cached = references.get(season);
  if (cached && Date.now() - cached.builtAt < TTL_MS) return cached.value;
  const value = buildLeagueReference(season).catch((error) => {
    references.delete(season);
    throw error;
  });
  references.set(season, { builtAt: Date.now(), value });
  return value;
}
