import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";

export const runtime = "nodejs";

export type SearchResult = {
  type: "player" | "team";
  slug: string;
  label: string;
  sub: string;
  photoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const [players, teams] = await Promise.all([
    prisma.player.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
        seasons: { some: { season: CURRENT_SEASON } },
      },
      take: 6,
      orderBy: { lastName: "asc" },
      include: {
        seasons: {
          where: { season: CURRENT_SEASON },
          take: 1,
          include: {
            team: {
              select: {
                abbr: true,
                primaryColor: true,
                secondaryColor: true,
              },
            },
          },
        },
      },
    }),
    prisma.team.findMany({
      where: {
        OR: [
          { city: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
          { abbr: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 4,
      orderBy: { city: "asc" },
    }),
  ]);

  const results: SearchResult[] = [
    ...players.map((p) => {
      const season = p.seasons[0];
      return {
        type: "player" as const,
        slug: p.slug,
        label: `${p.firstName} ${p.lastName}`,
        sub: [p.position, season?.team.abbr].filter(Boolean).join(" · "),
        photoUrl: p.photoUrl,
        primaryColor: season?.team.primaryColor ?? "#7C3AED",
        secondaryColor: season?.team.secondaryColor ?? "#06B6D4",
      };
    }),
    ...teams.map((t) => ({
      type: "team" as const,
      slug: t.slug,
      label: `${t.city} ${t.name}`,
      sub: t.abbr,
      photoUrl: null,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
    })),
  ];

  return NextResponse.json({ results });
}
