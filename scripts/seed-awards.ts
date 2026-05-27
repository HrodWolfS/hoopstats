/**
 * Seed des trophées NBA — individuels (MVP, DPOY, MIP, ROY, SMOY, FMVP, NBA_CUP_MVP)
 * et collectifs (NBA_CHAMPION, EAST_CHAMPION, WEST_CHAMPION, NBA_CUP_CHAMPION).
 *
 * Couvre les saisons 2015-16 → 2024-25.
 * Résout les joueurs par slug et les équipes par abréviation.
 * Idempotent : supprime puis recrée tous les awards.
 *
 * Usage : `pnpm tsx scripts/seed-awards.ts`
 */
import { PrismaClient } from "@prisma/client";
import { playerSlug } from "../lib/slugs";

const prisma = new PrismaClient();

type IndividualAward = {
  type:
    | "MVP"
    | "DPOY"
    | "MIP"
    | "ROY"
    | "SMOY"
    | "FMVP"
    | "NBA_CUP_MVP"
    | "CPOY"; // Clutch Player of the Year (depuis 2022-23)
  season: string;
  player: string; // "Prénom Nom"
  teamAbbr: string; // équipe au moment de la récompense
  notes?: string;
};

type CoachAward = {
  type: "COY"; // Coach of the Year
  season: string;
  coachName: string;
  teamAbbr: string;
  notes?: string;
};

type TeamTrophy = {
  type: "NBA_CHAMPION" | "EAST_CHAMPION" | "WEST_CHAMPION" | "NBA_CUP_CHAMPION";
  season: string;
  teamAbbr: string;
  notes?: string;
};

// ── Trophées individuels ─────────────────────────────────────────────────────

