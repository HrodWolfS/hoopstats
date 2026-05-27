/**
 * Moteur d'insights — auto-découverte de patterns équipe.
 *
 * Pour chaque équipe sur une saison donnée, exécute plusieurs analyses
 * corrélatives et fait remonter les patterns les plus statistiquement
 * significatifs (delta de win% × taille d'échantillon).
 *
 * Nécessite GameBoxScore peuplé (sync-box-scores.ts).
 */

import { prisma } from "@/lib/prisma";

// ── Types ─────────────────────────────────────────────────────────────────────

export type InsightKind =
  | "winning_formula"
  | "achilles_heel"
  | "q3_momentum"
  | "fourth_quarter"
  | "shooting_dependency"
  | "game_profile"
  | "pace_fit";

export type Insight = {
  kind: InsightKind;
  emoji: string;
  title: string;
  finding: string;
  /** Force du signal — utilisé pour trier et n'afficher que les plus pertinents. */
  strength: number; // 0-1
  sampleSize: number;
};

type GameData = {
  won: boolean;
  pointsScored: number;
  pointsAllowed: number;
  // Stats équipe pour ce match
  reb: number | null;
  oreb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  fgm: number | null;
  fga: number | null;
  threePm: number | null;
  threePa: number | null;
  ftm: number | null;
  fta: number | null;
  // Linescores équipe + adversaire
  teamLines: number[] | null;
  oppLines: number[] | null;
};

// ── Helpers numériques ────────────────────────────────────────────────────────

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)];
}

function quartile(arr: number[], q: number): number {
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return s[base + 1] !== undefined
    ? s[base] + rest * (s[base + 1] - s[base])
    : s[base];
}

function avg(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / Math.max(arr.length, 1);
}

function pct(v: number): number {
  return Math.round(v * 100);
}

// ── Fetch & shape data ────────────────────────────────────────────────────────

