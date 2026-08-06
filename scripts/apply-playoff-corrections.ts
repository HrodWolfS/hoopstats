/**
 * Applique `PLAYOFF_SERIES_CORRECTIONS` aux séries de playoffs en base.
 *
 * Idempotent : relancer le script ne change rien si les corrections sont déjà
 * posées. `scripts/import-playoff-history.ts` l'appelle en fin d'import pour
 * que réimporter l'archive ESPN ne réintroduise pas ses trous.
 *
 * Run: pnpm fix:playoff-history
 *      pnpm fix:playoff-history --dry-run   (affiche sans écrire)
 */

import { PrismaClient } from "@prisma/client";
import {
  PLAYOFF_SERIES_CORRECTIONS,
  findPlayoffSeriesCorrection,
  validatePlayoffCorrections,
} from "../lib/playoff-corrections";

export type CorrectionOutcome = {
  updated: string[];
  alreadyCorrect: string[];
  /** Corrections sans série correspondante en base : rien n'a été écrit. */
  unmatched: string[];
};

/** Texte affiché sur la carte de série, au format des résumés ESPN. */
function seriesSummary(
  winnerAbbr: string,
  winnerWins: number,
  loserWins: number,
): string {
  return `${winnerAbbr} wins series ${winnerWins}-${loserWins}`;
}

export async function applyPlayoffCorrections(
  prisma: PrismaClient,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<CorrectionOutcome> {
  const seasons = [...new Set(PLAYOFF_SERIES_CORRECTIONS.map((c) => c.season))];

  const rows = await prisma.playoffSeries.findMany({
    where: { season: { in: seasons } },
    include: {
      team1: { select: { abbr: true } },
      team2: { select: { abbr: true } },
    },
  });

  const outcome: CorrectionOutcome = {
    updated: [],
    alreadyCorrect: [],
    unmatched: [],
  };
  const matched = new Set<string>();

  for (const row of rows) {
    const correction = findPlayoffSeriesCorrection(
      row.season,
      row.team1.abbr,
      row.team2.abbr,
    );
    if (!correction) continue;

    matched.add(`${correction.season}|${correction.winnerAbbr}-${correction.loserAbbr}`);

    // `team1` est la tête de série, pas la gagnante : on ne réordonne pas les
    // équipes, on pose les victoires du côté de celle qui a gagné.
    const team1Won = row.team1.abbr === correction.winnerAbbr;
    const team1Wins = team1Won ? correction.winnerWins : correction.loserWins;
    const team2Wins = team1Won ? correction.loserWins : correction.winnerWins;
    const summary = seriesSummary(
      correction.winnerAbbr,
      correction.winnerWins,
      correction.loserWins,
    );

    const label = `${row.season} R${row.round}→R${correction.round} ${row.team1.abbr} ${row.team1Wins}-${row.team2Wins} ${row.team2.abbr} → ${team1Wins}-${team2Wins}`;

    if (
      row.round === correction.round &&
      row.team1Wins === team1Wins &&
      row.team2Wins === team2Wins &&
      row.completed &&
      row.summary === summary
    ) {
      outcome.alreadyCorrect.push(
        `${row.season} R${row.round} ${row.team1.abbr} ${team1Wins}-${team2Wins} ${row.team2.abbr}`,
      );
      continue;
    }

    if (!dryRun) {
      await prisma.playoffSeries.update({
        where: { id: row.id },
        data: {
          round: correction.round,
          team1Wins,
          team2Wins,
          completed: true,
          summary,
        },
      });
    }
    outcome.updated.push(label);
  }

  for (const c of PLAYOFF_SERIES_CORRECTIONS) {
    if (!matched.has(`${c.season}|${c.winnerAbbr}-${c.loserAbbr}`)) {
      outcome.unmatched.push(
        `${c.season} R${c.round} ${c.winnerAbbr}-${c.loserAbbr}`,
      );
    }
  }

  return outcome;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient({ log: ["error"] });

  const validationErrors = validatePlayoffCorrections();
  if (validationErrors.length > 0) {
    console.error("❌ Table de corrections invalide, rien n'a été écrit :");
    validationErrors.forEach((e) => console.error("   ", e));
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(
    `🏆 Corrections séries playoffs — ${PLAYOFF_SERIES_CORRECTIONS.length} série(s)${dryRun ? " (dry-run)" : ""}\n`,
  );

  try {
    const outcome = await applyPlayoffCorrections(prisma, { dryRun });

    for (const line of outcome.updated) {
      console.log(`   ${dryRun ? "à corriger" : "corrigée"} : ${line}`);
    }

    console.log(
      `\n✅ ${outcome.updated.length} série(s) ${dryRun ? "à corriger" : "corrigée(s)"}, ${outcome.alreadyCorrect.length} déjà conforme(s)`,
    );

    if (outcome.unmatched.length > 0) {
      console.warn(
        `⚠️  ${outcome.unmatched.length} correction(s) sans série en base : ${outcome.unmatched.join(", ")}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("❌ Erreur fatale:", e);
    process.exit(1);
  });
}
