"use client";

import { useState } from "react";
import { LineChart } from "@/components/ui/line-chart";
import { stat, pct } from "@/lib/format";
import {
  computeCareerAverages,
  consolidateSeasons,
  type SeasonShooting,
  type SeasonStint,
} from "@/lib/stats/career";
import type { SeasonTotals } from "@/lib/stats/season-aggregation";

/**
 * Une ligne `PlayerSeason` brute : un joueur transféré en produit plusieurs
 * pour une même saison. La consolidation est faite ici, à l'affichage.
 */
export type CareerSeason = SeasonStint;

type CareerViewProps = {
  seasons: CareerSeason[];
  /** Pourcentages exacts des saisons transférées, tirés des box scores. */
  exactShooting?: Record<string, SeasonShooting>;
  /**
   * Totaux exacts des saisons couvertes par les box scores. Les autres
   * saisons n'ont ni totaux, ni titularisations, ni volumes de tirs.
   */
  seasonTotals?: Record<string, SeasonTotals>;
  primaryColor: string;
};

type Mode = "perGame" | "totals";

const MODES: { id: Mode; label: string }[] = [
  { id: "perGame", label: "Par match" },
  { id: "totals", label: "Totaux" },
];

/** Entier en notation française (1 234), ou tiret. */
function count(value: number | null | undefined): string {
  return value == null ? "—" : Math.round(value).toLocaleString("fr-FR");
}

function ratio(made: number, attempted: number): number | null {
  return attempted === 0 ? null : made / attempted;
}

/** Totaux de carrière, seulement si chaque saison en a d'exacts. */
function careerTotals(
  seasons: readonly { season: string }[],
  totals: Readonly<Record<string, SeasonTotals>>,
): SeasonTotals | null {
  const covered = seasons.map((row) => totals[row.season]);
  if (covered.length === 0 || covered.some((row) => !row)) return null;
  return (covered as SeasonTotals[]).reduce((acc, row) => {
    const next = { ...acc };
    for (const key of Object.keys(row) as (keyof SeasonTotals)[]) next[key] += row[key];
    return next;
  });
}

/** Cellule de tir : pourcentage et volume par match, ou réussis/tentés. */
function ShotCell({
  mode,
  pctValue,
  made,
  attempted,
  games,
}: {
  mode: Mode;
  pctValue: number | null;
  made?: number;
  attempted?: number;
  games?: number;
}) {
  const hasVolume = made != null && attempted != null && games != null && games > 0;
  if (mode === "totals") {
    return hasVolume ? (
      <>
        <span className="block whitespace-nowrap">
          {count(made)}/{count(attempted)}
        </span>
        <span className="block text-[10px] text-white/35">{pct(pctValue)}</span>
      </>
    ) : (
      "—"
    );
  }
  return (
    <>
      <span className="block">{pct(pctValue)}</span>
      {hasVolume && (
        <span className="block whitespace-nowrap text-[10px] text-white/35">
          {stat(made / games)}/{stat(attempted / games)}
        </span>
      )}
    </>
  );
}

