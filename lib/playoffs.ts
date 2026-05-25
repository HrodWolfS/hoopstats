import { prisma } from "./prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlayoffTeam = {
  espnId: string;
  abbr: string;
  name: string;
  city: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  seed: number | null;
  seriesWins: number;
};

export type PlayoffSeries = {
  key: string;
  conference: "WEST" | "EAST" | "FINALS";
  round: 1 | 2 | 3 | 4;
  team1: PlayoffTeam; // top seed
  team2: PlayoffTeam;
  status: "upcoming" | "in_progress" | "complete";
  gameNumber: number;
  nextGameDate: string | null;
  nextGameNetwork: string | null;
  summary: string;
  completed: boolean;
};

export type PlayoffBracketData = {
  season: string;
  west: {
    r1: PlayoffSeries[];
    semis: PlayoffSeries[];
    finals: PlayoffSeries | null;
  };
  east: {
    r1: PlayoffSeries[];
    semis: PlayoffSeries[];
    finals: PlayoffSeries | null;
  };
  nbaFinals: PlayoffSeries | null;
};

// ─── Bracket position pour le tri R1 ─────────────────────────────────────────

function r1BracketPos(seed: number | null): number {
  if (seed === 1) return 0; // 1v8 en haut
  if (seed === 4) return 1; // 4v5
  if (seed === 3) return 2; // 3v6
  if (seed === 2) return 3; // 2v7 en bas
  return 4;
}

// ─── Lecture depuis la base de données ───────────────────────────────────────

export async function getPlayoffBracket(
  season: string,
): Promise<PlayoffBracketData> {
  const teamSelect = {
    abbr: true,
    name: true,
    city: true,
    slug: true,
    primaryColor: true,
    secondaryColor: true,
    logoUrl: true,
  } as const;

  const dbSeries = await prisma.playoffSeries.findMany({
    where: { season },
    include: { team1: { select: teamSelect }, team2: { select: teamSelect } },
    orderBy: [{ round: "asc" }],
  });

  const toTeam = (
    t: {
      abbr: string;
      name: string;
      city: string;
      slug: string;
      primaryColor: string;
      secondaryColor: string;
      logoUrl: string | null;
    },
    seed: number | null,
    wins: number,
  ): PlayoffTeam => ({
    espnId: "",
    abbr: t.abbr,
    name: t.name,
    city: t.city,
    slug: t.slug,
    primaryColor: t.primaryColor,
    secondaryColor: t.secondaryColor,
    logoUrl: t.logoUrl,
    seed,
    seriesWins: wins,
  });

  const allSeries: PlayoffSeries[] = dbSeries.map((s) => {
    const totalWins = s.team1Wins + s.team2Wins;
    const status: PlayoffSeries["status"] = s.completed
      ? "complete"
      : totalWins === 0
        ? "upcoming"
        : "in_progress";

    return {
      key: s.id,
      conference: s.conference as "WEST" | "EAST" | "FINALS",
      round: s.round as 1 | 2 | 3 | 4,
      team1: toTeam(s.team1, s.team1Seed, s.team1Wins),
      team2: toTeam(s.team2, s.team2Seed, s.team2Wins),
      status,
      gameNumber: s.gameNumber,
      nextGameDate: s.nextGameDate?.toISOString() ?? null,
      nextGameNetwork: s.nextGameNetwork,
      summary: s.summary ?? "",
      completed: s.completed,
    };
  });

  const filter = (conf: "WEST" | "EAST" | "FINALS", round: 1 | 2 | 3 | 4) =>
    allSeries.filter((s) => s.conference === conf && s.round === round);

  const sortR1 = (series: PlayoffSeries[]) =>
    [...series].sort(
      (a, b) => r1BracketPos(a.team1.seed) - r1BracketPos(b.team1.seed),
    );

  const sortSeed = (series: PlayoffSeries[]) =>
    [...series].sort((a, b) => (a.team1.seed ?? 9) - (b.team1.seed ?? 9));

  return {
    season,
    west: {
      r1: sortR1(filter("WEST", 1)),
      semis: sortSeed(filter("WEST", 2)),
      finals: filter("WEST", 3)[0] ?? null,
    },
    east: {
      r1: sortR1(filter("EAST", 1)),
      semis: sortSeed(filter("EAST", 2)),
      finals: filter("EAST", 3)[0] ?? null,
    },
    nbaFinals: filter("FINALS", 4)[0] ?? null,
  };
}
