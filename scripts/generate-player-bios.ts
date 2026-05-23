/**
 * Génération de biographies joueurs en français
 *
 * Ce script est one-shot (début de saison ou à la demande).
 * Il NE tourne PAS dans le cron quotidien.
 *
 * Pour chaque joueur sans biographie (ou --force pour tous) :
 *   1. Fetch l'extrait Wikipedia anglais du joueur
 *   2. Envoie à Claude pour synthèse en 2-3 phrases français
 *   3. Stocke dans Player.summaryFr
 *
 * Run : pnpm tsx scripts/generate-player-bios.ts
 * Run (force tous) : pnpm tsx scripts/generate-player-bios.ts --force
 * Run (1 joueur) : pnpm tsx scripts/generate-player-bios.ts --slug lebron-james
 */

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FORCE = process.argv.includes("--force");
const SLUG_ARG = (() => {
  const i = process.argv.indexOf("--slug");
  return i > -1 ? process.argv[i + 1] : null;
})();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Wikipedia : extrait intro du joueur ─────────────────────────────────────

async function fetchWikiExtract(
  firstName: string,
  lastName: string,
): Promise<string | null> {
  const name = `${firstName}_${lastName}`;
  const encoded = encodeURIComponent(name);

  // Stratégie 1 : page disambiguation basketball
  const url1 = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}_(basketball_player)`;
  const r1 = await fetch(url1, {
    headers: {
      "User-Agent": "hoopstats-bios/1.0 (contact: stempfel.rodolphe@gmail.com)",
    },
  });
  if (r1.ok) {
    const d = (await r1.json()) as { extract?: string; title?: string };
    if (d.extract && d.extract.length > 80) return d.extract;
  }

  // Stratégie 2 : page directe
  const url2 = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const r2 = await fetch(url2, {
    headers: {
      "User-Agent": "hoopstats-bios/1.0 (contact: stempfel.rodolphe@gmail.com)",
    },
  });
  if (r2.ok) {
    const d = (await r2.json()) as { extract?: string; type?: string };
    if (d.extract && d.extract.length > 80 && d.type !== "disambiguation") {
      const lower = d.extract.toLowerCase();
      if (lower.includes("basketball") || lower.includes("nba")) {
        return d.extract;
      }
    }
  }

  return null;
}

// ─── Claude : synthèse biographique en français ───────────────────────────────

async function generateBioFr(
  firstName: string,
  lastName: string,
  wikiExtract: string,
): Promise<string> {
  const prompt = `Tu es un rédacteur sportif francophone spécialisé NBA.

Voici l'extrait Wikipedia (en anglais) de ${firstName} ${lastName}, joueur NBA :

"""
${wikiExtract.slice(0, 1200)}
"""

Rédige une biographie de 2 à 3 phrases en français, à la 3e personne.
Focus sur : draft (année, rang, équipe), formation (université ou pays d'origine), parcours en NBA, faits marquants.
Évite de mentionner les statistiques — elles sont déjà affichées sur la page.
Ton neutre, informatif. Pas de phrase d'accroche. Commence directement par le nom du joueur.`;

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Claude: no text block");
  return block.text.trim();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY manquante");
    process.exit(1);
  }

  // Sélection des joueurs à traiter
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

  console.log(`\n📚 Génération biographies — ${players.length} joueurs`);
  if (FORCE) console.log("   Mode --force : tous les joueurs");
  if (SLUG_ARG) console.log(`   Mode --slug : ${SLUG_ARG}`);
  console.log();

  let done = 0;
  let noWiki = 0;
  let errors = 0;

  for (const player of players) {
    process.stdout.write(
      `[${done + noWiki + errors + 1}/${players.length}] ${player.firstName} ${player.lastName}... `,
    );

    try {
      // 1. Wikipedia
      const extract = await fetchWikiExtract(player.firstName, player.lastName);
      if (!extract) {
        console.log("⚠️  pas de page Wikipedia");
        noWiki++;
        await sleep(300);
        continue;
      }

      // 2. Claude
      const bio = await generateBioFr(
        player.firstName,
        player.lastName,
        extract,
      );

      // 3. DB
      await prisma.player.update({
        where: { id: player.id },
        data: { summaryFr: bio, summaryGeneratedAt: new Date() },
      });

      console.log(`✅`);
      done++;
    } catch (e) {
      console.log(`❌ ${e instanceof Error ? e.message : e}`);
      errors++;
    }

    // Respecte rate limits (Wikipedia ~200 req/s, Claude ~50 req/min sur Haiku)
    await sleep(1300);
  }

  console.log(`\n✅ ${done} biographies générées`);
  console.log(`⚠️  ${noWiki} sans page Wikipedia`);
  if (errors) console.log(`❌ ${errors} erreurs`);
}

main().finally(() => prisma.$disconnect());
