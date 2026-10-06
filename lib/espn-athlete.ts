/**
 * Fiche joueur tirée du profil athlète ESPN.
 *
 * Sert à créer la fiche d'un joueur qui apparaît pour la première fois dans
 * un box score : rookie, joueur venu d'Europe ou contrat de 10 jours. Sans
 * fiche, ses lignes restent orphelines et disparaissent des moyennes, des
 * classements et de la page Rookies.
 *
 * Les champs suivent les formats déjà en base : taille « 6-9 », poids « 200 »,
 * poste abrégé. La photo ESPN n'est pas reprise : les photos viennent de
 * Wikimedia Commons ou du CDN NBA (voir /sources).
 */

export type EspnAthleteProfile = {
  espnId: string;
  firstName: string;
  lastName: string;
  height: string | null;
  weight: string | null;
  position: string | null;
  college: string | null;
  draftYear: number | null;
  draftPick: number | null;
};

type EspnAthleteResponse = {
  athlete?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    displayHeight?: string;
    displayWeight?: string;
    position?: { abbreviation?: string };
    college?: { name?: string };
    displayDraft?: string;
  };
};

/** « 6' 9" » → « 6-9 ». */
export function parseEspnHeight(value: string | undefined): string | null {
  const match = value?.match(/^(\d+)'\s*(\d+)"?$/);
  return match ? `${match[1]}-${match[2]}` : null;
}

/** « 217 lbs » → « 217 ». */
export function parseEspnWeight(value: string | undefined): string | null {
  const match = value?.match(/^(\d+)\s*lbs?$/);
  return match ? match[1] : null;
}

/** « 2026: Rd 2, Pk 46 (ORL) » → année 2026, 46e choix. */
export function parseEspnDraft(value: string | undefined): {
  draftYear: number | null;
  draftPick: number | null;
} {
  const match = value?.match(/^(\d{4}):\s*Rd\s*\d+,\s*Pk\s*(\d+)/);
  return match
    ? { draftYear: Number(match[1]), draftPick: Number(match[2]) }
    : { draftYear: null, draftPick: null };
}

export async function fetchEspnAthlete(
  espnId: string,
): Promise<EspnAthleteProfile | null> {
  try {
    const res = await fetch(
      `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${encodeURIComponent(espnId)}`,
    );
    if (!res.ok) return null;
    const { athlete } = (await res.json()) as EspnAthleteResponse;
    if (!athlete?.lastName) return null;

    return {
      espnId,
      firstName: athlete.firstName ?? "",
      lastName: athlete.lastName,
      height: parseEspnHeight(athlete.displayHeight),
      weight: parseEspnWeight(athlete.displayWeight),
      position: athlete.position?.abbreviation ?? null,
      college: athlete.college?.name ?? null,
      ...parseEspnDraft(athlete.displayDraft),
    };
  } catch {
    return null;
  }
}

/** Auto-contrôles exécutés par `pnpm health:data`. */
export function validateEspnAthleteParsing(): string[] {
  const errors: string[] = [];
  if (parseEspnHeight(`6' 9"`) !== "6-9") errors.push("taille ESPN mal lue");
  if (parseEspnWeight("217 lbs") !== "217") errors.push("poids ESPN mal lu");
  const drafted = parseEspnDraft("2026: Rd 2, Pk 46 (ORL)");
  if (drafted.draftYear !== 2026 || drafted.draftPick !== 46) {
    errors.push("draft ESPN mal lue");
  }
  if (parseEspnDraft(undefined).draftYear !== null) {
    errors.push("joueur non drafté doté d'une année de draft");
  }
  return errors;
}
