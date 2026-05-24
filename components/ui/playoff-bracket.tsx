"use client";

import type { PlayoffBracketData } from "@/lib/playoffs";
import { PlayoffSeriesCard } from "./playoff-series-card";

type Props = {
  data: PlayoffBracketData;
  locale: string;
};

/** Placeholder card for a series not yet determined. */
function TbdCard() {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-[#0e0e11] w-[210px] h-[86px] flex items-center justify-center flex-shrink-0">
      <span className="text-[11px] text-white/15 font-mono uppercase tracking-wider">
        TBD
      </span>
    </div>
  );
}

function ConferenceLabel({ label }: { label: string }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-medium mb-4 text-center">
      {label}
    </div>
  );
}

export function PlayoffBracket({ data, locale }: Props) {
  const { west, east, nbaFinals } = data;

  // Pad arrays with nulls so justify-around works for incomplete brackets
  const pad = <T,>(arr: T[], target: number): (T | null)[] => [
    ...arr,
    ...Array(Math.max(0, target - arr.length)).fill(null),
  ];

  const westR1 = pad(west.r1, 4);
  const westSemis = pad(west.semis, 2);
  const eastR1 = pad(east.r1, 4);
  const eastSemis = pad(east.semis, 2);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[1200px]">
        {/* Conference labels */}
        <div className="flex gap-3 mb-2 px-1">
          <div className="flex-1">
            <ConferenceLabel label="Conférence Ouest" />
          </div>
          <div className="w-[220px]" />
          <div className="flex-1">
            <ConferenceLabel label="Conférence Est" />
          </div>
        </div>

        {/* Round labels row */}
        <div className="flex items-center gap-3 mb-3 px-1">
          {/* West labels: R1 → Semis → CF */}
          <div className="flex-1 flex gap-3">
            {["1er tour", "Demi-finales", "Finale conf."].map((l) => (
              <div key={l} className="flex-1 text-center">
                <span className="text-[9px] uppercase tracking-[0.15em] text-white/20">
                  {l}
                </span>
              </div>
            ))}
          </div>
          {/* Finals label */}
          <div className="w-[220px] text-center">
            <span className="text-[9px] uppercase tracking-[0.15em] text-white/20">
              Finales NBA
            </span>
          </div>
          {/* East labels: CF → Semis → R1 */}
          <div className="flex-1 flex gap-3 flex-row-reverse">
            {["1er tour", "Demi-finales", "Finale conf."].map((l) => (
              <div key={l} className="flex-1 text-center">
                <span className="text-[9px] uppercase tracking-[0.15em] text-white/20">
                  {l}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bracket */}
        <div className="flex gap-3 items-stretch" style={{ minHeight: 640 }}>
          {/* ── West ── */}
          <div className="flex-1 flex gap-3">
            {/* R1 */}
            <div className="flex-1 flex flex-col justify-around gap-4">
              {westR1.map((s, i) =>
                s ? (
                  <PlayoffSeriesCard key={s.key} series={s} locale={locale} />
                ) : (
                  <TbdCard key={i} />
                ),
              )}
            </div>
            {/* Semis */}
            <div className="flex-1 flex flex-col justify-around gap-4">
              {westSemis.map((s, i) =>
                s ? (
                  <PlayoffSeriesCard key={s.key} series={s} locale={locale} />
                ) : (
                  <TbdCard key={i} />
                ),
              )}
            </div>
            {/* CF */}
            <div className="flex-1 flex flex-col justify-center">
              {west.finals ? (
                <PlayoffSeriesCard series={west.finals} locale={locale} />
              ) : (
                <TbdCard />
              )}
            </div>
          </div>

          {/* ── NBA Finals ── */}
          <div className="w-[220px] flex flex-col justify-center items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-1">
              <span className="text-amber-400 text-sm">🏆</span>
            </div>
            {nbaFinals ? (
              <PlayoffSeriesCard series={nbaFinals} locale={locale} />
            ) : (
              <TbdCard />
            )}
          </div>

          {/* ── East ── */}
          <div className="flex-1 flex gap-3 flex-row-reverse">
            {/* R1 */}
            <div className="flex-1 flex flex-col justify-around gap-4">
              {eastR1.map((s, i) =>
                s ? (
                  <PlayoffSeriesCard key={s.key} series={s} locale={locale} />
                ) : (
                  <TbdCard key={i} />
                ),
              )}
            </div>
            {/* Semis */}
            <div className="flex-1 flex flex-col justify-around gap-4">
              {eastSemis.map((s, i) =>
                s ? (
                  <PlayoffSeriesCard key={s.key} series={s} locale={locale} />
                ) : (
                  <TbdCard key={i} />
                ),
              )}
            </div>
            {/* CF */}
            <div className="flex-1 flex flex-col justify-center items-end">
              {east.finals ? (
                <PlayoffSeriesCard series={east.finals} locale={locale} />
              ) : (
                <TbdCard />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
