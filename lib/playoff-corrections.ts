/**
 * Corrections des séries de playoffs historiques.
 *
 * `scripts/fetch-playoff-history.py` reconstitue les séries d'avant 2015 à
 * partir de deux sources également faillibles :
 *
 *  1. L'archive ESPN (scoreboard `seasontype=3`) est trouée. Des matchs y
 *     manquent — les deux derniers de Milwaukee–Charlotte 2001, le quatrième
 *     de Lakers–Spurs 2001, quatre des cinq finales 2001 — et l'import,
 *     qui lit l'état de la série sur le dernier match trouvé, fige alors le
 *     décompte au milieu de la série. ESPN attribue aussi le mauvais
 *     vainqueur à certains matchs anciens (match 5 des finales 1990, match 4
 *     de la finale de conférence Ouest 1987), duplique des rencontres
 *     (Kansas City–Phoenix 1981 finit ainsi à 5-2) et compte les balayages
 *     du premier tour au meilleur des sept (Portland–Phoenix 1999 : 4-0 pour
 *     une série jouée au meilleur des cinq).
 *
 *  2. Avant 2001-02, `SERIES_ID` de nba_api ne porte plus le numéro de tour :
 *     le script le reconstitue en triant les séries par identifiant du
 *     premier match, puis en découpant la liste à 8/12/14/15. Deux séries
 *     dont les premiers matchs s'entrelacent hors de cet ordre échangent
 *     alors de tour — d'où la finale NBA 1986 rangée au premier tour.
 *
 * Ces séries appartiennent au passé : leur issue ne bougera plus. On la fige
 * donc ici, vérifiée une par une sur les pages « NBA playoffs » de Wikipédia,
 * plutôt que de dépendre d'une archive qu'on sait fautive. La table est
 * appliquée par `scripts/apply-playoff-corrections.ts`, rejouée en fin
 * d'import par `scripts/import-playoff-history.ts`, et contrôlée par
 * `pnpm health:data`.
 *
 * Module volontairement sans accès base, comme `lib/playoff-series.ts`.
 */

import { seriesWinsRequired } from "./playoff-series";

export type PlayoffSeriesCorrection = {
  season: string;
  /** 1 = 1er tour · 2 = demi-finale conf. · 3 = finale conf. · 4 = finale NBA */
  round: number;
  /** Abréviations DB (franchise actuelle) : SEA → OKC, NJN → BKN, KC → SAC. */
  winnerAbbr: string;
  loserAbbr: string;
  winnerWins: number;
  loserWins: number;
  /** Ce que la base contenait, et pourquoi la source s'est trompée. */
  defect: string;
};

/**
 * Une paire d'équipes ne se rencontre qu'une fois par postseason : la clé
 * (saison + paire non ordonnée) identifie donc une série sans dépendre du
 * tour, qui est précisément ce que certaines corrections rectifient.
 */
export function playoffSeriesKey(
  season: string,
  abbrA: string,
  abbrB: string,
): string {
  return `${season}|${[abbrA, abbrB].sort().join("-")}`;
}

