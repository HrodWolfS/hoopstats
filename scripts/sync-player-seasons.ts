/**
 * Recalcule les agrégats `PlayerSeason` à partir des box scores.
 *
 * Décision 001 : les box scores ESPN, déjà synchronisés chaque jour, sont la
 * source des statistiques de comptage et des pourcentages de tir. Sans cette
 * étape, les moyennes affichées ignorent les matchs récents — 523 joueurs sur
 * 568 étaient concernés avant sa mise en place.
 *
 * Les métriques avancées (PER, USG%, ORtg, DRtg, NRtg) ne sont pas dérivables
 * d'un box score : elles sont conservées telles quelles, jamais écrasées.
 *
 * Run :
 *   pnpm tsx scripts/sync-player-seasons.ts                 (saison courante)
 *   pnpm tsx scripts/sync-player-seasons.ts --dry-run       (simulation)
 *   pnpm tsx scripts/sync-player-seasons.ts --season 2024-25
 */

import { PrismaClient } from "@prisma/client";
import { CURRENT_SEASON } from "../lib/nba";
import {
  deriveSeasonFromBoxScores,
  type BoxScoreLine,
} from "../lib/stats/season-aggregation";

const prisma = new PrismaClient({ log: ["error"] });

export type SyncOutcome = {
  written: number;
  /** Lignes ignorées parce que le total de matchs reculerait. */
  skipped: { label: string; derived: number; stored: number }[];
  /** Abréviations d'équipe sans correspondance en base. */
  unknownTeams: string[];
};

function seasonArg(argv: readonly string[]): string {
  const index = argv.indexOf("--season");
  return index >= 0 && argv[index + 1] ? argv[index + 1] : CURRENT_SEASON;
}

export async function syncPlayerSeasons(
  season: string,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<SyncOutcome> {
  const [lines, teams] = await Promise.all([
    prisma.playerBoxScore.findMany({
      where: {
        didNotPlay: false,
        playerId: { not: null },
        game: { season, status: "final" },
      },
      select: {
        playerId: true,
        teamAbbr: true,
        minutes: true,
        pts: true,
        reb: true,
        ast: true,
        stl: true,
        blk: true,
        fgm: true,
        fga: true,
        threePm: true,
        threePa: true,
        ftm: true,
        fta: true,
        player: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.team.findMany({ select: { id: true, abbr: true } }),
  ]);

  const teamIdByAbbr = new Map(teams.map((team) => [team.abbr, team.id]));

  // Une ligne par joueur et par équipe : un joueur transféré en produit deux,
  // ce que le modèle attend déjà (clé unique playerId + saison + équipe).
  const stints = new Map<
    string,
    { playerId: string; teamAbbr: string; label: string; lines: BoxScoreLine[] }
  >();

  for (const line of lines) {
    const key = `${line.playerId}|${line.teamAbbr}`;
    const stint = stints.get(key) ?? {
      playerId: line.playerId!,
      teamAbbr: line.teamAbbr,
      label: `${line.player?.firstName ?? "?"} ${line.player?.lastName ?? ""} (${line.teamAbbr})`,
      lines: [],
    };
    stint.lines.push(line);
    stints.set(key, stint);
  }

  // Le garde-fou raisonne par joueur, pas par équipe. NBA Stats produisait une
  // seule ligne pleine saison rattachée à la dernière équipe, quand les box
  // scores décrivent chaque passage : comparer les deux équipe par équipe
  // ferait passer un transfert pour une régression.
  const stored = await prisma.playerSeason.findMany({
    where: { season },
    select: { playerId: true, gamesPlayed: true },
  });
  const storedGames = new Map<string, number>();
  for (const row of stored) {
    storedGames.set(
      row.playerId,
      (storedGames.get(row.playerId) ?? 0) + row.gamesPlayed,
    );
  }

  const derivedGames = new Map<string, number>();
  for (const stint of stints.values()) {
    derivedGames.set(
      stint.playerId,
      (derivedGames.get(stint.playerId) ?? 0) + stint.lines.length,
    );
  }

  const outcome: SyncOutcome = {
    written: 0,
    skipped: [],
    unknownTeams: [],
  };
  const unknownTeams = new Set<string>();

  for (const stint of stints.values()) {
    const teamId = teamIdByAbbr.get(stint.teamAbbr);
    if (!teamId) {
      unknownTeams.add(stint.teamAbbr);
      continue;
    }

    const derived = deriveSeasonFromBoxScores(stint.lines);
    if (!derived) continue;

    // Les box scores s'accumulent : un total de matchs qui recule trahit une
    // liaison joueur défaillante, pas une donnée plus fraîche. On préfère
    // conserver l'ancienne valeur plutôt que d'en écrire une plus fausse.
    const previous = storedGames.get(stint.playerId);
    const derivedTotal = derivedGames.get(stint.playerId) ?? 0;
    if (previous !== undefined && derivedTotal < previous) {
      outcome.skipped.push({
        label: stint.label,
        derived: derivedTotal,
        stored: previous,
      });
      continue;
    }

    // Réécrit même à nombre de matchs égal : une correction de box score sur
    // un match déjà compté doit se répercuter sur les moyennes.
    if (!dryRun) {
      await prisma.playerSeason.upsert({
        where: {
          playerId_season_teamId: {
            playerId: stint.playerId,
            season,
            teamId,
          },
        },
        // Métriques avancées absentes de l'update : elles restent intactes.
        update: derived,
        create: { playerId: stint.playerId, season, teamId, ...derived },
      });
    }
    outcome.written += 1;
  }

  outcome.unknownTeams = [...unknownTeams];
  return outcome;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const season = seasonArg(process.argv);

  console.log(
    `\n📊 Agrégats joueurs ${season}${dryRun ? " — simulation, aucune écriture" : ""}…`,
  );

  const outcome = await syncPlayerSeasons(season, { dryRun });

  console.log(`  ✅ ${outcome.written} ligne(s) ${dryRun ? "à écrire" : "écrites"}`);

  if (outcome.skipped.length > 0) {
    console.log(
      `  ⚠️  ${outcome.skipped.length} ligne(s) conservée(s), le total de matchs reculerait :`,
    );
    for (const skip of outcome.skipped.slice(0, 10)) {
      console.log(`     ${skip.label} : ${skip.derived} calculé(s) contre ${skip.stored} stocké(s)`);
    }
    if (outcome.skipped.length > 10) {
      console.log(`     … et ${outcome.skipped.length - 10} autre(s)`);
    }
  }
  if (outcome.unknownTeams.length > 0) {
    console.log(`  ⚠️  équipes inconnues : ${outcome.unknownTeams.join(", ")}`);
  }
}

if (process.argv[1]?.includes("sync-player-seasons")) {
  main()
    .catch((error) => {
      console.error("Échec :", error instanceof Error ? error.message : error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
