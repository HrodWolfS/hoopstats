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

/** Saison courante pour le fetch des données. */
export const CURRENT_SEASON = "2025-26";

/** Saison précédente (pour diff rookies/absents). */
export const PREV_SEASON = "2024-25";

/** Année de draft des rookies de la saison courante. */
export const CURRENT_DRAFT_YEAR = 2025;

/** Toutes les saisons disponibles, du plus récent au plus ancien. */
export const ALL_SEASONS = [
  "2025-26",
  "2024-25",
  "2023-24",
  "2022-23",
  "2021-22",
  "2020-21",
  "2019-20",
  "2018-19",
  "2017-18",
  "2016-17",
  "2015-16",
];
