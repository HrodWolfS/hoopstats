/**
 * Répétition de la bascule de saison (feuille de route § 0.4), en lecture
 * seule : à lancer dans les jours qui précèdent la reprise, puis le soir même.
 *
 * Le script vérifie, pour la prochaine saison du calendrier :
 *  - l'heure de bascule de `currentSeason()` et sa concordance avec ESPN ;
 *  - que les classements ESPN de la nouvelle saison répondent, à 0-0 ;
 *  - l'état de la base : classements, calendrier, joueurs des matchs de
 *    présaison encore sans fiche (rookies, nouveaux venus).
 *
 * Il n'écrit rien. Les fiches manquantes sont créées par la synchro des box
 * scores au premier match officiel ; ce script dit seulement lesquelles le
 * seront. `--strict` renvoie un code non nul en cas d'échec.
 */

import { PrismaClient } from "@prisma/client";
import {
  ROLLOVER_LEAD_MS,
  SEASON_OPENERS,
  UPCOMING_SEASON,
  currentSeason,
  draftYearOf,
  espnSeasonYear,
  previousSeason,
} from "../lib/nba";
import { fetchEspnAthlete } from "../lib/espn-athlete";

const prisma = new PrismaClient({ log: ["error"] });

const MINUTE_MS = 60 * 1000;
const NBA_TEAMS = 30;
/** Profils ESPN interrogés au plus, pour rester raisonnable. */
const MAX_PROFILES = 40;

type Status = "pass" | "warn" | "fail";
type Result = { name: string; status: Status; message: string };

const results: Result[] = [];
function report(name: string, status: Status, message: string) {
  results.push({ name, status, message });
}

const season = UPCOMING_SEASON;
const previous = previousSeason(season);
const opener = new Date(SEASON_OPENERS[season]);
const rollover = new Date(opener.getTime() - ROLLOVER_LEAD_MS);

const parisTime = (date: Date) =>
  date.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "full",
    timeStyle: "short",
  });

function checkRolloverClock() {
  const before = currentSeason(new Date(rollover.getTime() - MINUTE_MS));
  const at = currentSeason(rollover);
  const dayAfter = currentSeason(new Date(opener.getTime() + 24 * 3600 * 1000));
  const ok = before === previous && at === season && dayAfter === season;
  report(
    "Horloge de bascule",
    ok ? "pass" : "fail",
    ok
      ? `${previous} jusqu'au ${parisTime(rollover)}, ${season} ensuite`
      : `attendu ${previous} → ${season}, obtenu ${before} → ${at} (lendemain : ${dayAfter})`,
  );

  const now = new Date();
  const days = (rollover.getTime() - now.getTime()) / (24 * 3600 * 1000);
  report(
    "Saison affichée aujourd'hui",
    "pass",
    days > 0
      ? `${currentSeason(now)} — bascule dans ${days.toFixed(1)} jour(s)`
      : `${currentSeason(now)} — bascule passée`,
  );
}

async function checkEspnCalendar() {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/common/v3/sports/basketball/nba/season?season=${espnSeasonYear(season)}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      types?: { type?: number; startDate?: string }[];
    };
    const start = data.types?.find((type) => type.type === 2)?.startDate;
    if (!start) throw new Error("date de saison régulière absente");
    const same = Date.parse(start) === opener.getTime();
    report(
      "Date de reprise ESPN",
      same ? "pass" : "fail",
      same
        ? `${start} identique à SEASON_OPENERS`
        : `ESPN annonce ${start}, SEASON_OPENERS dit ${SEASON_OPENERS[season]} : corriger lib/nba.ts`,
    );
  } catch (error) {
    report("Date de reprise ESPN", "warn", `ESPN injoignable (${error})`);
  }
}

async function checkEspnStandings() {
  const url = `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${espnSeasonYear(season)}&seasontype=2`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as {
      children?: {
        standings?: {
          entries?: { stats?: { name: string; value: number }[] }[];
        };
      }[];
    };
    const entries = (data.children ?? []).flatMap(
      (conf) => conf.standings?.entries ?? [],
    );
    const played = entries.filter((entry) =>
      entry.stats?.some(
        (stat) =>
          (stat.name === "wins" || stat.name === "losses") && stat.value > 0,
      ),
    ).length;
    const beforeOpener = Date.now() < opener.getTime();
    const ok = entries.length === NBA_TEAMS && (!beforeOpener || played === 0);
    report(
      "Classements ESPN",
      ok ? "pass" : "fail",
      `${entries.length}/${NBA_TEAMS} équipes, ${played} avec un match au bilan`,
    );
  } catch (error) {
    report("Classements ESPN", "warn", `ESPN injoignable (${error})`);
  }
}

