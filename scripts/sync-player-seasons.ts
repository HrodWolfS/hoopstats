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
 *   pnpm tsx scripts/sync-player-seasons.ts --reset         (lève le garde-fou)
 *   pnpm tsx scripts/sync-player-seasons.ts --prune-orphans (supprime les passages fantômes)
 *
 * Seuls les matchs de saison régulière sont comptés : présaison, play-in,
 * playoffs et finale de la NBA Cup sont exclus, comme dans les chiffres NBA.
 *
 * --reset autorise un total de matchs en baisse. À réserver à une correction
 * volontaire du périmètre (ex. : exclusion des phases hors saison régulière),
 * jamais à la synchronisation quotidienne.
 *
 * --prune-orphans supprime les passages qu'aucun match de saison régulière ne
 * justifie (équipe fantôme héritée de NBA Stats ou d'un match de présaison
 * classé à tort). Sans cela, la ligne TOT les additionne. Les métriques
 * avancées d'un passage supprimé sont reportées sur le passage réel lorsqu'il
 * est unique et qu'il n'en porte pas : elles décrivent alors la même saison.
 */

import { PrismaClient } from "@prisma/client";
import { currentSeason } from "../lib/nba";
import { REGULAR_SEASON_PHASE } from "../lib/season-phase";
import {
  deriveSeasonFromBoxScores,
  type BoxScoreLine,
} from "../lib/stats/season-aggregation";

const prisma = new PrismaClient({ log: ["error"] });

/** Lignes écrites par transaction : compromis entre allers-retours et mémoire. */
const WRITE_BATCH_SIZE = 100;

export type SyncOutcome = {
  written: number;
  /** Lignes ignorées parce que le total de matchs reculerait. */
  skipped: { label: string; derived: number; stored: number }[];
  /** Abréviations d'équipe sans correspondance en base. */
  unknownTeams: string[];
  /** Passages stockés qu'aucun match de saison régulière ne justifie. */
  orphans: { label: string; gamesPlayed: number }[];
  /** Passages fantômes supprimés (--prune-orphans). */
  pruned: number;
  /** Passages dont les métriques avancées ont reçu celles d'un fantôme. */
  advancedMoved: number;
};

const ADVANCED_KEYS = [
  "per",
  "usageRate",
  "offRating",
  "defRating",
  "netRating",
  "bpm",
  "vorp",
  "winShares",
] as const;

type AdvancedMetrics = Record<(typeof ADVANCED_KEYS)[number], number | null>;

function hasAdvanced(row: AdvancedMetrics): boolean {
  return ADVANCED_KEYS.some((key) => row[key] !== null);
}

/**
 * Au-delà de cette part de passages fantômes, la purge est refusée : c'est le
 * signe d'une saison sans box scores ou d'une liaison joueur cassée, pas de
 * quelques lignes héritées.
 */
const MAX_ORPHAN_SHARE = 0.1;

function seasonArg(argv: readonly string[]): string {
  const index = argv.indexOf("--season");
  return index >= 0 && argv[index + 1] ? argv[index + 1] : currentSeason();
}

