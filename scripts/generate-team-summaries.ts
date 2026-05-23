/**
 * Sprint 5 — Génération de résumés équipes en français
 *
 * Génère un résumé factuel pour chaque TeamSeason (toutes les saisons).
 * Template-based, aucune API externe requise.
 *
 * Run: pnpm tsx scripts/generate-team-summaries.ts
 */

import { prisma } from "@/lib/prisma";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Interprète le ClinchIndicator de la NBA */
function playoffOutcome(code: string | null): string {
  if (!code) return "n'ont pas de résultat de playoff enregistré";
  const c = code
    .replace(/\s*-\s*/, "")
    .toLowerCase()
    .trim();

  if (c === "w") return "ont remporté le titre NBA";
  if (c === "e")
    return "ont atteint les Finales NBA (champions de la Conférence Est)";
  if (c === "a" || c === "se" || c === "c")
    return "ont remporté leur division (Conférence Est)";
  if (c === "nw" || c === "sw" || c === "p")
    return "ont remporté leur division (Conférence Ouest)";
  if (c === "x") return "se sont qualifiés pour les playoffs";
  if (c === "pi") return "ont participé au play-in";
  if (c === "o") return "n'ont pas accédé aux playoffs";
  return "ont participé à la compétition";
}

function perfLevel(wins: number, losses: number): string {
  const pct = wins / (wins + losses);
  if (pct >= 0.7) return "exceptionnelle";
  if (pct >= 0.6) return "très solide";
  if (pct >= 0.5) return "positive";
  if (pct >= 0.4) return "difficile";
  return "compliquée";
}

function rankLabel(rank: number | null): string {
  if (!rank) return "";
  if (rank === 1) return "en tête de leur conférence (1re place)";
  if (rank <= 3) return `dans le top 3 de leur conférence (${rank}e)`;
  if (rank <= 6) return `en bonne position pour les playoffs (${rank}e)`;
  if (rank <= 10)
    return `dans la moitié du classement de leur conférence (${rank}e)`;
  return `en bas de tableau (${rank}e de leur conférence)`;
}

function buildTeamSummary(ts: {
  season: string;
  wins: number;
  losses: number;
  conferenceRank: number | null;
  playoffResult: string | null;
  offRating: number | null;
  netRating: number | null;
  team: {
    city: string;
    name: string;
    conference: string;
  };
}): string {
  const { city, name, conference } = ts.team;
  const confFr = conference === "East" ? "Est" : "Ouest";
  const perf = perfLevel(ts.wins, ts.losses);
  const rankStr = rankLabel(ts.conferenceRank);
  const outcome = playoffOutcome(ts.playoffResult);

  // Phrase d'intro
  const intro = `Les ${city} ${name} ont réalisé une saison ${ts.season} ${perf} avec un bilan de ${ts.wins}-${ts.losses}${rankStr ? `, terminant ${rankStr}` : ""} en Conférence ${confFr}.`;

  // Résultat playoffs
  const playoffLine = ` À l'issue de la saison régulière, ils ${outcome}.`;

  // Ratings offensifs si disponibles
  let ratingLine = "";
  if (ts.netRating != null) {
    const netSign = ts.netRating >= 0 ? "+" : "";
    ratingLine = ` Avec un net rating de ${netSign}${ts.netRating.toFixed(1)}, l'équipe affiche une ${ts.netRating >= 0 ? "efficacité positive" : "balance négative"} sur l'ensemble de la saison.`;
  } else if (ts.offRating != null) {
    ratingLine = ` Leur offensive rating de ${ts.offRating.toFixed(1)} points pour 100 possessions témoigne de leur niveau offensif.`;
  }

  return `${intro}${playoffLine}${ratingLine}`.trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const teamSeasons = await prisma.teamSeason.findMany({
    where: { summaryFr: null },
    include: {
      team: {
        select: { city: true, name: true, conference: true },
      },
    },
    orderBy: [{ season: "desc" }, { team: { name: "asc" } }],
  });

  console.log(
    `🏀 Génération résumés équipes — ${teamSeasons.length} saisons\n`,
  );

  let done = 0;

  for (const ts of teamSeasons) {
    const summary = buildTeamSummary(ts);

    await prisma.teamSeason.update({
      where: { id: ts.id },
      data: { summaryFr: summary },
    });

    done++;
    if (done % 30 === 0) {
      console.log(`  ${done}/${teamSeasons.length} générés…`);
    }
  }

  console.log(`\n✅ ${done} résumés équipes générés`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