const INDIVIDUAL: IndividualAward[] = [
  // MVP — Most Valuable Player
  {
    type: "MVP",
    season: "2015-16",
    player: "Stephen Curry",
    teamAbbr: "GSW",
    notes: "MVP à l'unanimité",
  },
  {
    type: "MVP",
    season: "2016-17",
    player: "Russell Westbrook",
    teamAbbr: "OKC",
    notes: "Saison en triple-double de moyenne",
  },
  { type: "MVP", season: "2017-18", player: "James Harden", teamAbbr: "HOU" },
  {
    type: "MVP",
    season: "2018-19",
    player: "Giannis Antetokounmpo",
    teamAbbr: "MIL",
  },
  {
    type: "MVP",
    season: "2019-20",
    player: "Giannis Antetokounmpo",
    teamAbbr: "MIL",
    notes: "Back-to-back",
  },
  {
    type: "MVP",
    season: "2020-21",
    player: "Nikola Jokic",
    teamAbbr: "DEN",
    notes: "Premier centre depuis Shaq",
  },
  {
    type: "MVP",
    season: "2021-22",
    player: "Nikola Jokic",
    teamAbbr: "DEN",
    notes: "Back-to-back",
  },
  { type: "MVP", season: "2022-23", player: "Joel Embiid", teamAbbr: "PHI" },
  {
    type: "MVP",
    season: "2023-24",
    player: "Nikola Jokic",
    teamAbbr: "DEN",
    notes: "3e MVP en 4 ans",
  },
  {
    type: "MVP",
    season: "2024-25",
    player: "Shai Gilgeous-Alexander",
    teamAbbr: "OKC",
  },
  {
    type: "MVP",
    season: "2025-26",
    player: "Shai Gilgeous-Alexander",
    teamAbbr: "OKC",
    notes: "Back-to-back",
  },

  // DPOY — Defensive Player of the Year
  { type: "DPOY", season: "2015-16", player: "Kawhi Leonard", teamAbbr: "SAS" },
  {
    type: "DPOY",
    season: "2016-17",
    player: "Draymond Green",
    teamAbbr: "GSW",
  },
  { type: "DPOY", season: "2017-18", player: "Rudy Gobert", teamAbbr: "UTA" },
  { type: "DPOY", season: "2018-19", player: "Rudy Gobert", teamAbbr: "UTA" },
  {
    type: "DPOY",
    season: "2019-20",
    player: "Giannis Antetokounmpo",
    teamAbbr: "MIL",
  },
  { type: "DPOY", season: "2020-21", player: "Rudy Gobert", teamAbbr: "UTA" },
  {
    type: "DPOY",
    season: "2021-22",
    player: "Marcus Smart",
    teamAbbr: "BOS",
    notes: "1er arrière depuis Gary Payton (1996)",
  },
  {
    type: "DPOY",
    season: "2022-23",
    player: "Jaren Jackson Jr.",
    teamAbbr: "MEM",
  },
  {
    type: "DPOY",
    season: "2023-24",
    player: "Rudy Gobert",
    teamAbbr: "MIN",
    notes: "4e titre, record absolu",
  },
  { type: "DPOY", season: "2024-25", player: "Evan Mobley", teamAbbr: "CLE" },
  {
    type: "DPOY",
    season: "2025-26",
    player: "Victor Wembanyama",
    teamAbbr: "SAS",
  },

  // MIP — Most Improved Player
  { type: "MIP", season: "2015-16", player: "CJ McCollum", teamAbbr: "POR" },
  {
    type: "MIP",
    season: "2016-17",
    player: "Giannis Antetokounmpo",
    teamAbbr: "MIL",
  },
  { type: "MIP", season: "2017-18", player: "Victor Oladipo", teamAbbr: "IND" },
  { type: "MIP", season: "2018-19", player: "Pascal Siakam", teamAbbr: "TOR" },
  { type: "MIP", season: "2019-20", player: "Brandon Ingram", teamAbbr: "NOP" },
  { type: "MIP", season: "2020-21", player: "Julius Randle", teamAbbr: "NYK" },
  { type: "MIP", season: "2021-22", player: "Ja Morant", teamAbbr: "MEM" },
  {
    type: "MIP",
    season: "2022-23",
    player: "Lauri Markkanen",
    teamAbbr: "UTA",
  },
  { type: "MIP", season: "2023-24", player: "Tyrese Maxey", teamAbbr: "PHI" },
  { type: "MIP", season: "2024-25", player: "Dyson Daniels", teamAbbr: "ATL" },
  {
    type: "MIP",
    season: "2025-26",
    player: "Nickeil Alexander-Walker",
    teamAbbr: "ATL",
  },

  // ROY — Rookie of the Year
  {
    type: "ROY",
    season: "2015-16",
    player: "Karl-Anthony Towns",
    teamAbbr: "MIN",
    notes: "Unanime",
  },
  {
    type: "ROY",
    season: "2016-17",
    player: "Malcolm Brogdon",
    teamAbbr: "MIL",
    notes: "1er ROY drafté au 2nd tour",
  },
  { type: "ROY", season: "2017-18", player: "Ben Simmons", teamAbbr: "PHI" },
  { type: "ROY", season: "2018-19", player: "Luka Doncic", teamAbbr: "DAL" },
  { type: "ROY", season: "2019-20", player: "Ja Morant", teamAbbr: "MEM" },
  { type: "ROY", season: "2020-21", player: "LaMelo Ball", teamAbbr: "CHA" },
  { type: "ROY", season: "2021-22", player: "Scottie Barnes", teamAbbr: "TOR" },
  { type: "ROY", season: "2022-23", player: "Paolo Banchero", teamAbbr: "ORL" },
  {
    type: "ROY",
    season: "2023-24",
    player: "Victor Wembanyama",
    teamAbbr: "SAS",
    notes: "Unanime",
  },
  { type: "ROY", season: "2024-25", player: "Stephon Castle", teamAbbr: "SAS" },
  {
    type: "ROY",
    season: "2025-26",
    player: "Cooper Flagg",
    teamAbbr: "DAL",
    notes: "1er choix de la draft 2025",
  },

  // SMOY — Sixth Man of the Year
  {
    type: "SMOY",
    season: "2015-16",
    player: "Jamal Crawford",
    teamAbbr: "LAC",
    notes: "Record : 3e titre de SMOY",
  },
  { type: "SMOY", season: "2016-17", player: "Eric Gordon", teamAbbr: "HOU" },
  { type: "SMOY", season: "2017-18", player: "Lou Williams", teamAbbr: "LAC" },
  {
    type: "SMOY",
    season: "2018-19",
    player: "Lou Williams",
    teamAbbr: "LAC",
    notes: "Back-to-back",
  },
  {
    type: "SMOY",
    season: "2019-20",
    player: "Montrezl Harrell",
    teamAbbr: "LAC",
  },
  {
    type: "SMOY",
    season: "2020-21",
    player: "Jordan Clarkson",
    teamAbbr: "UTA",
  },
  { type: "SMOY", season: "2021-22", player: "Tyler Herro", teamAbbr: "MIA" },
  {
    type: "SMOY",
    season: "2022-23",
    player: "Malcolm Brogdon",
    teamAbbr: "BOS",
  },
  { type: "SMOY", season: "2023-24", player: "Naz Reid", teamAbbr: "MIN" },
  {
    type: "SMOY",
    season: "2024-25",
    player: "Payton Pritchard",
    teamAbbr: "BOS",
  },
  {
    type: "SMOY",
    season: "2025-26",
    player: "Keldon Johnson",
    teamAbbr: "SAS",
  },

  // FMVP — Finals MVP
  {
    type: "FMVP",
    season: "2015-16",
    player: "LeBron James",
    teamAbbr: "CLE",
    notes: "Remontée historique 3-1",
  },
  { type: "FMVP", season: "2016-17", player: "Kevin Durant", teamAbbr: "GSW" },
  {
    type: "FMVP",
    season: "2017-18",
    player: "Kevin Durant",
    teamAbbr: "GSW",
    notes: "Back-to-back",
  },
  { type: "FMVP", season: "2018-19", player: "Kawhi Leonard", teamAbbr: "TOR" },
  {
    type: "FMVP",
    season: "2019-20",
    player: "LeBron James",
    teamAbbr: "LAL",
    notes: "FMVP avec 3 franchises différentes",
  },
  {
    type: "FMVP",
    season: "2020-21",
    player: "Giannis Antetokounmpo",
    teamAbbr: "MIL",
    notes: "50 pts en Game 6",
  },
  {
    type: "FMVP",
    season: "2021-22",
    player: "Stephen Curry",
    teamAbbr: "GSW",
    notes: "Premier FMVP de sa carrière",
  },
  { type: "FMVP", season: "2022-23", player: "Nikola Jokic", teamAbbr: "DEN" },
  { type: "FMVP", season: "2023-24", player: "Jaylen Brown", teamAbbr: "BOS" },
  {
    type: "FMVP",
    season: "2024-25",
    player: "Shai Gilgeous-Alexander",
    teamAbbr: "OKC",
  },

  // NBA Cup MVP (depuis 2023-24)
  {
    type: "NBA_CUP_MVP",
    season: "2023-24",
    player: "LeBron James",
    teamAbbr: "LAL",
    notes: "1re édition de la NBA Cup",
  },
  {
    type: "NBA_CUP_MVP",
    season: "2024-25",
    player: "Giannis Antetokounmpo",
    teamAbbr: "MIL",
  },
  {
    type: "NBA_CUP_MVP",
    season: "2025-26",
    player: "Jalen Brunson",
    teamAbbr: "NYK",
  },

  // Clutch Player of the Year (depuis 2022-23)
  {
    type: "CPOY",
    season: "2022-23",
    player: "De'Aaron Fox",
    teamAbbr: "SAC",
    notes: "1re édition du trophée",
  },
  { type: "CPOY", season: "2023-24", player: "Stephen Curry", teamAbbr: "GSW" },
  { type: "CPOY", season: "2024-25", player: "Jalen Brunson", teamAbbr: "NYK" },
  {
    type: "CPOY",
    season: "2025-26",
    player: "Shai Gilgeous-Alexander",
    teamAbbr: "OKC",
  },
];

