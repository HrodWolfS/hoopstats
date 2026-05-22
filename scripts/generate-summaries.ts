/**
 * Sprint 5 — Génération de résumés joueurs en français
 *
 * Génère un résumé factuel et contextualisé pour chaque joueur
 * actif en 2025-26, basé sur ses stats carrière.
 * Aucune API externe requise.
 *
 * Run: npm run generate:summaries
 * Run (test): npm run generate:summaries -- --limit 10
 */

import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";

const LIMIT_ARG = process.argv.includes("--limit")
  ? parseInt(process.argv[process.argv.indexOf("--limit") + 1] ?? "10")
  : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function positionFr(pos: string | null): string {
  if (!pos) return "joueur";
  const map: Record<string, string> = {
    G: "meneur/arrière",
    F: "ailier",
    C: "pivot",
    "G-F": "arrière-ailier",
    "F-G": "ailier-arrière",
    "F-C": "ailier-pivot",
    "C-F": "pivot-ailier",
    PG: "meneur",
    SG: "arrière",
    SF: "ailier",
    PF: "ailier fort",
  };
  return map[pos] ?? pos.toLowerCase();
}

function countryFr(country: string | null): string {
  if (!country) return "";
  const map: Record<string, string> = {
    USA: "américain",
    France: "français",
    Serbia: "serbe",
    Greece: "grec",
    Slovenia: "slovène",
    Canada: "canadien",
    Australia: "australien",
    Germany: "allemand",
    Latvia: "letton",
    Lithuania: "lituanien",
    Croatia: "croate",
    Spain: "espagnol",
    Nigeria: "nigérian",
    Cameroon: "camerounais",
    Turkey: "turc",
    "Democratic Republic of the Congo": "congolais",
    DRC: "congolais",
    Finland: "finlandais",
    "Bosnia and Herzegovina": "bosnien",
    Czech: "tchèque",
    Poland: "polonais",
    Italy: "italien",
    Argentina: "argentin",
    Brazil: "brésilien",
    "United Kingdom": "britannique",
    Scotland: "écossais",
    Montenegro: "monténégrin",
    Portugal: "portugais",
    Israel: "israélien",
    "South Sudan": "sud-soudanais",
    Sudan: "soudanais",
    Ukraine: "ukrainien",
    Georgia: "géorgien",
    "New Zealand": "néo-zélandais",
    Senegal: "sénégalais",
    Switzerland: "suisse",
    "Cape Verde": "cap-verdien",
    China: "chinois",
    "South Korea": "sud-coréen",
    Japan: "japonais",
  };
  return map[country] ?? "";
}

/** Qualifie le scoring d'un joueur */
function scoringLabel(pts: number): string {
  if (pts >= 25) return "l'un des meilleurs scoreurs de la ligue";
  if (pts >= 20) return "un scoreur de premier plan";
  if (pts >= 15) return "un apport offensif fiable";
  if (pts >= 10) return "un contributeur offensif régulier";
  if (pts >= 5) return "un joueur de rotation";
  return "un élément de fond de banc";
}

/** Qualifie l'efficacité (True Shooting %) */
function efficiencyNote(ts: number | null): string {
  if (ts == null) return "";
  const pct = ts * 100;
  if (pct >= 62) return "une efficacité remarquable au tir";
  if (pct >= 57) return "une bonne efficacité au tir";
  if (pct >= 52) return "une efficacité correcte au tir";
  return "des difficultés d'efficacité";
}

/** Qualifie l'experience carrière */
function experienceNote(seasons: number, gp: number): string {
  if (seasons <= 1) return "recrue NBA";
  if (seasons <= 3) return `joueur en développement (${seasons} saisons)`;
  if (seasons <= 7)
    return `joueur expérimenté (${seasons} saisons, ${gp} matchs au total)`;
  return `vétéran de la ligue (${seasons} saisons, ${gp} matchs en carrière)`;
}

