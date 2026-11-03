/**
 * Peuple logoUrl pour les 30 équipes NBA
 * Source : cdn.nba.com/logos/nba/{teamId}/global/D/logo.svg
 *
 * Variante « D » (fond sombre) : le site est entièrement sombre, et la
 * variante claire rendait illisibles les logos noirs (Spurs, Blazers…).
 *
 * Run: npm run seed:logos
 */

import { prisma } from "@/lib/prisma";
import { NBA_TEAM_IDS, nbaLogoUrl } from "@/lib/team-logos";

async function main() {
  let updated = 0;
  let missing = 0;

  for (const [abbr, id] of Object.entries(NBA_TEAM_IDS)) {
    const result = await prisma.team.updateMany({
      where: { abbr },
      data: { logoUrl: nbaLogoUrl(id) },
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