// ── Coach of the Year ────────────────────────────────────────────────────────

const COACHES: CoachAward[] = [
  {
    type: "COY",
    season: "2015-16",
    coachName: "Steve Kerr",
    teamAbbr: "GSW",
    notes: "Record NBA : 73 victoires",
  },
  {
    type: "COY",
    season: "2016-17",
    coachName: "Mike D'Antoni",
    teamAbbr: "HOU",
  },
  { type: "COY", season: "2017-18", coachName: "Dwane Casey", teamAbbr: "TOR" },
  {
    type: "COY",
    season: "2018-19",
    coachName: "Mike Budenholzer",
    teamAbbr: "MIL",
  },
  { type: "COY", season: "2019-20", coachName: "Nick Nurse", teamAbbr: "TOR" },
  {
    type: "COY",
    season: "2020-21",
    coachName: "Tom Thibodeau",
    teamAbbr: "NYK",
  },
  {
    type: "COY",
    season: "2021-22",
    coachName: "Monty Williams",
    teamAbbr: "PHX",
  },
  { type: "COY", season: "2022-23", coachName: "Mike Brown", teamAbbr: "SAC" },
  {
    type: "COY",
    season: "2023-24",
    coachName: "Mark Daigneault",
    teamAbbr: "OKC",
  },
  {
    type: "COY",
    season: "2024-25",
    coachName: "Kenny Atkinson",
    teamAbbr: "CLE",
  },
  {
    type: "COY",
    season: "2025-26",
    coachName: "Joe Mazzulla",
    teamAbbr: "BOS",
  },
];