/** Génère le résumé complet */
function buildSummary(player: {
  firstName: string;
  lastName: string;
  position: string | null;
  country: string | null;
  seasons: Array<{
    season: string;
    team: { abbr: string; city: string; name: string };
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    stealsPerGame: number;
    blocksPerGame: number;
    trueShooting: number | null;
    usageRate: number | null;
  }>;
}): string {
  const sorted = [...player.seasons].sort((a, b) =>
    b.season.localeCompare(a.season),
  );
  const latest = sorted[0];
  if (!latest) return "";

  const pos = positionFr(player.position);
  const nat = countryFr(player.country);
  const team = `${latest.team.city} ${latest.team.name}`;
  const totalGp = player.seasons.reduce((s, r) => s + r.gamesPlayed, 0);

  // Phrase d'intro
  const intro = nat
    ? `${player.firstName} ${player.lastName} est un ${pos} ${nat} évoluant actuellement avec les ${team}.`
    : `${player.firstName} ${player.lastName} est un ${pos} des ${team}.`;

  // Stats saison actuelle
  const pts = latest.pointsPerGame.toFixed(1);
  const reb = latest.reboundsPerGame.toFixed(1);
  const ast = latest.assistsPerGame.toFixed(1);
  const gp = latest.gamesPlayed;
  const tsNote = efficiencyNote(latest.trueShooting);

  const statsLine = `En ${gp} matchs lors de la saison ${latest.season}, il contribue à hauteur de ${pts} points, ${reb} rebonds et ${ast} passes décisives par rencontre${tsNote ? `, affichant ${tsNote}` : ""}.`;

  // Contexte carrière
  const expNote = experienceNote(player.seasons.length, totalGp);
  const scoringCtx = scoringLabel(latest.pointsPerGame);

  // Stats défensives notables
  const defParts: string[] = [];
  if (latest.stealsPerGame >= 1.5)
    defParts.push(`${latest.stealsPerGame.toFixed(1)} interceptions`);
  if (latest.blocksPerGame >= 1.5)
    defParts.push(`${latest.blocksPerGame.toFixed(1)} contres`);
  const defLine = defParts.length
    ? ` Sur le plan défensif, il se distingue avec ${defParts.join(" et ")} par match.`
    : "";

  // Usage
  const usageLine =
    latest.usageRate && latest.usageRate > 0.28
      ? ` Son taux d'utilisation élevé (${(latest.usageRate * 100).toFixed(0)}%) confirme son rôle central dans le système offensif.`
      : "";

  // Saisons précédentes (si pertinent)
  let careerLine = "";
  if (player.seasons.length > 1) {
    careerLine = ` ${player.firstName.split(" ")[0]} est ${expNote}.`;
  } else {
    careerLine = ` Il fait partie des recrues les plus en vue de cette saison.`;
  }

  // Contexte de niveau
  const levelLine = ` Considéré comme ${scoringCtx}, il apporte une contribution précieuse à son équipe.`;

  return `${intro} ${statsLine}${defLine}${usageLine}${careerLine}${levelLine}`.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const players = await prisma.player.findMany({
    where: {
      summaryFr: null,
      seasons: { some: { season: CURRENT_SEASON } },
    },
    include: {
      seasons: {
        include: {
          team: { select: { abbr: true, city: true, name: true } },
        },
        orderBy: { season: "desc" },
      },
    },
    take: LIMIT_ARG ?? undefined,
    orderBy: { lastName: "asc" },
  });

  console.log(
    `📝 Génération résumés — ${players.length} joueurs${LIMIT_ARG ? ` (limite: ${LIMIT_ARG})` : ""}\n`,
  );

  let done = 0;
  let skipped = 0;

  for (const player of players) {
    const summary = buildSummary(player);
    if (!summary) {
      skipped++;
      continue;
    }

    await prisma.player.update({
      where: { id: player.id },
      data: {
        summaryFr: summary,
        summaryGeneratedAt: new Date(),
      },
    });

    done++;
    if (done % 50 === 0)
      process.stdout.write(`  ${done}/${players.length} résumés générés…\n`);
  }

  await prisma.syncLog.create({
    data: {
      source: "generate-summaries",
      status: "success",
      itemsProcessed: done,
      errors: { skipped },
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  console.log(`\n✅ ${done} résumés générés`);
  if (skipped) console.log(`⏭️  ${skipped} skippés (pas de saison)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
