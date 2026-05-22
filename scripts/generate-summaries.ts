/**
 * Sprint 5 — Génération de résumés joueurs via Anthropic Claude
 *
 * Pour chaque joueur avec au moins une saison en DB,
 * génère un résumé en français (~150 mots) basé sur ses stats carrière.
 *
 * Prérequis: ANTHROPIC_API_KEY dans .env
 * Run: npm run generate:summaries
 * Run (test 5 joueurs): npm run generate:summaries -- --limit 5
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const LIMIT_ARG = process.argv.includes("--limit")
  ? parseInt(process.argv[process.argv.indexOf("--limit") + 1] ?? "10")
  : null;

async function buildPrompt(
  firstName: string,
  lastName: string,
  position: string | null,
  seasons: Array<{
    season: string;
    teamAbbr: string;
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    trueShooting: number | null;
  }>,
): Promise<string> {
  const sorted = [...seasons].sort((a, b) => b.season.localeCompare(a.season));
  const latest = sorted[0];
  const careerGp = seasons.reduce((s, r) => s + r.gamesPlayed, 0);

  const statsLines = sorted
    .slice(0, 5)
    .map(
      (s) =>
        `  ${s.season} (${s.teamAbbr}): ${s.gamesPlayed} matchs — ${s.pointsPerGame.toFixed(1)} pts, ${s.reboundsPerGame.toFixed(1)} reb, ${s.assistsPerGame.toFixed(1)} ast`,
    )
    .join("\n");

  return `Tu es un rédacteur sportif français spécialisé en NBA.
Rédige un résumé court et factuel (~120-150 mots) en français sur le joueur NBA suivant.
Parle de son poste, son style de jeu, ses forces et ses statistiques récentes.
Ton sobre, informatif, sans superlatifs excessifs. Pas de titre, juste le texte.

Joueur: ${firstName} ${lastName}
Poste: ${position ?? "inconnu"}
Saisons en DB: ${seasons.length} (${careerGp} matchs au total)
Équipe actuelle: ${latest?.teamAbbr ?? "inconnue"}

Stats récentes (5 dernières saisons):
${statsLines}`;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "❌  ANTHROPIC_API_KEY manquant dans .env\n   Ajoute: ANTHROPIC_API_KEY=sk-ant-...",
    );
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Joueurs sans résumé avec au moins une saison
  const players = await prisma.player.findMany({
    where: {
      summaryFr: null,
      seasons: { some: {} },
    },
    include: {
      seasons: {
        include: { team: { select: { abbr: true } } },
        orderBy: { season: "desc" },
      },
    },
    take: LIMIT_ARG ?? undefined,
    orderBy: { updatedAt: "desc" },
  });

  console.log(
    `🤖 Génération résumés — ${players.length} joueurs à traiter${LIMIT_ARG ? ` (limite: ${LIMIT_ARG})` : ""}\n`,
  );

  let done = 0;
  let errors = 0;

  for (const player of players) {
    const seasons = player.seasons.map((ps) => ({
      season: ps.season,
      teamAbbr: ps.team.abbr,
      gamesPlayed: ps.gamesPlayed,
      pointsPerGame: ps.pointsPerGame,
      reboundsPerGame: ps.reboundsPerGame,
      assistsPerGame: ps.assistsPerGame,
      trueShooting: ps.trueShooting,
    }));

    process.stdout.write(
      `  [${done + 1}/${players.length}] ${player.firstName} ${player.lastName}… `,
    );

    try {
      const prompt = await buildPrompt(
        player.firstName,
        player.lastName,
        player.position,
        seasons,
      );

      const message = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      });

      const summary =
        message.content[0].type === "text"
          ? message.content[0].text.trim()
          : "";

      await prisma.player.update({
        where: { id: player.id },
        data: {
          summaryFr: summary,
          summaryGeneratedAt: new Date(),
        },
      });

      done++;
      console.log(`✓`);

      // Rate limit : ~3 req/sec max sur Haiku
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      errors++;
      console.log(`❌ ${err instanceof Error ? err.message : err}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`\n✅ ${done} résumés générés`);
  if (errors) console.log(`⚠️  ${errors} erreurs`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