export const PLAYOFF_SERIES_CORRECTIONS: PlayoffSeriesCorrection[] = [
  // ── Matchs dupliqués par ESPN ──────────────────────────────────────────
  {
    season: "1980-81",
    round: 2,
    winnerAbbr: "SAC",
    loserAbbr: "PHX",
    winnerWins: 4,
    loserWins: 3,
    defect: "5-2 en base : ESPN duplique des matchs de la série",
  },

  // ── Séries figées faute des derniers matchs dans l'archive ESPN ────────
  {
    season: "1983-84",
    round: 2,
    winnerAbbr: "MIL",
    loserAbbr: "BKN",
    winnerWins: 4,
    loserWins: 3,
    defect: "3-3 en base : match 7 absent de l'archive ESPN",
  },
  {
    season: "1983-84",
    round: 2,
    winnerAbbr: "BOS",
    loserAbbr: "NYK",
    winnerWins: 4,
    loserWins: 3,
    defect: "3-3 en base : match 7 absent de l'archive ESPN",
  },
  {
    season: "1985-86",
    round: 1,
    winnerAbbr: "DEN",
    loserAbbr: "POR",
    winnerWins: 3,
    loserWins: 1,
    defect: "0-0 en base : série entièrement absente de l'archive ESPN",
  },
  {
    season: "2000-01",
    round: 2,
    winnerAbbr: "MIL",
    loserAbbr: "CHA",
    winnerWins: 4,
    loserWins: 3,
    defect:
      "CHA 3-2 en base : matchs 6 et 7 absents, le perdant était donné vainqueur",
  },
  {
    season: "2000-01",
    round: 3,
    winnerAbbr: "PHI",
    loserAbbr: "MIL",
    winnerWins: 4,
    loserWins: 3,
    defect: "2-2 en base : matchs 5 à 7 absents de l'archive ESPN",
  },
  {
    season: "2000-01",
    round: 3,
    winnerAbbr: "LAL",
    loserAbbr: "SAS",
    winnerWins: 4,
    loserWins: 0,
    defect: "3-0 en base : match 4 absent de l'archive ESPN",
  },
  {
    season: "2000-01",
    round: 4,
    winnerAbbr: "LAL",
    loserAbbr: "PHI",
    winnerWins: 4,
    loserWins: 1,
    defect: "1-0 en base : quatre des cinq finales absentes de l'archive ESPN",
  },

  // ── Vainqueur de match mal attribué par ESPN ───────────────────────────
  {
    season: "1986-87",
    round: 3,
    winnerAbbr: "LAL",
    loserAbbr: "OKC",
    winnerWins: 4,
    loserWins: 0,
    defect: "3-1 en base : ESPN inverse le score du match 4",
  },
  {
    season: "1989-90",
    round: 4,
    winnerAbbr: "DET",
    loserAbbr: "POR",
    winnerWins: 4,
    loserWins: 1,
    defect: "3-2 en base : ESPN inverse le score du match 5",
  },

  // ── Balayages du premier tour comptés au meilleur des sept ─────────────
  {
    season: "1998-99",
    round: 1,
    winnerAbbr: "POR",
    loserAbbr: "PHX",
    winnerWins: 3,
    loserWins: 0,
    defect: "4-0 en base : ESPN compte un balayage au meilleur des sept",
  },
  {
    season: "1999-00",
    round: 1,
    winnerAbbr: "NYK",
    loserAbbr: "TOR",
    winnerWins: 3,
    loserWins: 0,
    defect: "4-0 en base : ESPN compte un balayage au meilleur des sept",
  },

  // ── Tours mal reconstitués faute de SERIES_ID exploitable ──────────────
  {
    season: "1984-85",
    round: 2,
    winnerAbbr: "BOS",
    loserAbbr: "DET",
    winnerWins: 4,
    loserWins: 2,
    defect: "rangée au 1er tour",
  },
  {
    season: "1984-85",
    round: 1,
    winnerAbbr: "POR",
    loserAbbr: "DAL",
    winnerWins: 3,
    loserWins: 1,
    defect: "rangée en demi-finale de conférence",
  },
  {
    season: "1985-86",
    round: 1,
    winnerAbbr: "MIL",
    loserAbbr: "BKN",
    winnerWins: 3,
    loserWins: 0,
    defect: "rangée en demi-finale de conférence",
  },
  {
    season: "1985-86",
    round: 1,
    winnerAbbr: "PHI",
    loserAbbr: "WAS",
    winnerWins: 3,
    loserWins: 2,
    defect: "rangée en demi-finale de conférence",
  },
  {
    season: "1985-86",
    round: 1,
    winnerAbbr: "HOU",
    loserAbbr: "SAC",
    winnerWins: 3,
    loserWins: 0,
    defect: "rangée en demi-finale de conférence",
  },
  {
    season: "1985-86",
    round: 2,
    winnerAbbr: "BOS",
    loserAbbr: "ATL",
    winnerWins: 4,
    loserWins: 1,
    defect: "rangée au 1er tour",
  },
  {
    season: "1985-86",
    round: 2,
    winnerAbbr: "MIL",
    loserAbbr: "PHI",
    winnerWins: 4,
    loserWins: 3,
    defect: "rangée au 1er tour",
  },
  {
    season: "1985-86",
    round: 2,
    winnerAbbr: "LAL",
    loserAbbr: "DAL",
    winnerWins: 4,
    loserWins: 2,
    defect: "rangée au 1er tour",
  },
  {
    season: "1985-86",
    round: 2,
    winnerAbbr: "HOU",
    loserAbbr: "DEN",
    winnerWins: 4,
    loserWins: 2,
    defect: "rangée en finale de conférence",
  },
  {
    season: "1985-86",
    round: 3,
    winnerAbbr: "HOU",
    loserAbbr: "LAL",
    winnerWins: 4,
    loserWins: 1,
    defect: "rangée en finale NBA — le titre 1986 revenait à Houston",
  },
  {
    season: "1985-86",
    round: 4,
    winnerAbbr: "BOS",
    loserAbbr: "HOU",
    winnerWins: 4,
    loserWins: 2,
    defect: "rangée au 1er tour — le titre 1986 échappait à Boston",
  },
];

