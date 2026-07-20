import { Prisma, PrismaClient } from "@prisma/client";
import { resolvePlayerIdentity } from "../lib/stats/player-identity";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  const rows = await prisma.playerBoxScore.findMany({
    where: { playerId: null, didNotPlay: false },
    select: {
      id: true,
      playerName: true,
      espnAthleteId: true,
      teamAbbr: true,
      game: { select: { season: true } },
    },
  });
  const rosters = await prisma.playerSeason.findMany({
    select: {
      season: true,
      team: { select: { abbr: true } },
      player: {
        select: { id: true, espnId: true, firstName: true, lastName: true },
      },
    },
  });
  const allCandidates = await prisma.player.findMany({
    select: { id: true, espnId: true, firstName: true, lastName: true },
  });
  const candidatesByRoster = new Map<string, typeof rosters[number]["player"][]>();
  for (const roster of rosters) {
    const key = `${roster.season}:${roster.team.abbr}`;
    const candidates = candidatesByRoster.get(key) ?? [];
    if (!candidates.some((candidate) => candidate.id === roster.player.id)) {
      candidates.push(roster.player);
    }
    candidatesByRoster.set(key, candidates);
  }

  let resolved = 0;
  const updates: Array<{ id: string; playerId: string }> = [];
  for (const row of rows) {
    const candidates = candidatesByRoster.get(`${row.game.season}:${row.teamAbbr}`) ?? [];
    const player =
      resolvePlayerIdentity(row.espnAthleteId, row.playerName, candidates) ??
      resolvePlayerIdentity(row.espnAthleteId, row.playerName, allCandidates);
    if (!player) continue;
    updates.push({ id: row.id, playerId: player.id });
    resolved++;
  }
  for (let index = 0; index < updates.length; index += 500) {
    const batch = updates.slice(index, index + 500);
    const values = Prisma.join(
      batch.map((update) => Prisma.sql`(${update.id}, ${update.playerId})`),
    );
    await prisma.$executeRaw`
      UPDATE "PlayerBoxScore" AS box_score
      SET "playerId" = resolved."playerId"
      FROM (VALUES ${values}) AS resolved(id, "playerId")
      WHERE box_score.id = resolved.id
    `;
  }
  console.log(`Identités résolues : ${resolved}/${rows.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