async function loadGameData(
  teamId: string,
  season: string,
): Promise<GameData[]> {
  const games = await prisma.game.findMany({
    where: {
      season,
      status: "final",
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: {
      id: true,
      homeTeamId: true,
      homeScore: true,
      awayScore: true,
      boxScore: true,
    },
  });

  const rows: GameData[] = [];
  for (const g of games) {
    if (!g.boxScore || g.homeScore == null || g.awayScore == null) continue;
    const isHome = g.homeTeamId === teamId;
    const won = isHome ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
    const pointsScored = isHome ? g.homeScore : g.awayScore;
    const pointsAllowed = isHome ? g.awayScore : g.homeScore;

    const bs = g.boxScore;
    const pick = (key: string): number | null =>
      (bs as unknown as Record<string, number | null>)[
        `${isHome ? "home" : "away"}${key}`
      ] ?? null;

    const teamLines = Array.isArray(bs.awayLinescores)
      ? isHome
        ? bs.homeLinescores
        : bs.awayLinescores
      : null;
    const oppLines = Array.isArray(bs.awayLinescores)
      ? isHome
        ? bs.awayLinescores
        : bs.homeLinescores
      : null;

    rows.push({
      won,
      pointsScored,
      pointsAllowed,
      reb: pick("Reb"),
      oreb: pick("Oreb"),
      ast: pick("Ast"),
      stl: pick("Stl"),
      blk: pick("Blk"),
      tov: pick("Tov"),
      fgm: pick("Fgm"),
      fga: pick("Fga"),
      threePm: pick("ThreePm"),
      threePa: pick("ThreePa"),
      ftm: pick("Ftm"),
      fta: pick("Fta"),
      teamLines: Array.isArray(teamLines) ? (teamLines as number[]) : null,
      oppLines: Array.isArray(oppLines) ? (oppLines as number[]) : null,
    });
  }
  return rows;
}

// ── Analyses ──────────────────────────────────────────────────────────────────

type StatDef = {
  key: keyof GameData;
  label: string;
  unit?: string;
  /** Si true, *moins* est mieux (ex: turnovers). */
  inverse?: boolean;
};

const ANALYZED_STATS: StatDef[] = [
  { key: "ast", label: "passes décisives" },
  { key: "reb", label: "rebonds" },
  { key: "oreb", label: "rebonds offensifs" },
  { key: "stl", label: "interceptions" },
  { key: "blk", label: "contres" },
  { key: "tov", label: "pertes de balle", inverse: true },
  { key: "threePa", label: "tirs à 3 points" },
];

/**
 * Pour chaque stat, calcule le seuil (médiane) qui sépare le mieux les
 * victoires des défaites. Retourne la stat avec le plus gros écart de win%.
 */
function findBestDiscriminator(
  games: GameData[],
  stats: StatDef[],
): {
  stat: StatDef;
  threshold: number;
  winRateAbove: number;
  winRateBelow: number;
  delta: number;
  nAbove: number;
  nBelow: number;
} | null {
  let best: ReturnType<typeof findBestDiscriminator> = null;

  for (const stat of stats) {
    const values = games
      .map((g) => g[stat.key])
      .filter((v): v is number => typeof v === "number");
    if (values.length < 10) continue;

    const threshold = Math.round(median(values));
    const above = games.filter(
      (g) =>
        typeof g[stat.key] === "number" && (g[stat.key] as number) >= threshold,
    );
    const below = games.filter(
      (g) =>
        typeof g[stat.key] === "number" && (g[stat.key] as number) < threshold,
    );
    if (above.length < 4 || below.length < 4) continue;

    const winRateAbove = above.filter((g) => g.won).length / above.length;
    const winRateBelow = below.filter((g) => g.won).length / below.length;
    const rawDelta = winRateAbove - winRateBelow;
    const delta = stat.inverse ? -rawDelta : rawDelta;

    if (!best || delta > best.delta) {
      best = {
        stat,
        threshold,
        winRateAbove: stat.inverse ? winRateBelow : winRateAbove,
        winRateBelow: stat.inverse ? winRateAbove : winRateBelow,
        delta,
        nAbove: stat.inverse ? below.length : above.length,
        nBelow: stat.inverse ? above.length : below.length,
      };
    }
  }
  return best;
}

function analyzeWinningFormula(
  games: GameData[],
  teamCity: string,
): Insight | null {
  const best = findBestDiscriminator(games, ANALYZED_STATS);
  if (!best || best.delta < 0.2) return null;

  const op = best.stat.inverse ? "moins de" : "au moins";
  const comparator = best.stat.inverse
    ? `≤ ${best.threshold}`
    : `${best.threshold}+`;

  return {
    kind: "winning_formula",
    emoji: "🎯",
    title: "Formule de victoire",
    finding: `Quand les ${teamCity} ont ${op} ${best.threshold} ${best.stat.label}, ils gagnent ${pct(best.winRateAbove)}% du temps (${comparator}). Sinon, seulement ${pct(best.winRateBelow)}%.`,
    strength: Math.min(1, best.delta * 2),
    sampleSize: best.nAbove + best.nBelow,
  };
}

/**
 * Achilles' heel : analyse les stats de l'adversaire dans les défaites vs victoires.
 * On approxime ici en regardant les stats *propres* en défaite : où l'équipe
 * sous-performe le plus quand elle perd.
 */
function analyzeAchillesHeel(games: GameData[]): Insight | null {
  const wins = games.filter((g) => g.won);
  const losses = games.filter((g) => !g.won);
  if (wins.length < 5 || losses.length < 5) return null;

  type Result = {
    label: string;
    winsAvg: number;
    lossesAvg: number;
    gap: number;
  };
  const results: Result[] = [];

  // FG% gap
  const fgPct = (g: GameData) => (g.fga ? (g.fgm ?? 0) / g.fga : null);
  const threePct = (g: GameData) =>
    g.threePa ? (g.threePm ?? 0) / g.threePa : null;
  const ftPct = (g: GameData) => (g.fta ? (g.ftm ?? 0) / g.fta : null);

  const measures: {
    label: string;
    fn: (g: GameData) => number | null;
    isPct?: boolean;
  }[] = [
    { label: "leur réussite globale au tir", fn: fgPct, isPct: true },
    { label: "leur réussite à 3 points", fn: threePct, isPct: true },
    { label: "leur réussite aux lancers francs", fn: ftPct, isPct: true },
    { label: "leurs pertes de balle", fn: (g) => g.tov },
    { label: "leurs rebonds", fn: (g) => g.reb },
    { label: "leurs passes décisives", fn: (g) => g.ast },
  ];

  for (const m of measures) {
    const wVals = wins.map(m.fn).filter((v): v is number => v != null);
    const lVals = losses.map(m.fn).filter((v): v is number => v != null);
    if (wVals.length < 5 || lVals.length < 5) continue;
    const wAvg = avg(wVals);
    const lAvg = avg(lVals);
    // Gap relatif normalisé : on cherche la stat où l'écart est le plus parlant
    const gap = Math.abs(wAvg - lAvg) / Math.max(wAvg, 0.01);
    results.push({
      label: m.label + (m.isPct ? "_pct" : ""),
      winsAvg: m.isPct ? wAvg * 100 : wAvg,
      lossesAvg: m.isPct ? lAvg * 100 : lAvg,
      gap,
    });
  }

  if (results.length === 0) return null;
  const top = results.reduce((a, b) => (a.gap > b.gap ? a : b));
  const isPct = top.label.endsWith("_pct");
  const cleanLabel = top.label.replace("_pct", "");
  const dec = isPct ? 1 : 1;

  return {
    kind: "achilles_heel",
    emoji: "💔",
    title: "Talon d'Achille",
    finding: `En défaite, ${cleanLabel} chute à ${top.lossesAvg.toFixed(dec)}${isPct ? "%" : ""} contre ${top.winsAvg.toFixed(dec)}${isPct ? "%" : ""} en victoire — c'est le facteur le plus différenciant.`,
    strength: Math.min(1, top.gap * 4),
    sampleSize: wins.length + losses.length,
  };
}

function analyzeQ3Momentum(
  games: GameData[],
  teamCity: string,
): Insight | null {
  const withLines = games.filter(
    (g) => g.teamLines && g.oppLines && g.teamLines.length >= 3,
  );
  if (withLines.length < 10) return null;

  const wonQ3 = withLines.filter((g) => g.teamLines![2] > g.oppLines![2]);
  const lostQ3 = withLines.filter((g) => g.teamLines![2] < g.oppLines![2]);
  if (wonQ3.length < 4 || lostQ3.length < 4) return null;

  const winRateWhenWonQ3 = wonQ3.filter((g) => g.won).length / wonQ3.length;
  const winRateWhenLostQ3 = lostQ3.filter((g) => g.won).length / lostQ3.length;
  const delta = winRateWhenWonQ3 - winRateWhenLostQ3;

  if (Math.abs(delta) < 0.2) return null;

  return {
    kind: "q3_momentum",
    emoji: "⚡",
    title: "Le 3ᵉ quart-temps",
    finding: `Quand les ${teamCity} gagnent le 3ᵉ quart-temps, ils remportent ${pct(winRateWhenWonQ3)}% des matchs. Sinon, ${pct(winRateWhenLostQ3)}%.`,
    strength: Math.min(1, Math.abs(delta) * 2),
    sampleSize: wonQ3.length + lostQ3.length,
  };
}

function analyzeShootingDependency(games: GameData[]): Insight | null {
  // Calcule 3P% par match, sépare en deux groupes (hot / cold) au quartile haut/bas
  const valid = games.filter(
    (g) => typeof g.threePa === "number" && g.threePa! > 0,
  );
  if (valid.length < 15) return null;

  const pcts = valid.map((g) => (g.threePm ?? 0) / g.threePa!);
  const hotThreshold = quartile(pcts, 0.66);
  const coldThreshold = quartile(pcts, 0.33);

  const hot = valid.filter(
    (g) => (g.threePm ?? 0) / g.threePa! >= hotThreshold,
  );
  const cold = valid.filter(
    (g) => (g.threePm ?? 0) / g.threePa! <= coldThreshold,
  );
  if (hot.length < 4 || cold.length < 4) return null;

  const wHot = hot.filter((g) => g.won).length / hot.length;
  const wCold = cold.filter((g) => g.won).length / cold.length;
  const delta = wHot - wCold;
  if (delta < 0.15) return null;

  return {
    kind: "shooting_dependency",
    emoji: "🔥",
    title: "Dépendance au 3 points",
    finding: `Quand ils shootent à ${pct(hotThreshold)}%+ derrière l'arc, ils gagnent ${pct(wHot)}% du temps. À ${pct(coldThreshold)}% et moins, ${pct(wCold)}% — leur attaque vit et meurt par le 3.`,
    strength: Math.min(1, delta * 2.5),
    sampleSize: hot.length + cold.length,
  };
}

function analyzeGameProfile(games: GameData[]): Insight | null {
  const wins = games.filter((g) => g.won);
  const losses = games.filter((g) => !g.won);
  if (wins.length < 5 || losses.length < 5) return null;

  const avgWinMargin = avg(wins.map((g) => g.pointsScored - g.pointsAllowed));
  const avgLossMargin = avg(
    losses.map((g) => g.pointsAllowed - g.pointsScored),
  );

  // Détecte les profils intéressants
  let finding: string;
  let strength: number;

  if (avgWinMargin > 12 && avgLossMargin < 7) {
    finding = `Profil "bull rush" : quand ils gagnent, c'est large (+${avgWinMargin.toFixed(1)} pts). Quand ils perdent, c'est serré (-${avgLossMargin.toFixed(1)} pts). Ils écrasent ou résistent — rarement entre les deux.`;
    strength = 0.75;
  } else if (avgWinMargin < 7 && avgLossMargin > 12) {
    finding = `Profil "fragile" : leurs défaites sont des effondrements (-${avgLossMargin.toFixed(1)} pts) alors que leurs victoires sont serrées (+${avgWinMargin.toFixed(1)} pts). Ils tiennent ou cèdent complètement.`;
    strength = 0.75;
  } else if (Math.abs(avgWinMargin - avgLossMargin) < 3) {
    finding = `Équipe équilibrée : leurs victoires (+${avgWinMargin.toFixed(1)}) et défaites (-${avgLossMargin.toFixed(1)}) ont une amplitude similaire — pas de pattern blowout/close clair.`;
    strength = 0.4;
  } else {
    return null;
  }

  return {
    kind: "game_profile",
    emoji: "📈",
    title: "Profil de match",
    finding,
    strength,
    sampleSize: wins.length + losses.length,
  };
}

// ── Orchestrateur ─────────────────────────────────────────────────────────────

export async function getTeamInsights(
  teamId: string,
  teamCity: string,
  season: string,
): Promise<Insight[]> {
  const games = await loadGameData(teamId, season);

  // Données insuffisantes — on ne génère rien plutôt que de l'imprécis
  if (games.length < 10) return [];

  const candidates: (Insight | null)[] = [
    analyzeWinningFormula(games, teamCity),
    analyzeAchillesHeel(games),
    analyzeQ3Momentum(games, teamCity),
    analyzeShootingDependency(games),
    analyzeGameProfile(games),
  ];

  return candidates
    .filter((i): i is Insight => i !== null)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4);
}
