/**
 * Génération de biographies joueurs en français
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Script ONE-SHOT — NE tourne PAS dans le cron quotidien             │
 * │  À lancer : début de saison (octobre) + nouveaux joueurs            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Source : Wikipedia FR (extrait intro), fallback Wikipedia EN.
 * Pas d'API externe payante — entièrement gratuit.
 *
 * Stratégie par joueur :
 *   1. fr.wikipedia.org → "{Prénom}_{Nom}" ou "{Prénom}_{Nom}_(basketteur)"
 *   2. en.wikipedia.org → "{First}_{Last}" ou "{First}_{Last}_(basketball)"
 *   3. Si rien trouvé : champ laissé null (visible dans les stats finales)
 *
 * Le texte est tronqué aux 3 premières phrases pour rester concis.
 *
 * Commandes :
 *   pnpm tsx scripts/generate-player-bios.ts              # joueurs sans bio
 *   pnpm tsx scripts/generate-player-bios.ts --force      # tous (écrase)
 *   pnpm tsx scripts/generate-player-bios.ts --slug lebron-james
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

const FORCE = process.argv.includes("--force");
const SLUG_ARG = (() => {
  const i = process.argv.indexOf("--slug");
  return i > -1 ? process.argv[i + 1] : null;
})();

const WIKI_UA =
  "hoopstats-bios/1.0 (https://hoopstats.fr; contact: stempfel.rodolphe@gmail.com)";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Tronque aux N premières phrases ─────────────────────────────────────────

function firstSentences(text: string, n = 3): string {
  // Découpe sur ". " ou ".\n" en évitant les abréviations courantes
  const parts = text.split(/(?<=(?<!\b(?:M|Mme|Dr|Jr|Sr|St|No|vol|p))\.) /);
  return parts.slice(0, n).join(". ").trim();
}

// ─── Fetch extrait Wikipedia ──────────────────────────────────────────────────

async function wikiSummary(url: string): Promise<string | null> {
  const res = await fetch(url, { headers: { "User-Agent": WIKI_UA } });
  if (!res.ok) return null;
  const d = (await res.json()) as {
    extract?: string;
    type?: string;
    title?: string;
  };
  if (!d.extract || d.extract.length < 80 || d.type === "disambiguation")
    return null;
  return d.extract;
}

async function fetchBioFr(
  firstName: string,
  lastName: string,
): Promise<{ text: string; source: string } | null> {
  const frName = encodeURIComponent(`${firstName}_${lastName}`);
  const enName = encodeURIComponent(`${firstName}_${lastName}`);

  // 1. Wikipedia FR — disambiguation basketteur
  const fr1 = await wikiSummary(
    `https://fr.wikipedia.org/api/rest_v1/page/summary/${frName}_(basketteur)`,
  );
  if (fr1) return { text: firstSentences(fr1), source: "fr-wiki" };

  // 2. Wikipedia FR — page directe
  const fr2 = await wikiSummary(
    `https://fr.wikipedia.org/api/rest_v1/page/summary/${frName}`,
  );
  if (fr2) {
    const lower = fr2.toLowerCase();
    if (lower.includes("basket") || lower.includes("nba"))
      return { text: firstSentences(fr2), source: "fr-wiki" };
  }

  // 3. Wikipedia EN — disambiguation basketball
  const en1 = await wikiSummary(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${enName}_(basketball)`,
  );
  if (en1) return { text: firstSentences(en1), source: "en-wiki" };

  // 4. Wikipedia EN — page directe
  const en2 = await wikiSummary(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${enName}`,
  );
  if (en2) {
    const lower = en2.toLowerCase();
    if (lower.includes("basketball") || lower.includes("nba"))
      return { text: firstSentences(en2), source: "en-wiki" };
  }

  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const where = SLUG_ARG
    ? { slug: SLUG_ARG }
    : FORCE
      ? {}
      : { summaryFr: null };

  const players = await prisma.player.findMany({
    where,
    select: { id: true, slug: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });

  console.log(`\n📚 Biographies joueurs — ${players.length} à traiter`);
  if (FORCE) console.log("   Mode --force : tous (écrase les existants)");
  if (SLUG_ARG) console.log(`   Mode --slug : ${SLUG_ARG}`);
  console.log();

  let done = 0;
  let noWiki = 0;
  let errors = 0;

  for (const player of players) {
    const idx = done + noWiki + errors + 1;
    process.stdout.write(
      `[${idx}/${players.length}] ${player.firstName} ${player.lastName}... `,
    );

    try {
      const result = await fetchBioFr(player.firstName, player.lastName);

      if (!result) {
        console.log("⚠️  introuvable sur Wikipedia");
        noWiki++;
        await sleep(300);
        continue;
      }

      await prisma.player.update({
        where: { id: player.id },
        data: { summaryFr: result.text, summaryGeneratedAt: new Date() },
      });

      console.log(`✅ (${result.source})`);
      done++;
    } catch (e) {
      console.log(`❌ ${e instanceof Error ? e.message : e}`);
      errors++;
    }

    // ~2 req/joueur × 300ms = ~1 joueur/seconde, bien en dessous des limites Wikipedia
    await sleep(600);
  }

  console.log(`\n─────────────────────────────`);
  console.log(`✅  ${done} biographies enregistrées`);
  console.log(`⚠️   ${noWiki} sans page Wikipedia`);
  if (errors) console.log(`❌  ${errors} erreurs`);
  console.log(
    `\nProchain run conseillé : début de saison (octobre) avec --force`,
  );
}

main().finally(() => prisma.$disconnect());
