import Link from "next/link";
import { AWARDS_SINCE, INDIVIDUAL_AWARDS } from "@/lib/awards";

export type PlayerAward = {
  type: string;
  season: string;
  teamAbbr: string | null;
};

/**
 * Trophées individuels du joueur, regroupés par trophée. La couverture est
 * écrite en clair : sans elle, un joueur à la carrière antérieure semblerait
 * n'avoir rien gagné avant 2015-16.
 */
export function PlayerAwards({ awards, locale }: { awards: PlayerAward[]; locale: string }) {
  const groups = INDIVIDUAL_AWARDS.map((award) => ({
    ...award,
    wins: awards
      .filter((row) => row.type === award.type)
      .sort((left, right) => left.season.localeCompare(right.season)),
  })).filter((group) => group.wins.length > 0);
  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="player-awards" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="player-awards" className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/30">
          Trophées individuels
        </h2>
        <Link href={`/${locale}/trophees`} className="text-[11px] text-white/35 hover:text-orange-300">
          Tous les trophées →
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <li key={group.type} className="min-w-0 rounded-xl border border-white/[0.06] bg-[#111114] p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display font-semibold text-white">
                {group.label}
                {group.wins.length > 1 && <span className="ml-1.5 text-orange-300">×{group.wins.length}</span>}
              </span>
              <span className="truncate text-[10px] text-white/30">{group.sub}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {group.wins.map((win) => (
                <Link
                  key={win.season}
                  href={`/${locale}/trophees?saison=${win.season}`}
                  className="rounded-md border border-white/10 px-2 py-1 font-mono text-[11px] text-white/60 hover:border-orange-300/40 hover:text-orange-300"
                >
                  {win.season}
                  {win.teamAbbr && <span className="ml-1 text-white/30">{win.teamAbbr}</span>}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[10px] leading-relaxed text-white/25">
        Trophées individuels depuis {AWARDS_SINCE}. Sélections All-NBA, All-Star et résultats des votes non couverts.
      </p>
    </section>
  );
}