const CORRECTIONS_BY_KEY = new Map(
  PLAYOFF_SERIES_CORRECTIONS.map((c) => [
    playoffSeriesKey(c.season, c.winnerAbbr, c.loserAbbr),
    c,
  ]),
);

/** Correction applicable à une série, identifiée par sa saison et sa paire. */
export function findPlayoffSeriesCorrection(
  season: string,
  abbrA: string,
  abbrB: string,
): PlayoffSeriesCorrection | null {
  return CORRECTIONS_BY_KEY.get(playoffSeriesKey(season, abbrA, abbrB)) ?? null;
}

/**
 * Auto-contrôles exécutés par `pnpm health:data`.
 *
 * Une correction fautive est pire que la donnée d'origine : elle se présente
 * comme vérifiée. On vérifie donc que chacune décrit une série jouable au
 * format de son époque, et qu'aucune paire n'est corrigée deux fois.
 */
export function validatePlayoffCorrections(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const c of PLAYOFF_SERIES_CORRECTIONS) {
    const label = `${c.season} R${c.round} ${c.winnerAbbr}-${c.loserAbbr}`;

    const key = playoffSeriesKey(c.season, c.winnerAbbr, c.loserAbbr);
    if (seen.has(key)) {
      errors.push(`${label} : paire corrigée deux fois`);
    }
    seen.add(key);

    if (c.winnerAbbr === c.loserAbbr) {
      errors.push(`${label} : une équipe affrontant elle-même`);
    }
    if (c.round < 1 || c.round > 4) {
      errors.push(`${label} : tour hors des quatre tours de playoffs`);
    }

    const required = seriesWinsRequired(c.season, c.round);
    if (c.winnerWins !== required) {
      errors.push(
        `${label} : ${c.winnerWins} victoire(s) pour le vainqueur, ${required} attendue(s) à ce format`,
      );
    }
    if (c.loserWins < 0 || c.loserWins >= required) {
      errors.push(
        `${label} : ${c.loserWins} victoire(s) pour le perdant, impossible à ce format`,
      );
    }
  }

  // Un tour ne peut accueillir plus de séries qu'il n'en compte. La table ne
  // corrige qu'une partie des séries d'une saison, donc on ne contrôle que la
  // borne haute — dépasser signalerait deux séries poussées vers le même tour.
  const maxSeriesPerRound = [8, 4, 2, 1];
  const perSeasonRound = new Map<string, number>();
  for (const c of PLAYOFF_SERIES_CORRECTIONS) {
    if (c.round < 1 || c.round > 4) continue;
    const key = `${c.season}|${c.round}`;
    perSeasonRound.set(key, (perSeasonRound.get(key) ?? 0) + 1);
  }
  for (const [key, count] of perSeasonRound) {
    const [season, round] = key.split("|");
    const max = maxSeriesPerRound[Number(round) - 1];
    if (count > max) {
      errors.push(
        `${season} R${round} : ${count} corrections pour ${max} série(s) à ce tour`,
      );
    }
  }

  return errors;
}
