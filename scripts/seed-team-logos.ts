/**
 * Peuple logoUrl pour les 30 équipes NBA
 * Source : cdn.nba.com/logos/nba/{teamId}/global/L/logo.svg
 *
 * Run: npm run seed:logos
 */

import { prisma } from "@/lib/prisma";

// abbr → NBA team ID officiel
const NBA_IDS: Record<string, number> = {
  ATL: 1610612737,
  BOS: 1610612738,
  BKN: 1610612751,
  CHA: 1610612766,
  CHI: 1610612741,
  CLE: 1610612739,
  DAL: 1610612742,
  DEN: 1610612743,
  DET: 1610612765,
  GSW: 1610612744,
  HOU: 1610612745,
  IND: 1610612754,
  LAC: 1610612746,
  LAL: 1610612747,
  MEM: 1610612763,
  MIA: 1610612748,
  MIL: 1610612749,
  MIN: 1610612750,
  NOP: 1610612740,
  NYK: 1610612752,
  OKC: 1610612760,
  ORL: 1610612753,
  PHI: 1610612755,
  PHX: 1610612756,
  POR: 1610612757,
  SAC: 1610612758,
  SAS: 1610612759,
  TOR: 1610612761,
  UTA: 1610612762,
  WAS: 1610612764,
};

function logoUrl(teamId: number): string {
  return `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;
}

async function main() {
  let updated = 0;
  let missing = 0;

  for (const [abbr, id] of Object.entries(NBA_IDS)) {
    const result = await prisma.team.updateMany({
      where: { abbr },
      data: { logoUrl: logoUrl(id) },
    });
    if (result.count > 0) {
      updated++;
    } else {
      console.warn(`⚠️  Équipe non trouvée en DB: ${abbr}`);
      missing++;
    }
  }

  console.log(`✅ ${updated} logos mis à jour`);
  if (missing) console.log(`⚠️  ${missing} équipes non trouvées`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