async function checkDatabase() {
  const [teams, teamSeasons, playerSeasons, games] = await Promise.all([
    prisma.team.count(),
    prisma.teamSeason.count({ where: { season } }),
    prisma.playerSeason.count({ where: { season } }),
    prisma.game.groupBy({
      by: ["phase", "status"],
      where: { season },
      _count: true,
    }),
  ]);

  report(
    "Équipes en base",
    teams === NBA_TEAMS ? "pass" : "fail",
    `${teams} équipe(s)`,
  );

  // Avant la reprise, zéro ligne est normal : la synchro du matin les crée.
  const started = Date.now() >= rollover.getTime();
  report(
    `Classements ${season} en base`,
    teamSeasons === NBA_TEAMS || (!started && teamSeasons === 0)
      ? "pass"
      : started
        ? "fail"
        : "warn",
    started
      ? `${teamSeasons}/${NBA_TEAMS} lignes`
      : `${teamSeasons} ligne(s), créées par la synchro du matin de la bascule`,
  );
  report(
    `Stats joueurs ${season} en base`,
    "pass",
    `${playerSeasons} ligne(s) — remplies après les premiers matchs officiels`,
  );

  const byPhase = games
    .map((row) => `${row.phase ?? "non classé"}/${row.status} : ${row._count}`)
    .join(", ");
  const regular = games
    .filter((row) => row.phase === "regular")
    .reduce((total, row) => total + row._count, 0);
  report(
    `Calendrier ${season}`,
    regular > 0 || !started ? "pass" : "warn",
    byPhase || "aucun match en base (la synchro charge J-3 à J+2)",
  );
}

/**
 * Joueurs apparus dans les box scores de la saison sans fiche liée. Ils
 * auront une fiche au premier match officiel ; on vérifie ici qu'ESPN les
 * connaît et, pour les rookies, que l'année de draft suivra.
 */
async function checkUnlinkedPlayers() {
  const lines = await prisma.playerBoxScore.findMany({
    where: { playerId: null, game: { season } },
    select: { playerName: true, espnAthleteId: true, teamAbbr: true },
    distinct: ["playerName"],
    orderBy: { playerName: "asc" },
  });
  if (lines.length === 0) {
    report(
      "Joueurs sans fiche",
      "pass",
      "aucun dans les box scores de la saison",
    );
    return;
  }

  const draftYear = draftYearOf(season);
  const rookies: string[] = [];
  const others: string[] = [];
  const unknown: string[] = [];
  for (const line of lines.slice(0, MAX_PROFILES)) {
    const profile = line.espnAthleteId
      ? await fetchEspnAthlete(line.espnAthleteId)
      : null;
    const label = `${line.playerName} (${line.teamAbbr})`;
    if (!profile) unknown.push(label);
    else if (profile.draftYear === draftYear)
      rookies.push(`${label} #${profile.draftPick}`);
    else others.push(label);
  }

  report(
    "Joueurs sans fiche",
    unknown.length > 0 ? "warn" : "pass",
    `${lines.length} — fiche créée au premier match officiel`,
  );
  if (rookies.length)
    report(`  rookies ${draftYear}`, "pass", rookies.join(", "));
  if (others.length) report("  autres", "pass", others.join(", "));
  if (unknown.length)
    report(
      "  inconnus d'ESPN",
      "warn",
      `${unknown.join(", ")} — vérifier à la main`,
    );
  if (lines.length > MAX_PROFILES)
    report(
      "  non vérifiés",
      "warn",
      `${lines.length - MAX_PROFILES} au-delà de la limite`,
    );

  const knownRookies = await prisma.player.count({ where: { draftYear } });
  report(
    `Rookies ${draftYear} en base`,
    "pass",
    `${knownRookies} fiche(s) — la page Rookies montre ${previous} tant qu'il n'y en a pas`,
  );
}

async function checkLastSync() {
  const last = await prisma.syncLog.findFirst({
    where: { source: "sync-daily" },
    orderBy: { startedAt: "desc" },
  });
  if (!last) {
    report("Dernière synchro", "warn", "aucune trace");
    return;
  }
  const ageHours = (Date.now() - last.completedAt.getTime()) / 3600000;
  report(
    "Dernière synchro",
    last.status === "success" && ageHours < 30 ? "pass" : "warn",
    `${last.status}, il y a ${ageHours.toFixed(0)} h${last.errors ? ` — ${JSON.stringify(last.errors)}` : ""}`,
  );
}

async function main() {
  const strict = process.argv.includes("--strict");
  console.log(`Répétition de bascule ${previous} → ${season}`);
  console.log(`Premier match : ${parisTime(opener)} (heure de Paris)\n`);

  checkRolloverClock();
  await checkEspnCalendar();
  await checkEspnStandings();
  await checkDatabase();
  await checkUnlinkedPlayers();
  await checkLastSync();

  for (const { name, status, message } of results) {
    const icon = status === "pass" ? "✅" : status === "warn" ? "⚠️ " : "❌";
    console.log(`${icon} ${name} : ${message}`);
  }
  const failures = results.filter((result) => result.status === "fail").length;
  const warnings = results.filter((result) => result.status === "warn").length;
  console.log(
    `\nRésultat : ${failures} échec(s), ${warnings} avertissement(s)`,
  );
  if (strict && failures > 0) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(
      `Contrôle impossible : ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