export async function syncPlayerSeasons(
  season: string,
  {
    dryRun = false,
    allowDecrease = false,
    pruneOrphans = false,
  }: { dryRun?: boolean; allowDecrease?: boolean; pruneOrphans?: boolean } = {},
): Promise<SyncOutcome> {
  const [lines, teams] = await Promise.all([
    prisma.playerBoxScore.findMany({
      where: {
        didNotPlay: false,
        playerId: { not: null },
        game: { season, status: "final", phase: REGULAR_SEASON_PHASE },
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

  // Un passage est fantôme lorsque aucun match de saison régulière ne le
  // justifie, même si le joueur en a joué ailleurs : ces lignes viennent de
  // NBA Stats (saison entière rattachée à la nouvelle équipe) ou de matchs de
  // présaison 2026-27 classés en 2025-26 avant la séparation des phases.
  const stored = await prisma.playerSeason.findMany({
    where: { season },
    select: {
      id: true,
      playerId: true,
      gamesPlayed: true,
      per: true,
      usageRate: true,
      offRating: true,
      defRating: true,
      netRating: true,
      bpm: true,
      vorp: true,
      winShares: true,
      team: { select: { abbr: true } },
      player: { select: { firstName: true, lastName: true } },
    },
  });
  const isOrphan = (row: (typeof stored)[number]) =>
    !stints.has(`${row.playerId}|${row.team.abbr}`);
  const orphanRows = stored.filter(isOrphan);
  const realRows = stored.filter((row) => !isOrphan(row));

  // Le garde-fou raisonne par joueur, pas par équipe. NBA Stats produisait une
  // seule ligne pleine saison rattachée à la dernière équipe, quand les box
  // scores décrivent chaque passage : comparer les deux équipe par équipe
  // ferait passer un transfert pour une régression. Les fantômes en sont
  // exclus : ils gonfleraient le total stocké et figeraient le joueur.
  const storedGames = new Map<string, number>();
  for (const row of realRows) {
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
    orphans: orphanRows.map((row) => ({
      label: `${row.player.firstName} ${row.player.lastName} (${row.team.abbr})`,
      gamesPlayed: row.gamesPlayed,
    })),
    pruned: 0,
    advancedMoved: 0,
  };
  const unknownTeams = new Set<string>();
  const pending: (
    | ReturnType<typeof prisma.playerSeason.upsert>
    | ReturnType<typeof prisma.playerSeason.update>
    | ReturnType<typeof prisma.playerSeason.delete>
  )[] = [];

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
    if (!allowDecrease && previous !== undefined && derivedTotal < previous) {
      outcome.skipped.push({
        label: stint.label,
        derived: derivedTotal,
        stored: previous,
      });
      continue;
    }

    // Réécrit même à nombre de matchs égal : une correction de box score sur
    // un match déjà compté doit se répercuter sur les moyennes.
    pending.push(
      prisma.playerSeason.upsert({
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
      }),
    );
    outcome.written += 1;
  }

  if (pruneOrphans && orphanRows.length > 0) {
    if (orphanRows.length > stored.length * MAX_ORPHAN_SHARE) {
      throw new Error(
        `${orphanRows.length} passages fantômes sur ${stored.length} : purge refusée, vérifier les box scores de ${season}`,
      );
    }

    const realByPlayer = new Map<string, (typeof realRows)[number][]>();
    for (const row of realRows) {
      realByPlayer.set(row.playerId, [
        ...(realByPlayer.get(row.playerId) ?? []),
        row,
      ]);
    }

    for (const orphan of orphanRows) {
      const [onlyReal, ...others] = realByPlayer.get(orphan.playerId) ?? [];
      if (
        hasAdvanced(orphan) &&
        onlyReal &&
        others.length === 0 &&
        !hasAdvanced(onlyReal)
      ) {
        pending.push(
          prisma.playerSeason.update({
            where: { id: onlyReal.id },
            data: Object.fromEntries(
              ADVANCED_KEYS.map((key) => [key, orphan[key]]),
            ),
          }),
        );
        outcome.advancedMoved += 1;
      }
      pending.push(prisma.playerSeason.delete({ where: { id: orphan.id } }));
      outcome.pruned += 1;
    }
  }

  // Un aller-retour par ligne coûtait dix minutes depuis un runner GitHub,
  // sur un job qui en a quinze. Les écritures partent par lots.
  if (!dryRun) {
    for (let index = 0; index < pending.length; index += WRITE_BATCH_SIZE) {
      await prisma.$transaction(pending.slice(index, index + WRITE_BATCH_SIZE));
    }
  }

  outcome.unknownTeams = [...unknownTeams];
  return outcome;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const allowDecrease = process.argv.includes("--reset");
  const pruneOrphans = process.argv.includes("--prune-orphans");
  const season = seasonArg(process.argv);

  console.log(
    `\n📊 Agrégats joueurs ${season}${dryRun ? " — simulation, aucune écriture" : ""}…`,
  );

  const outcome = await syncPlayerSeasons(season, {
    dryRun,
    allowDecrease,
    pruneOrphans,
  });

  console.log(
    `  ✅ ${outcome.written} ligne(s) ${dryRun ? "à écrire" : "écrites"}`,
  );

  if (outcome.skipped.length > 0) {
    console.log(
      `  ⚠️  ${outcome.skipped.length} ligne(s) conservée(s), le total de matchs reculerait :`,
    );
    for (const skip of outcome.skipped.slice(0, 10)) {
      console.log(
        `     ${skip.label} : ${skip.derived} calculé(s) contre ${skip.stored} stocké(s)`,
      );
    }
    if (outcome.skipped.length > 10) {
      console.log(`     … et ${outcome.skipped.length - 10} autre(s)`);
    }
  }
  if (outcome.unknownTeams.length > 0) {
    console.log(`  ⚠️  équipes inconnues : ${outcome.unknownTeams.join(", ")}`);
  }
  if (outcome.pruned > 0) {
    console.log(
      `  🧹 ${outcome.pruned} passage(s) fantôme(s) ${dryRun ? "à supprimer" : "supprimé(s)"}, métriques avancées reportées sur ${outcome.advancedMoved}`,
    );
  } else if (outcome.orphans.length > 0) {
    // Signalés seulement : la purge reste une décision explicite.
    console.log(
      `  ⚠️  ${outcome.orphans.length} passage(s) sans aucun match de saison régulière (--prune-orphans pour les supprimer) :`,
    );
    for (const orphan of outcome.orphans.slice(0, 10)) {
      console.log(
        `     ${orphan.label} : ${orphan.gamesPlayed} match(s) stocké(s)`,
      );
    }
    if (outcome.orphans.length > 10) {
      console.log(`     … et ${outcome.orphans.length - 10} autre(s)`);
    }
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
