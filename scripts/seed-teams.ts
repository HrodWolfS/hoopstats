/**
 * Sprint 2.1 — Seed des 30 franchises NBA
 * Run: pnpm tsx scripts/seed-teams.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type TeamSeed = {
  abbr: string;
  city: string;
  name: string;
  slug: string;
  conference: string;
  division: string;
  primaryColor: string;
  secondaryColor: string;
  founded: number;
  arena: string;
};

const TEAMS: TeamSeed[] = [
  // ── Eastern Conference ────────────────────────────────────────

  // Atlantic
  {
    abbr: "BOS",
    city: "Boston",
    name: "Celtics",
    slug: "boston-celtics",
    conference: "East",
    division: "Atlantic",
    primaryColor: "#007A33",
    secondaryColor: "#BA9653",
    founded: 1946,
    arena: "TD Garden",
  },
  {
    abbr: "BKN",
    city: "Brooklyn",
    name: "Nets",
    slug: "brooklyn-nets",
    conference: "East",
    division: "Atlantic",
    primaryColor: "#000000",
    secondaryColor: "#FFFFFF",
    founded: 1967,
    arena: "Barclays Center",
  },
  {
    abbr: "NYK",
    city: "New York",
    name: "Knicks",
    slug: "new-york-knicks",
    conference: "East",
    division: "Atlantic",
    primaryColor: "#006BB6",
    secondaryColor: "#F58426",
    founded: 1946,
    arena: "Madison Square Garden",
  },
  {
    abbr: "PHI",
    city: "Philadelphia",
    name: "76ers",
    slug: "philadelphia-76ers",
    conference: "East",
    division: "Atlantic",
    primaryColor: "#006BB6",
    secondaryColor: "#ED174C",
    founded: 1963,
    arena: "Wells Fargo Center",
  },
  {
    abbr: "TOR",
    city: "Toronto",
    name: "Raptors",
    slug: "toronto-raptors",
    conference: "East",
    division: "Atlantic",
    primaryColor: "#CE1141",
    secondaryColor: "#000000",
    founded: 1995,
    arena: "Scotiabank Arena",
  },

  // Central
  {
    abbr: "CHI",
    city: "Chicago",
    name: "Bulls",
    slug: "chicago-bulls",
    conference: "East",
    division: "Central",
    primaryColor: "#CE1141",
    secondaryColor: "#000000",
    founded: 1966,
    arena: "United Center",
  },
  {
    abbr: "CLE",
    city: "Cleveland",
    name: "Cavaliers",
    slug: "cleveland-cavaliers",
    conference: "East",
    division: "Central",
    primaryColor: "#860038",
    secondaryColor: "#FDBB30",
    founded: 1970,
    arena: "Rocket Mortgage FieldHouse",
  },
  {
    abbr: "DET",
    city: "Detroit",
    name: "Pistons",
    slug: "detroit-pistons",
    conference: "East",
    division: "Central",
    primaryColor: "#C8102E",
    secondaryColor: "#1D42BA",
    founded: 1941,
    arena: "Little Caesars Arena",
  },
  {
    abbr: "IND",
    city: "Indiana",
    name: "Pacers",
    slug: "indiana-pacers",
    conference: "East",
    division: "Central",
    primaryColor: "#002D62",
    secondaryColor: "#FDBB30",
    founded: 1967,
    arena: "Gainbridge Fieldhouse",
  },
  {
    abbr: "MIL",
    city: "Milwaukee",
    name: "Bucks",
    slug: "milwaukee-bucks",
    conference: "East",
    division: "Central",
    primaryColor: "#00471B",
    secondaryColor: "#EEE1C6",
    founded: 1968,
    arena: "Fiserv Forum",
  },

  // Southeast
  {
    abbr: "ATL",
    city: "Atlanta",
    name: "Hawks",
    slug: "atlanta-hawks",
    conference: "East",
    division: "Southeast",
    primaryColor: "#E03A3E",
    secondaryColor: "#C1D32F",
    founded: 1946,
    arena: "State Farm Arena",
  },
  {
    abbr: "CHA",
    city: "Charlotte",
    name: "Hornets",
    slug: "charlotte-hornets",
    conference: "East",
    division: "Southeast",
    primaryColor: "#1D1160",
    secondaryColor: "#00788C",
    founded: 1988,
    arena: "Spectrum Center",
  },
  {
    abbr: "MIA",
    city: "Miami",
    name: "Heat",
    slug: "miami-heat",
    conference: "East",
    division: "Southeast",
    primaryColor: "#98002E",
    secondaryColor: "#F9A01B",
    founded: 1988,
    arena: "Kaseya Center",
  },
  {
    abbr: "ORL",
    city: "Orlando",
    name: "Magic",
    slug: "orlando-magic",
    conference: "East",
    division: "Southeast",
    primaryColor: "#0077C0",
    secondaryColor: "#C4CED4",
    founded: 1989,
    arena: "Kia Center",
  },
  {
    abbr: "WAS",
    city: "Washington",
    name: "Wizards",
    slug: "washington-wizards",
    conference: "East",
    division: "Southeast",
    primaryColor: "#002B5C",
    secondaryColor: "#E31837",
    founded: 1961,
    arena: "Capital One Arena",
  },

  // ── Western Conference ────────────────────────────────────────

  // Northwest
  {
    abbr: "DEN",
    city: "Denver",
    name: "Nuggets",
    slug: "denver-nuggets",
    conference: "West",
    division: "Northwest",
    primaryColor: "#0E2240",
    secondaryColor: "#FEC524",
    founded: 1967,
    arena: "Ball Arena",
  },
  {
    abbr: "MIN",
    city: "Minnesota",
    name: "Timberwolves",
    slug: "minnesota-timberwolves",
    conference: "West",
    division: "Northwest",
    primaryColor: "#0C2340",
    secondaryColor: "#236192",
    founded: 1989,
    arena: "Target Center",
  },
  {
    abbr: "OKC",
    city: "Oklahoma City",
    name: "Thunder",
    slug: "oklahoma-city-thunder",
    conference: "West",
    division: "Northwest",
    primaryColor: "#007AC1",
    secondaryColor: "#EF3B24",
    founded: 2008,
    arena: "Paycom Center",
  },
  {
    abbr: "POR",
    city: "Portland",
    name: "Trail Blazers",
    slug: "portland-trail-blazers",
    conference: "West",
    division: "Northwest",
    primaryColor: "#E03A3E",
    secondaryColor: "#000000",
    founded: 1970,
    arena: "Moda Center",
  },
  {
    abbr: "UTA",
    city: "Utah",
    name: "Jazz",
    slug: "utah-jazz",
    conference: "West",
    division: "Northwest",
    primaryColor: "#002B5C",
    secondaryColor: "#F9A01B",
    founded: 1974,
    arena: "Delta Center",
  },

  // Pacific
  {
    abbr: "GSW",
    city: "Golden State",
    name: "Warriors",
    slug: "golden-state-warriors",
    conference: "West",
    division: "Pacific",
    primaryColor: "#1D428A",
    secondaryColor: "#FFC72C",
    founded: 1946,
    arena: "Chase Center",
  },
  {
    abbr: "LAC",
    city: "Los Angeles",
    name: "Clippers",
    slug: "los-angeles-clippers",
    conference: "West",
    division: "Pacific",
    primaryColor: "#C8102E",
    secondaryColor: "#1D428A",
    founded: 1970,
    arena: "Intuit Dome",
  },
  {
    abbr: "LAL",
    city: "Los Angeles",
    name: "Lakers",
    slug: "los-angeles-lakers",
    conference: "West",
    division: "Pacific",
    primaryColor: "#552583",
    secondaryColor: "#FDB927",
    founded: 1947,
    arena: "Crypto.com Arena",
  },
  {
    abbr: "PHX",
    city: "Phoenix",
    name: "Suns",
    slug: "phoenix-suns",
    conference: "West",
    division: "Pacific",
    primaryColor: "#E56020",
    secondaryColor: "#1D1160",
    founded: 1968,
    arena: "Footprint Center",
  },
  {
    abbr: "SAC",
    city: "Sacramento",
    name: "Kings",
    slug: "sacramento-kings",
    conference: "West",
    division: "Pacific",
    primaryColor: "#5A2D81",
    secondaryColor: "#63727A",
    founded: 1923,
    arena: "Golden 1 Center",
  },

  // Southwest
  {
    abbr: "DAL",
    city: "Dallas",
    name: "Mavericks",
    slug: "dallas-mavericks",
    conference: "West",
    division: "Southwest",
    primaryColor: "#00538C",
    secondaryColor: "#B8C4CA",
    founded: 1980,
    arena: "American Airlines Center",
  },
  {
    abbr: "HOU",
    city: "Houston",
    name: "Rockets",
    slug: "houston-rockets",
    conference: "West",
    division: "Southwest",
    primaryColor: "#CE1141",
    secondaryColor: "#C4CED4",
    founded: 1967,
    arena: "Toyota Center",
  },
  {
    abbr: "MEM",
    city: "Memphis",
    name: "Grizzlies",
    slug: "memphis-grizzlies",
    conference: "West",
    division: "Southwest",
    primaryColor: "#5D76A9",
    secondaryColor: "#12173F",
    founded: 1995,
    arena: "FedExForum",
  },
  {
    abbr: "NOP",
    city: "New Orleans",
    name: "Pelicans",
    slug: "new-orleans-pelicans",
    conference: "West",
    division: "Southwest",
    primaryColor: "#0C2340",
    secondaryColor: "#C8A956",
    founded: 2002,
    arena: "Smoothie King Center",
  },
  {
    abbr: "SAS",
    city: "San Antonio",
    name: "Spurs",
    slug: "san-antonio-spurs",
    conference: "West",
    division: "Southwest",
    primaryColor: "#C4CED4",
    secondaryColor: "#000000",
    founded: 1967,
    arena: "Frost Bank Center",
  },
];

async function main() {
  console.log("🏀 Seed des 30 franchises NBA…\n");

  let created = 0;
  let updated = 0;

  for (const team of TEAMS) {
    const result = await prisma.team.upsert({
      where: { abbr: team.abbr },
      update: {
        city: team.city,
        name: team.name,
        slug: team.slug,
        conference: team.conference,
        division: team.division,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        founded: team.founded,
        arena: team.arena,
      },
      create: team,
    });

    const action = result.createdAt === result.updatedAt ? "created" : "upsert";
    if (action === "created") {
      created++;
    } else {
      updated++;
    }

    console.log(`  ${team.abbr}  ${team.city} ${team.name}`);
  }

  console.log(
    `\n✅ ${TEAMS.length} équipes traitées (${created} créées, ${updated} mises à jour)`,
  );

  // Log dans SyncLog
  await prisma.syncLog.create({
    data: {
      source: "seed-teams",
      status: "success",
      itemsProcessed: TEAMS.length,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  console.log("📋 SyncLog enregistré.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
