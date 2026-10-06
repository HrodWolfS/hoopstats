/**
 * Matchs de playoffs depuis le scoreboard ESPN.
 *
 * ESPN refuse désormais les plages de dates (`dates=AAAAMMJJ-AAAAMMJJ` →
 * 400 « Failed to get events endpoint ») mais accepte un mois entier
 * (`dates=AAAAMM`). On interroge donc chaque mois de la plage, puis on garde
 * les seuls matchs de playoffs (type de saison 3) compris dans la plage : le
 * paramètre `seasontype` est ignoré et avril mêle saison régulière, play-in
 * et playoffs.
 */

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

const PLAYOFFS_SEASON_TYPE = 3;

/** Un mois compte rarement plus de 250 matchs ; la limite les couvre tous. */
const MONTH_LIMIT = 400;

type ScoreboardEvent = {
  id: string;
  date: string;
  season?: { type?: number };
};

export type PlayoffEventsResult<T> =
  | { ok: true; events: T[] }
  | { ok: false; status: number };

/** Mois (AAAAMM) couverts par une plage AAAAMMJJ incluse. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(4, 6));
  const last = Number(to.slice(0, 4)) * 12 + Number(to.slice(4, 6));
  while (year * 12 + month <= last) {
    months.push(`${year}${String(month).padStart(2, "0")}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return months;
}

/** « 2026-04-19T23:00Z » → « 20260419 » (date UTC, comme la plage ESPN). */
function ymd(isoDate: string): string {
  return isoDate.slice(0, 10).replaceAll("-", "");
}

/**
 * Matchs de playoffs entre deux dates AAAAMMJJ incluses. Échoue entièrement
 * si un seul mois ne répond pas : une série à moitié chargée serait fausse.
 */
export async function fetchPlayoffEvents<T extends ScoreboardEvent>(
  from: string,
  to: string,
): Promise<PlayoffEventsResult<T>> {
  const byId = new Map<string, T>();
  for (const month of monthsBetween(from, to)) {
    const res = await fetch(
      `${SCOREBOARD_URL}?dates=${month}&limit=${MONTH_LIMIT}`,
    );
    if (!res.ok) return { ok: false, status: res.status };
    const { events = [] } = (await res.json()) as { events?: T[] };
    for (const event of events) {
      const day = ymd(event.date);
      if (
        event.season?.type === PLAYOFFS_SEASON_TYPE &&
        day >= from &&
        day <= to
      ) {
        byId.set(event.id, event);
      }
    }
  }
  return {
    ok: true,
    events: [...byId.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** Auto-contrôles exécutés par `pnpm health:data`. */
export function validateScoreboardMonths(): string[] {
  const errors: string[] = [];
  if (monthsBetween("20260419", "20260630").join() !== "202604,202605,202606") {
    errors.push("plage avril–juin mal découpée en mois");
  }
  if (monthsBetween("20201201", "20210115").join() !== "202012,202101") {
    errors.push("passage d'année mal découpé");
  }
  if (monthsBetween("20260419", "20260419").join() !== "202604") {
    errors.push("plage d'un jour mal découpée");
  }
  return errors;
}
