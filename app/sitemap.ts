import { type MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { ALL_SEASONS } from "@/lib/nba";
import { LEADERBOARDS } from "@/lib/stats/leaders";
import { GUIDES } from "@/lib/guides";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hoopstats.fr";

function seasonArchiveDate(season: string): Date {
  const startYear = Number.parseInt(season.split("-")[0], 10);
  return new Date(Date.UTC(startYear + 1, 5, 30));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [teams, players, games, latestSync] = await Promise.all([
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

  const leaderboardRoutes: MetadataRoute.Sitemap = ALL_SEASONS.flatMap((season) =>
    LEADERBOARDS.map((leaderboard) => ({
      url: `${BASE_URL}/fr/classements/${season}/${leaderboard.slug}`,
      lastModified:
        season === ALL_SEASONS[0] ? contentUpdatedAt : seasonArchiveDate(season),
      changeFrequency: season === ALL_SEASONS[0] ? ("daily" as const) : ("yearly" as const),
      priority: season === ALL_SEASONS[0] ? 0.8 : 0.6,
    })),
  );
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
    ...guideRoutes,
  ];
}