// ── Trophées collectifs ──────────────────────────────────────────────────────

const TEAM_TROPHIES: TeamTrophy[] = [
  // Champions NBA
  {
    type: "NBA_CHAMPION",
    season: "2015-16",
    teamAbbr: "CLE",
    notes: "Premier titre de l'histoire des Cavs",
  },
  { type: "NBA_CHAMPION", season: "2016-17", teamAbbr: "GSW" },
  {
    type: "NBA_CHAMPION",
    season: "2017-18",
    teamAbbr: "GSW",
    notes: "Back-to-back",
  },
  {
    type: "NBA_CHAMPION",
    season: "2018-19",
    teamAbbr: "TOR",
    notes: "Premier titre canadien",
  },
  {
    type: "NBA_CHAMPION",
    season: "2019-20",
    teamAbbr: "LAL",
    notes: "Saison interrompue par le Covid (bulle d'Orlando)",
  },
  {
    type: "NBA_CHAMPION",
    season: "2020-21",
    teamAbbr: "MIL",
    notes: "1er titre depuis 1971",
  },
  { type: "NBA_CHAMPION", season: "2021-22", teamAbbr: "GSW" },
  {
    type: "NBA_CHAMPION",
    season: "2022-23",
    teamAbbr: "DEN",
    notes: "Premier titre de l'histoire des Nuggets",
  },
  {
    type: "NBA_CHAMPION",
    season: "2023-24",
    teamAbbr: "BOS",
    notes: "Record : 18e titre",
  },
  {
    type: "NBA_CHAMPION",
    season: "2024-25",
    teamAbbr: "OKC",
    notes: "Premier titre depuis le déménagement de Seattle",
  },

  // Champions Conférence Est
  { type: "EAST_CHAMPION", season: "2015-16", teamAbbr: "CLE" },
  { type: "EAST_CHAMPION", season: "2016-17", teamAbbr: "CLE" },
  { type: "EAST_CHAMPION", season: "2017-18", teamAbbr: "CLE" },
  { type: "EAST_CHAMPION", season: "2018-19", teamAbbr: "TOR" },
  { type: "EAST_CHAMPION", season: "2019-20", teamAbbr: "MIA" },
  { type: "EAST_CHAMPION", season: "2020-21", teamAbbr: "MIL" },
  { type: "EAST_CHAMPION", season: "2021-22", teamAbbr: "BOS" },
  { type: "EAST_CHAMPION", season: "2022-23", teamAbbr: "MIA" },
  { type: "EAST_CHAMPION", season: "2023-24", teamAbbr: "BOS" },
  { type: "EAST_CHAMPION", season: "2024-25", teamAbbr: "IND" },
  { type: "EAST_CHAMPION", season: "2025-26", teamAbbr: "NYK" },

  // Champions Conférence Ouest
  { type: "WEST_CHAMPION", season: "2015-16", teamAbbr: "GSW" },
  { type: "WEST_CHAMPION", season: "2016-17", teamAbbr: "GSW" },
  { type: "WEST_CHAMPION", season: "2017-18", teamAbbr: "GSW" },
  { type: "WEST_CHAMPION", season: "2018-19", teamAbbr: "GSW" },
  { type: "WEST_CHAMPION", season: "2019-20", teamAbbr: "LAL" },
  { type: "WEST_CHAMPION", season: "2020-21", teamAbbr: "PHX" },
  { type: "WEST_CHAMPION", season: "2021-22", teamAbbr: "GSW" },
  { type: "WEST_CHAMPION", season: "2022-23", teamAbbr: "DEN" },
  { type: "WEST_CHAMPION", season: "2023-24", teamAbbr: "DAL" },
  { type: "WEST_CHAMPION", season: "2024-25", teamAbbr: "OKC" },

  // NBA Cup Champions (depuis 2023-24)
  { type: "NBA_CUP_CHAMPION", season: "2023-24", teamAbbr: "LAL" },
  { type: "NBA_CUP_CHAMPION", season: "2024-25", teamAbbr: "MIL" },
  { type: "NBA_CUP_CHAMPION", season: "2025-26", teamAbbr: "NYK" },
];

