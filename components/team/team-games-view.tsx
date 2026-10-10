"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { GameResultItem, gameResult, type GameRow } from "@/components/team/recent-games";
import { UpcomingGames } from "@/components/team/upcoming-games";
import { signed, stat } from "@/lib/format";
import { teamSeasonHref } from "@/lib/team-links";

/** Première saison couverte par les résultats match par match en base. */
const GAMES_SINCE = "2025-26";
const PAGE_SIZE = 20;

type Summary = { games: number; wins: number; losses: number; ptsFor: number; ptsAgainst: number };

function summarize(games: GameRow[]): Summary {
  const summary = { games: 0, wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0 };
  for (const game of games) {
    const result = gameResult(game);
    if (!result) continue;
    summary.games += 1;
    if (result.won) summary.wins += 1;
    else summary.losses += 1;
    summary.ptsFor += result.teamScore;
    summary.ptsAgainst += result.oppScore;
  }
  return summary;
}


function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
}

type TeamGamesViewProps = {
  /** Matchs joués de la saison (toutes phases comptées), du plus récent au plus ancien. */
  games: GameRow[];
  upcoming: GameRow[];
  season: string;
  liveSeason: string;
  primaryColor: string;
  locale: string;
};

export function TeamGamesView({ games, upcoming, season, liveSeason, primaryColor, locale }: TeamGamesViewProps) {
  const isLiveSeason = season === liveSeason;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
  const pageGames = games.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (games.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] px-4 py-10 text-center space-y-2">
          <p className="text-white/50 text-sm font-mono">Aucun match joué en base pour {season}.</p>
          <p className="text-white/30 text-xs font-mono">
            {season < GAMES_SINCE
              ? `Les résultats match par match commencent en ${GAMES_SINCE}.`
              : "Les résultats apparaissent après le premier match de la saison."}
          </p>
        </div>
        {isLiveSeason && <UpcomingGames games={upcoming} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RecentTrend games={games} season={season} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
        <section
          aria-labelledby="team-games-title"
          className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden"
        >
          <div className="flex items-baseline justify-between gap-3 px-4 pt-5 pb-3">
            <h3 id="team-games-title" className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
              Résultats {season}
            </h3>
            <span className="shrink-0 text-[11px] font-mono text-white/35">
              {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + pageGames.length} sur {games.length}
            </span>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {pageGames.map((game) => (
              <GameResultItem
                key={game.id}
                game={game}
                primaryColor={primaryColor}
                opponentHref={teamSeasonHref(locale, game.opponent.slug, season, liveSeason)}
              />
            ))}
          </ul>
          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-white/[0.04] px-4 py-3">
              <PageButton disabled={page === 0} onClick={() => setPage(page - 1)}>
                Plus récents
              </PageButton>
              <span className="text-[11px] font-mono text-white/35">
                {page + 1}/{pageCount}
              </span>
              <PageButton disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>
                Plus anciens
              </PageButton>
            </div>
          )}
        </section>

        <div className="space-y-6">
          {isLiveSeason && <UpcomingGames games={upcoming} />}
          <Opponents games={games} locale={locale} season={season} liveSeason={liveSeason} />
        </div>
      </div>
    </div>
  );
}

