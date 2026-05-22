import { type MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hoopstats.fr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [teams, players] = await Promise.all([
    prisma.team.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.player.findMany({
      where: { seasons: { some: { season: CURRENT_SEASON } } },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/fr`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/fr/joueurs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/fr/equipes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

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

  return [...staticRoutes, ...teamRoutes, ...playerRoutes];
}
