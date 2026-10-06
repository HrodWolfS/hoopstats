/** Traduit la conférence EN → FR. */
export function confFr(conf: string): string {
  return conf === "East" ? "Est" : "Ouest";
}

/** Traduit la division EN → FR. */
export function divFr(div: string): string {
  const map: Record<string, string> = {
    Atlantic: "Atlantique",
    Central: "Centrale",
    Southeast: "Sud-Est",
    Northwest: "Nord-Ouest",
    Pacific: "Pacifique",
    Southwest: "Sud-Ouest",
  };
  return map[div] ?? div;
}

/**
 * Premier match de saison régulière de chaque saison (heure UTC de début du
 * type « regular » publié par ESPN). C'est la seule donnée à ajouter chaque
 * été : le contrôle de santé quotidien signale toute saison ESPN absente ou
 * dont la date a changé.
 */
export const SEASON_OPENERS: Record<string, string> = {
  "2025-26": "2025-10-21T07:00:00Z",
  "2026-27": "2026-10-20T07:00:00Z",
};

/**
 * Avance de la bascule sur le premier match. La synchro quotidienne tourne à
 * 05:00 UTC : basculer avant elle lui fait créer les classements de la
 * nouvelle saison et revalider tout le site le matin même de la reprise.
 */
const ROLLOVER_LEAD_MS = 3 * 60 * 60 * 1000;

/** Saisons du calendrier, la plus récente en premier. */
const KNOWN_SEASONS = Object.keys(SEASON_OPENERS).sort().reverse();

/**
 * Date servant au calcul de la saison. `HOOPSTATS_NOW` simule une date (test
 * de la bascule en local) ; en production la variable n'existe pas.
 */
function referenceDate(): Date {
  const simulated = process.env.HOOPSTATS_NOW;
  return simulated ? new Date(simulated) : new Date();
}

/**
 * Saison affichée par défaut : la dernière dont la saison régulière a
 * commencé. Pendant l'intersaison, c'est donc la saison qui vient de finir.
 * Calculée à chaque appel : une instance serveur restée chaude depuis la
 * veille bascule quand même à l'heure.
 */
export function currentSeason(now: Date = referenceDate()): string {
  const started = KNOWN_SEASONS.find(
    (season) => Date.parse(SEASON_OPENERS[season]) - ROLLOVER_LEAD_MS <= now.getTime(),
  );
  return started ?? KNOWN_SEASONS[KNOWN_SEASONS.length - 1];
}

/** Saison qui précède : « 2026-27 » → « 2025-26 ». */
export function previousSeason(season: string): string {
  const start = Number.parseInt(season.split("-")[0], 10) - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

/** Année de draft des rookies d'une saison : « 2026-27 » → 2026. */
export function draftYearOf(season: string): number {
  return Number.parseInt(season.split("-")[0], 10);
}

/** Année de fin au format ESPN : « 2026-27 » → 2027. */
export function espnSeasonYear(season: string): number {
  return draftYearOf(season) + 1;
}

/**
 * Saison la plus récente du calendrier. Pendant l'intersaison elle n'a pas
 * encore commencé : c'est elle que montre la page draft.
 */
export const UPCOMING_SEASON = KNOWN_SEASONS[0];

const UPCOMING_END_YEAR = espnSeasonYear(UPCOMING_SEASON);

function seasonsDownTo(lastEndYear: number): string[] {
  const seasons: string[] = [];
  for (let end = UPCOMING_END_YEAR; end >= lastEndYear; end--) {
    seasons.push(`${end - 1}-${String(end).slice(-2)}`);
  }
  return seasons;
}

/** Saisons récentes (stats joueurs disponibles) — utilisé dans les selectors playoffs/global. */
export const ALL_SEASONS = seasonsDownTo(2016);

/** Toutes les saisons historiques disponibles (TeamSeason backfill 1980-81+). */
export const ALL_HISTORY_SEASONS = seasonsDownTo(1981);
