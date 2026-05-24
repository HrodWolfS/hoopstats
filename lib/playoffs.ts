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

// ─── ESPN raw types ───────────────────────────────────────────────────────────

type EspnCompetitor = {
  id: string;
  team: {
    id: string;
    abbreviation: string;
    displayName: string;
  };
  score?: string;
  homeAway: string;
};

type EspnEvent = {
  id: string;
  date: string;
  competitions: Array<{
    notes?: Array<{ text: string }>;
    series?: {
      completed: boolean;
      summary: string;
      competitors: Array<{ id: string; wins: number }>;
    };
    competitors: EspnCompetitor[];
    status: { type: { name: string } };
    broadcasts?: Array<{ names: string[] }>;
  }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNote(
  text: string,
): { conference: "WEST" | "EAST" | "FINALS"; round: 1 | 2 | 3 | 4 } | null {
  const t = text.toLowerCase().trim();

  if (t.includes("nba finals")) return { conference: "FINALS", round: 4 };

  const conference: "WEST" | "EAST" | null = t.startsWith("west")
    ? "WEST"
    : t.startsWith("east")
      ? "EAST"
      : null;
  if (!conference) return null;

  // NOTE: "semifinals".includes("finals") === true → check semi FIRST
  if (t.includes("semi")) return { conference, round: 2 };
  if (t.includes("finals") || t.includes("final"))
    return { conference, round: 3 };
  if (t.includes("first") || t.includes("1st")) return { conference, round: 1 };

  return null;
}

/** Traditional NBA bracket position for first round (top → bottom). */
function r1BracketPos(seed: number | null): number {
  if (seed === 1) return 0; // 1v8
  if (seed === 4) return 1; // 4v5
  if (seed === 3) return 2; // 3v6
  if (seed === 2) return 3; // 2v7
  return 4;
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function fetchPlayoffBracket(
  season: string,
): Promise<PlayoffBracketData> {
  // ESPN uses start year for scoreboard (2025-26 → 2025)
  // and end year for standings (2025-26 → 2026)
  const startYear = parseInt(season.split("-")[0]);
  const endYear = 2000 + parseInt(season.split("-")[1]);

  const [gamesData, standingsData, dbTeams] = await Promise.all([
    fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?seasontype=3&season=${startYear}&limit=200`,
      { next: { revalidate: 300 } },
    )
      .then((r) => r.json())
      .catch(() => ({ events: [] })),

    fetch(
      `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${endYear}`,
      { next: { revalidate: 3600 } },
    )
      .then((r) => r.json())
      .catch(() => ({ children: [] })),

    prisma.team.findMany({
      select: {
        abbr: true,
        name: true,
        city: true,
        slug: true,
        primaryColor: true,
        secondaryColor: true,
        logoUrl: true,
      },
    }),
  ]);

  // seed map: abbr → playoff seed
  const seedMap = new Map<string, number>();
  for (const conf of gamesData?.children ?? standingsData?.children ?? []) {
    for (const entry of conf.standings?.entries ?? []) {
      const abbr: string = entry.team?.abbreviation;
      const stat = (
        entry.stats as Array<{ name: string; value: number }> | undefined
      )?.find((s) => s.name === "playoffSeed");
      if (abbr && stat) seedMap.set(abbr, stat.value);
    }
  }
  // Also parse standingsData directly
  for (const conf of standingsData?.children ?? []) {
    for (const entry of conf.standings?.entries ?? []) {
      const abbr: string = entry.team?.abbreviation;
      const stat = (
        entry.stats as Array<{ name: string; value: number }> | undefined
      )?.find((s) => s.name === "playoffSeed");
      if (abbr && stat) seedMap.set(abbr, stat.value);
    }
  }

  // DB team map: abbr → team data
  const dbTeamMap = new Map(dbTeams.map((t) => [t.abbr, t]));

  // Intermediate series data during grouping
  type SeriesAccum = {
    conf: "WEST" | "EAST" | "FINALS";
    round: 1 | 2 | 3 | 4;
    espnTeam1: EspnCompetitor;
    espnTeam2: EspnCompetitor;
    wins1: number;
    wins2: number;
    completed: boolean;
    summary: string;
    gameNumber: number;
    nextGameDate: string | null;
    nextGameNetwork: string | null;
  };

  const seriesMap = new Map<string, SeriesAccum>();

  for (const event of (gamesData.events ?? []) as EspnEvent[]) {
    const comp = event.competitions?.[0];
    if (!comp) continue;

    const noteText = comp.notes?.[0]?.text ?? "";
    const parsed = parseNote(noteText);
    if (!parsed) continue;

    const { conference, round } = parsed;
    const [c1, c2] = comp.competitors ?? [];
    if (!c1 || !c2) continue;

    const ids = [c1.team.id, c2.team.id].sort();
    const key = `${conference}-${round}-${ids[0]}-${ids[1]}`;

    const seriesObj = comp.series;
    const wins1 = seriesObj?.competitors.find((c) => c.id === c1.id)?.wins ?? 0;
    const wins2 = seriesObj?.competitors.find((c) => c.id === c2.id)?.wins ?? 0;

    const gameMatch = noteText.match(/game\s*(\d+)/i);
    const gameNumber = gameMatch ? parseInt(gameMatch[1]) : 1;

    const isScheduled = comp.status?.type?.name === "STATUS_SCHEDULED";

    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        conf: conference,
        round,
        espnTeam1: c1,
        espnTeam2: c2,
        wins1,
        wins2,
        completed: seriesObj?.completed ?? false,
        summary: seriesObj?.summary ?? "",
        gameNumber,
        nextGameDate: isScheduled ? event.date : null,
        nextGameNetwork: isScheduled
          ? (comp.broadcasts?.[0]?.names?.[0] ?? null)
          : null,
      });
    } else {
      const ex = seriesMap.get(key)!;
      ex.wins1 = wins1;
      ex.wins2 = wins2;
      ex.completed = seriesObj?.completed ?? ex.completed;
      ex.summary = seriesObj?.summary || ex.summary;
      ex.gameNumber = Math.max(ex.gameNumber, gameNumber);
      if (isScheduled && !ex.nextGameDate) {
        ex.nextGameDate = event.date;
        ex.nextGameNetwork = comp.broadcasts?.[0]?.names?.[0] ?? null;
      }
    }
  }

  // Build final PlayoffSeries list
  const allSeries: PlayoffSeries[] = [];

  for (const [key, s] of seriesMap) {
    const abbr1 = s.espnTeam1.team.abbreviation;
    const abbr2 = s.espnTeam2.team.abbreviation;
    const seed1 = seedMap.get(abbr1) ?? null;
    const seed2 = seedMap.get(abbr2) ?? null;

    // Ensure top seed is team1
    const flip = (seed1 ?? 9) > (seed2 ?? 9);
    const [espn1, espn2, w1, w2, s1, s2] = flip
      ? [s.espnTeam2, s.espnTeam1, s.wins2, s.wins1, seed2, seed1]
      : [s.espnTeam1, s.espnTeam2, s.wins1, s.wins2, seed1, seed2];

    const makeTeam = (
      espn: EspnCompetitor,
      wins: number,
      seed: number | null,
    ): PlayoffTeam => {
      const db = dbTeamMap.get(espn.team.abbreviation);
      return {
        espnId: espn.team.id,
        abbr: espn.team.abbreviation,
        name:
          db?.name ??
          espn.team.displayName.split(" ").pop() ??
          espn.team.abbreviation,
        city: db?.city ?? "",
        slug: db?.slug ?? "",
        primaryColor: db?.primaryColor ?? "#555555",
        secondaryColor: db?.secondaryColor ?? "#333333",
        logoUrl: db?.logoUrl ?? null,
        seed,
        seriesWins: wins,
      };
    };

    const totalWins = s.wins1 + s.wins2;
    const status: PlayoffSeries["status"] = s.completed
      ? "complete"
      : totalWins === 0
        ? "upcoming"
        : "in_progress";

    allSeries.push({
      key,
      conference: s.conf,
      round: s.round,
      team1: makeTeam(espn1, w1, s1),
      team2: makeTeam(espn2, w2, s2),
      status,
      gameNumber: s.gameNumber,
      nextGameDate: s.nextGameDate,
      nextGameNetwork: s.nextGameNetwork,
      summary: s.summary,
      completed: s.completed,
    });
  }

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
