import { getPlayerMetric, type PlayerMetricKey } from "@/lib/stats/metrics";

/**
 * Définitions des en-têtes de colonnes des tableaux joueur. Les métriques
 * avancées reprennent le catalogue (lib/stats/metrics.ts) ; les colonnes de
 * comptage sont formulées sans « par match », puisqu'elles servent aussi aux
 * totaux et au journal des matchs.
 */
export type ColumnDefinition = {
  code: string;
  label: string;
  description: string;
  formula?: string;
};

function fromMetric(key: PlayerMetricKey): ColumnDefinition {
  const metric = getPlayerMetric(key);
  return {
    code: metric.shortLabel,
    label: metric.label,
    description: metric.description,
    formula: metric.formula,
  };
}

const DEFINITIONS: ColumnDefinition[] = [
  { code: "MJ", label: "Matchs joués", description: "Matchs de saison régulière où le joueur est entré en jeu." },
  {
    code: "TIT",
    label: "Titularisations",
    description: "Matchs commencés dans le cinq de départ. Connu seulement pour les saisons couvertes par les box scores.",
  },
  { code: "MIN", label: "Minutes", description: "Temps de jeu, secondes comprises quand le box score les donne." },
  { code: "PTS", label: "Points", description: "Points marqués." },
  { code: "REB", label: "Rebonds", description: "Rebonds offensifs et défensifs." },
  { code: "PAS", label: "Passes décisives", description: "Passes menant directement à un panier." },
  { code: "INT", label: "Interceptions", description: "Ballons volés à l'adversaire." },
  { code: "CTR", label: "Contres", description: "Tirs adverses contrés." },
  { code: "BP", label: "Balles perdues", description: "Possessions perdues sans tirer (mauvaise passe, marcher, passage en force…)." },
  {
    code: "FG%",
    label: "Réussite aux tirs",
    description: "Tirs réussis sur tirs tentés, lancers francs exclus. Dessous : réussis/tentés.",
    formula: "FGM / FGA",
  },
  {
    code: "3P%",
    label: "Réussite à trois points",
    description: "Tirs à trois points réussis sur tentés. Dessous : réussis/tentés.",
    formula: "3PM / 3PA",
  },
  {
    code: "LF%",
    label: "Réussite aux lancers francs",
    description: "Lancers francs réussis sur tentés. Dessous : réussis/tentés.",
    formula: "FTM / FTA",
  },
  { code: "TIRS", label: "Tirs", description: "Tirs réussis/tentés, lancers francs exclus." },
  { code: "3PTS", label: "Tirs à trois points", description: "Tirs à trois points réussis/tentés." },
  { code: "LF", label: "Lancers francs", description: "Lancers francs réussis/tentés." },
  {
    code: "+/-",
    label: "Plus-minus",
    description: "Écart de points de l'équipe pendant que le joueur était sur le terrain.",
  },
  fromMetric("trueShooting"),
  fromMetric("usageRate"),
  fromMetric("per"),
  fromMetric("offRating"),
  fromMetric("defRating"),
  fromMetric("netRating"),
];

const BY_CODE = new Map(DEFINITIONS.map((definition) => [definition.code, definition]));

export function columnDefinition(code: string): ColumnDefinition | null {
  return BY_CODE.get(code) ?? null;
}