// ── Résolution équipes (gérer les déménagements) ─────────────────────────────

/** Abréviations actuelles utilisées dans la DB pour des franchises ayant changé d'abbr. */
const TEAM_ABBR_ALIASES: Record<string, string> = {
  // (placeholder — utile si on remonte plus loin que 2015-16)
};

async function resolveTeamId(abbr: string): Promise<string | null> {
  const dbAbbr = TEAM_ABBR_ALIASES[abbr] ?? abbr;
  const team = await prisma.team.findUnique({ where: { abbr: dbAbbr } });
  return team?.id ?? null;
}

async function resolvePlayerId(fullName: string): Promise<string | null> {
  const slug = playerSlug(
    fullName.split(" ")[0],
    fullName.split(" ").slice(1).join(" "),
  );
  const player = await prisma.player.findUnique({ where: { slug } });
  return player?.id ?? null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🏆 Seed des trophées NBA…");

  // Idempotent : on repart de zéro
  const deleted = await prisma.award.deleteMany();
  console.log(`  → ${deleted.count} awards supprimés`);

  const missingPlayers: string[] = [];
  const missingTeams: string[] = [];
  let inserted = 0;

  // Individuels
  for (const a of INDIVIDUAL) {
    const playerId = await resolvePlayerId(a.player);
    const teamId = await resolveTeamId(a.teamAbbr);

    if (!playerId) missingPlayers.push(`${a.player} (${a.season} ${a.type})`);
    if (!teamId) missingTeams.push(`${a.teamAbbr} (${a.season} ${a.type})`);

    if (!playerId && !teamId) continue;

    await prisma.award.create({
      data: {
        type: a.type,
        season: a.season,
        playerId,
        teamId,
        notes: a.notes,
      },
    });
    inserted++;
  }

  // Coach of the Year
  for (const c of COACHES) {
    const teamId = await resolveTeamId(c.teamAbbr);
    if (!teamId) {
      missingTeams.push(`${c.teamAbbr} (${c.season} ${c.type})`);
      continue;
    }

    await prisma.award.create({
      data: {
        type: c.type,
        season: c.season,
        teamId,
        coachName: c.coachName,
        notes: c.notes,
      },
    });
    inserted++;
  }

  // Collectifs
  for (const t of TEAM_TROPHIES) {
    const teamId = await resolveTeamId(t.teamAbbr);
    if (!teamId) {
      missingTeams.push(`${t.teamAbbr} (${t.season} ${t.type})`);
      continue;
    }

    await prisma.award.create({
      data: {
        type: t.type,
        season: t.season,
        teamId,
        notes: t.notes,
      },
    });
    inserted++;
  }

  console.log(`✅ ${inserted} awards insérés`);

  if (missingPlayers.length) {
    console.log(`\n⚠️  Joueurs introuvables (${missingPlayers.length}) :`);
    missingPlayers.forEach((p) => console.log(`   - ${p}`));
  }
  if (missingTeams.length) {
    console.log(`\n⚠️  Équipes introuvables (${missingTeams.length}) :`);
    missingTeams.forEach((t) => console.log(`   - ${t}`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