export function CareerView({
  seasons,
  exactShooting,
  seasonTotals = {},
  primaryColor,
}: CareerViewProps) {
  const [mode, setMode] = useState<Mode>("perGame");
  // Une ligne par saison (transferts fusionnés), en ordre chronologique.
  const chrono = consolidateSeasons(seasons, exactShooting);
  const career = computeCareerAverages(seasons);
  const careerSum = careerTotals(chrono, seasonTotals);
  const firstCovered = Object.keys(seasonTotals).sort()[0] ?? null;
  const allCovered = careerSum != null;

  const chartData = chrono.map((d) => ({
    s: d.season.slice(2),
    v: d.pointsPerGame,
  }));

  const careerPpg = stat(career.pointsPerGame);

  return (
    <div className="space-y-6">
      {/* Chart PPG */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
            POINTS PAR MATCH — {chrono.length}{" "}
            {chrono.length > 1 ? "SAISONS" : "SAISON"}
          </div>
          <div className="text-xs text-white/40 font-mono">
            Moy. {careerPpg} pts
          </div>
        </div>
        <h3 className="font-display font-semibold text-xl tracking-tight mb-4">
          Évolution carrière
        </h3>
        <LineChart
          data={chartData}
          accessor={(d) => d.v as number}
          label="player-career"
          color={primaryColor}
        />
      </div>

      {/* Table carrière */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">
            Saison régulière
          </div>
          <div
            role="group"
            aria-label="Affichage des statistiques"
            className="flex rounded-lg border border-white/10 p-0.5 text-xs"
          >
            {MODES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={mode === option.id}
                onClick={() => setMode(option.id)}
                className={`rounded-md px-3 py-1.5 transition ${mode === option.id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/75"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                <th className="sticky left-0 z-10 bg-[#111114] text-left px-4 sm:px-5 py-3 font-medium">Saison</th>
                <th className="text-left px-3 py-3 font-medium">Équipe</th>
                <th className="text-right px-3 py-3 font-medium" title="Matchs joués">MJ</th>
                <th className="text-right px-3 py-3 font-medium" title="Titularisations">TIT</th>
                <th className="text-right px-3 py-3 font-medium">MIN</th>
                <th className="text-right px-3 py-3 font-medium">PTS</th>
                <th className="text-right px-3 py-3 font-medium">REB</th>
                <th className="text-right px-3 py-3 font-medium">PAS</th>
                <th className="text-right px-3 py-3 font-medium">INT</th>
                <th className="text-right px-3 py-3 font-medium">CTR</th>
                <th className="text-right px-3 py-3 font-medium" title="Tirs : pourcentage, réussis/tentés">FG%</th>
                <th className="text-right px-3 py-3 font-medium" title="Tirs à trois points : pourcentage, réussis/tentés">3P%</th>
                <th className="text-right px-4 sm:px-5 py-3 font-medium" title="Lancers francs : pourcentage, réussis/tentés">LF%</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {[...chrono].reverse().map((row) => {
                // Totaux retenus seulement s'ils couvrent toute la saison.
                const totals = seasonTotals[row.season];
                const exact = totals && totals.games === row.gamesPlayed ? totals : null;
                const perGame = mode === "perGame";
                const value = (average: number, total: number | undefined) =>
                  perGame ? stat(average) : count(exact ? total : null);
                return (
                  <tr
                    key={`${row.season}-${row.teamAbbr}`}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition"
                  >
                    <td className="sticky left-0 z-10 bg-[#111114] px-4 sm:px-5 py-3 whitespace-nowrap text-white/80 font-sans text-xs">
                      {row.season}
                    </td>
                    <td className="px-3 py-3 text-white/60 font-sans text-xs">
                      {row.isMultiTeam ? (
                        <span title={`Saison en ${row.teams.length} équipes : ${row.teams.join(", ")}`}>
                          {row.teamAbbr}
                          <span className="text-white/30"> ({row.teams.length})</span>
                        </span>
                      ) : (
                        row.teamAbbr
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-white/60">
                      {row.gamesPlayed}
                    </td>
                    <td className="px-3 py-3 text-right text-white/60">
                      {count(exact?.starts)}
                    </td>
                    <td className="px-3 py-3 text-right text-white/60">
                      {value(row.minutesPerGame, exact?.minutes)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-white">
                      {value(row.pointsPerGame, exact?.pts)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {value(row.reboundsPerGame, exact?.reb)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {value(row.assistsPerGame, exact?.ast)}
                    </td>
                    <td className="px-3 py-3 text-right text-white/60">
                      {value(row.stealsPerGame, exact?.stl)}
                    </td>
                    <td className="px-3 py-3 text-right text-white/60">
                      {value(row.blocksPerGame, exact?.blk)}
                    </td>
                    <td className="px-3 py-3 text-right text-white/60">
                      <ShotCell mode={mode} pctValue={row.fgPct} made={exact?.fgm} attempted={exact?.fga} games={exact?.games} />
                    </td>
                    <td className="px-3 py-3 text-right text-white/60">
                      <ShotCell mode={mode} pctValue={row.threePtPct} made={exact?.threePm} attempted={exact?.threePa} games={exact?.games} />
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-right text-white/60">
                      <ShotCell mode={mode} pctValue={row.ftPct} made={exact?.ftm} attempted={exact?.fta} games={exact?.games} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {chrono.length > 1 && (
              <tfoot className="font-mono tabular-nums">
                {(() => {
                  const perGame = mode === "perGame";
                  const value = (average: number | null, total: number | undefined) =>
                    perGame ? stat(average) : count(careerSum ? total : null);
                  const shot = (made?: number, attempted?: number) => (
                    <ShotCell
                      mode={mode}
                      pctValue={careerSum && made != null && attempted != null ? ratio(made, attempted) : null}
                      made={made}
                      attempted={attempted}
                      games={careerSum?.games}
                    />
                  );
                  return (
                    <tr className="border-t border-white/10 bg-white/[0.02]">
                      <td className="sticky left-0 z-10 bg-[#141417] px-4 sm:px-5 py-3 whitespace-nowrap text-white font-sans text-xs font-medium">
                        Carrière
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-white/40 font-sans text-xs">
                        {career.seasonsPlayed} saisons
                      </td>
                      <td className="px-3 py-3 text-right text-white/70">{career.gamesPlayed}</td>
                      <td className="px-3 py-3 text-right text-white/70">{count(careerSum?.starts)}</td>
                      <td className="px-3 py-3 text-right text-white/70">{value(career.minutesPerGame, careerSum?.minutes)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-white">{value(career.pointsPerGame, careerSum?.pts)}</td>
                      <td className="px-3 py-3 text-right">{value(career.reboundsPerGame, careerSum?.reb)}</td>
                      <td className="px-3 py-3 text-right">{value(career.assistsPerGame, careerSum?.ast)}</td>
                      <td className="px-3 py-3 text-right text-white/70">{value(career.stealsPerGame, careerSum?.stl)}</td>
                      <td className="px-3 py-3 text-right text-white/70">{value(career.blocksPerGame, careerSum?.blk)}</td>
                      <td className="px-3 py-3 text-right text-white/70">{shot(careerSum?.fgm, careerSum?.fga)}</td>
                      <td className="px-3 py-3 text-right text-white/70">{shot(careerSum?.threePm, careerSum?.threePa)}</td>
                      <td className="px-4 sm:px-5 py-3 text-right text-white/70">{shot(careerSum?.ftm, careerSum?.fta)}</td>
                    </tr>
                  );
                })()}
              </tfoot>
            )}
          </table>
        </div>
        <div className="space-y-2 border-t border-white/[0.06] px-4 py-3 sm:px-5 text-xs text-white/40">
          <p>
            <span className="font-mono text-white/60">TIT</span> titularisations.
            Sous chaque pourcentage : tirs réussis/tentés.{" "}
            {firstCovered
              ? `Titularisations, totaux et tirs tentés viennent des box scores, disponibles depuis ${firstCovered}.`
              : "Titularisations, totaux et tirs tentés viennent des box scores, absents pour ce joueur."}{" "}
            Les moyennes des saisons antérieures sont arrondies au dixième : en
            déduire des totaux serait inexact, d&apos;où le tiret.
            {!allCovered && chrono.length > 1 && " Les totaux de carrière attendent donc d'être couverts saison par saison."}
          </p>
          {chrono.some((row) => row.isMultiTeam) && (
            <p>
              <span className="font-mono text-white/60">TOT</span>{" "}
              regroupe les équipes d&apos;une même saison. Les moyennes sont
              pondérées par les matchs joués ; les pourcentages sont recalculés
              sur les tirs des box scores, et restent vides pour les saisons
              antérieures, faute de volumes de tirs.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
