import { type MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { ALL_HISTORY_SEASONS, ALL_SEASONS, currentSeason, draftYearOf, previousSeason, UPCOMING_SEASON } from "@/lib/nba";
import { LEADERBOARDS } from "@/lib/stats/leaders";
import { GUIDES } from "@/lib/guides";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hoopstats.fr";

function seasonArchiveDate(season: string): Date {
  const startYear = Number.parseInt(season.split("-")[0], 10);
  return new Date(Date.UTC(startYear + 1, 5, 30));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const liveSeason = currentSeason();
  const [teams, players, games, latestSync, teamSeasons, playoffSeasons, draftYears, awardSeasons] = await Promise.all([
    prisma.team.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.player.findMany({
      where: { seasons: { some: {} } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.game.findMany({
      where: { status: "final" },
      select: { id: true, gameDate: true },
    }),
    prisma.syncLog.findFirst({
      where: { source: "sync-daily", status: { in: ["success", "partial"] } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
    prisma.teamSeason.findMany({
      where: { season: { lt: liveSeason } },
      select: { season: true, team: { select: { slug: true } } },
    }),
    prisma.playoffSeries.findMany({ select: { season: true }, distinct: ["season"] }),
    prisma.player.findMany({
      where: { draftYear: { not: null }, draftPick: { not: null } },
      select: { draftYear: true },
      distinct: ["draftYear"],
    }),
    prisma.award.findMany({ select: { season: true }, distinct: ["season"], orderBy: { season: "desc" } }),
  ]);

  const contentUpdatedAt = latestSync?.completedAt ?? new Date("2026-01-01");

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/fr`,
      lastModified: contentUpdatedAt,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/fr/joueurs`,
      lastModified: contentUpdatedAt,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/fr/equipes`,
      lastModified: contentUpdatedAt,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
  const additionalStaticRoutes = [
    "matchs",
    "classements",
    "saisons",
    "playoffs",
    "draft",
    "rookies",
    "trophees",
    "meilleurs-5",
    "sources",
    "guides",
  ].map((route) => ({
    url: `${BASE_URL}/fr/${route}`,
    lastModified: contentUpdatedAt,
    changeFrequency: "daily" as const,
    priority: route === "classements" || route === "matchs" ? 0.8 : 0.6,
  }));

  const teamRoutes: MetadataRoute.Sitemap = teams.map((t) => ({
    url: `${BASE_URL}/fr/equipes/${t.slug}`,
    lastModified: t.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const playerRoutes: MetadataRoute.Sitemap = players.map((p) => ({
    url: `${BASE_URL}/fr/joueurs/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const gameRoutes: MetadataRoute.Sitemap = games.map((game) => ({
    url: `${BASE_URL}/fr/matchs/${game.id}`,
    lastModified: game.gameDate,
    changeFrequency: "never" as const,
    priority: 0.5,
  }));

  // La saison suivante n'a aucun leader avant son premier match : rien à indexer.
  const leaderboardSeasons = ALL_SEASONS.filter((season) => season <= liveSeason);
  const leaderboardRoutes: MetadataRoute.Sitemap = leaderboardSeasons.flatMap((season) =>
    LEADERBOARDS.map((leaderboard) => ({
      url: `${BASE_URL}/fr/classements/${season}/${leaderboard.slug}`,
      lastModified:
        season === liveSeason ? contentUpdatedAt : seasonArchiveDate(season),
      changeFrequency: season === liveSeason ? ("daily" as const) : ("yearly" as const),
      priority: season === liveSeason ? 0.8 : 0.6,
    })),
  );
  // Saisons passées : chaque page de saison se déclare canonique. Seules les
  // saisons qui ont du contenu en base sont listées ; l'adresse nue (saison
  // par défaut) est déjà dans les routes statiques.
  const archive = (path: string, season: string) => ({
    url: `${BASE_URL}/fr/${path}?saison=${season}`,
    lastModified: seasonArchiveDate(season),
    changeFrequency: "yearly" as const,
    priority: 0.5,
  });
  const teamSeasonRoutes: MetadataRoute.Sitemap = teamSeasons.map((row) =>
    archive(`equipes/${row.team.slug}`, row.season),
  );
  const playoffSeasonList = playoffSeasons.map((row) => row.season);
  const defaultPlayoffSeason = playoffSeasonList.includes(liveSeason) ? liveSeason : previousSeason(liveSeason);
  const playoffRoutes: MetadataRoute.Sitemap = playoffSeasonList
    .filter((season) => season !== defaultPlayoffSeason)
    .map((season) => archive("playoffs", season));
  const draftYearSet = new Set(draftYears.map((row) => row.draftYear));
  const draftRoutes: MetadataRoute.Sitemap = ALL_HISTORY_SEASONS
    .filter((season) => season !== UPCOMING_SEASON && draftYearSet.has(draftYearOf(season)))
    .map((season) => archive("draft", season));
  const trophySeasonRoutes: MetadataRoute.Sitemap = awardSeasons
    .slice(1)
    .map((row) => archive("trophees", row.season));

  const guideRoutes: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: `${BASE_URL}/fr/guides/${guide.slug}`,
    lastModified: new Date("2026-07-20"),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...additionalStaticRoutes,
    ...teamRoutes,
    ...playerRoutes,
    ...gameRoutes,
    ...leaderboardRoutes,
    ...teamSeasonRoutes,
    ...playoffRoutes,
    ...draftRoutes,
    ...trophySeasonRoutes,
    ...guideRoutes,
  ];
}