function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Derniers 5 et 10 matchs comparés à la saison régulière. */
function RecentTrend({ games, season }: { games: GameRow[]; season: string }) {
  const regular = summarize(games.filter((game) => game.phase === "regular"));
  const windows = [5, 10]
    .filter((size) => games.length >= size)
    .map((size) => {
      const slice = games.slice(0, size);
      return {
        label: `${size} derniers`,
        range: `${formatShortDate(slice[slice.length - 1].gameDate)} → ${formatShortDate(slice[0].gameDate)}`,
        summary: summarize(slice),
      };
    });
  const columns = [
    ...windows,
    ...(regular.games > 0 ? [{ label: "Saison rég.", range: `${regular.games} matchs`, summary: regular }] : []),
  ];
  if (columns.length === 0) return null;

  const regularDiff = regular.games > 0 ? (regular.ptsFor - regular.ptsAgainst) / regular.games : null;

  return (
    <section
      aria-labelledby="team-trend-title"
      className="rounded-2xl border border-white/[0.06] bg-[#111114] p-4 sm:p-5"
    >
      <h3 id="team-trend-title" className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
        Forme récente · {season}
      </h3>
      <div
        className="mt-4 grid gap-2.5 sm:gap-4"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map(({ label, range, summary }) => {
          const diff = (summary.ptsFor - summary.ptsAgainst) / summary.games;
          const delta = regularDiff !== null && summary !== regular ? diff - regularDiff : null;
          return (
            <div key={label} className="min-w-0 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
              <div className="text-[11px] font-medium text-white/60">{label}</div>
              <div className="text-[10px] font-mono text-white/30">{range}</div>
              <div className="mt-2 whitespace-nowrap font-display font-semibold text-lg tabular-nums min-[360px]:text-xl sm:text-2xl">
                {summary.wins}-{summary.losses}
              </div>
              <dl className="mt-1 space-y-0.5 text-[11px] font-mono text-white/50">
                <div className="flex justify-between gap-1">
                  <dt>Pour</dt>
                  <dd className="tabular-nums">{stat(summary.ptsFor / summary.games)}</dd>
                </div>
                <div className="flex justify-between gap-1">
                  <dt>Contre</dt>
                  <dd className="tabular-nums">{stat(summary.ptsAgainst / summary.games)}</dd>
                </div>
                <div className="flex justify-between gap-1 text-white/70">
                  <dt>Écart</dt>
                  <dd className="tabular-nums">{signed(diff)}</dd>
                </div>
              </dl>
              {delta !== null && (
                <div className={`mt-1 text-[10px] font-mono ${delta >= 0 ? "text-emerald-400/80" : "text-red-400/80"}`}>
                  {signed(delta)} vs saison
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-white/35">
        Points pour et contre : moyennes par match. Les derniers matchs incluent play-in, playoffs et finale NBA Cup ; la colonne
        saison régulière n&apos;en tient pas compte.
      </p>
    </section>
  );
}

type OpponentRow = {
  slug: string;
  abbr: string;
  city: string;
  name: string;
  logoUrl: string | null;
  summary: Summary;
};

/** Bilan face à chaque adversaire rencontré dans la saison, toutes phases comprises. */
function Opponents({
  games,
  locale,
  season,
  liveSeason,
}: {
  games: GameRow[];
  locale: string;
  season: string;
  liveSeason: string;
}) {
  const byOpponent = new Map<string, { opponent: GameRow["opponent"]; games: GameRow[] }>();
  for (const game of games) {
    const entry = byOpponent.get(game.opponent.slug);
    if (entry) entry.games.push(game);
    else byOpponent.set(game.opponent.slug, { opponent: game.opponent, games: [game] });
  }
  const rows: OpponentRow[] = [...byOpponent.values()]
    .map(({ opponent, games: list }) => ({ ...opponent, summary: summarize(list) }))
    .sort((a, b) => b.summary.games - a.summary.games || a.city.localeCompare(b.city, "fr"));

  return (
    <section
      aria-labelledby="team-opponents-title"
      className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden"
    >
      <div className="px-4 pt-5 pb-3">
        <h3 id="team-opponents-title" className="text-[11px] text-white/40 uppercase tracking-[0.2em] font-medium">
          Adversaires rencontrés · {rows.length}
        </h3>
      </div>
      <table className="w-full text-sm">
        <caption className="sr-only">Bilan face à chaque adversaire en {season}</caption>
        <thead>
          <tr className="border-b border-white/[0.06] text-[11px] text-white/30">
            <th scope="col" className="text-left font-medium px-4 py-2">Adversaire</th>
            <th scope="col" className="text-right font-medium px-2 py-2">
              <abbr title="Matchs joués" className="no-underline">MJ</abbr>
            </th>
            <th scope="col" className="text-right font-medium px-2 py-2">Bilan</th>
            <th scope="col" className="text-right font-medium px-4 py-2">
              <abbr title="Écart de points moyen" className="no-underline">Écart</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.slug} className="border-b border-white/[0.04] last:border-0">
              <th scope="row" className="px-4 py-2 text-left font-normal">
                <Link
                  href={teamSeasonHref(locale, row.slug, season, liveSeason)}
                  className="flex min-w-0 items-center gap-2 text-white/70 underline-offset-4 hover:underline"
                >
                  {row.logoUrl ? (
                    <Image src={row.logoUrl} alt="" width={18} height={18} className="object-contain shrink-0" />
                  ) : (
                    <span className="w-[18px] shrink-0" />
                  )}
                  <span className="truncate text-xs">
                    <span className="sm:hidden">{row.abbr}</span>
                    <span className="hidden sm:inline">
                      {row.city} <span className="text-white/35">{row.name}</span>
                    </span>
                  </span>
                </Link>
              </th>
              <td className="px-2 py-2 text-right font-mono tabular-nums text-white/50">{row.summary.games}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums text-white/80">
                {row.summary.wins}-{row.summary.losses}
              </td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-white/50">
                {signed((row.summary.ptsFor - row.summary.ptsAgainst) / row.summary.games)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
