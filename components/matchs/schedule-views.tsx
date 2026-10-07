import Link from "next/link";
import Image from "next/image";
import { isStaleStatus } from "@/lib/game-status";
import { GAME_PHASE_LABELS, REGULAR_SEASON_PHASE, type GamePhase } from "@/lib/season-phase";
import {
  capitalizeFirst,
  dayShort,
  dayWithWeekday,
  hasBlockingIssue,
  monthGrid,
  monthTitle,
  overtimeLabel,
} from "@/lib/schedule";
import type { GameLeader, ScheduleGame, ScheduleTeam } from "@/lib/stats/schedule-data";

const matchsPath = (locale: string) => `/${locale}/matchs`;
export const dayHref = (locale: string, key: string) => `${matchsPath(locale)}?date=${key}`;
export const teamScheduleHref = (locale: string, abbr: string) => `${matchsPath(locale)}?equipe=${abbr.toLowerCase()}`;

export function formatParisTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

function phaseLabel(phase: string | null): string | null {
  if (!phase || phase === REGULAR_SEASON_PHASE) return null;
  return GAME_PHASE_LABELS[phase as GamePhase] ?? null;
}

/** Ce que la carte peut affirmer du match, sans inventer de direct. */
export type GameState =
  | { kind: "upcoming" }
  | { kind: "pending" }
  | { kind: "live" }
  | { kind: "postponed" }
  | { kind: "final"; overtime: string | null }
  | { kind: "unverified" };

export function gameState(game: ScheduleGame, now: Date): GameState {
  if (game.status === "postponed") return { kind: "postponed" };
  if (game.status === "final") {
    return hasBlockingIssue(game.issues) ? { kind: "unverified" } : { kind: "final", overtime: overtimeLabel(game.periods) };
  }
  if (isStaleStatus(game.status, game.gameDate, now)) return { kind: "pending" };
  if (game.status === "in_progress") return { kind: "live" };
  return { kind: "upcoming" };
}

function StateBadge({ state }: { state: GameState }) {
  const base = "text-[9px] font-mono uppercase tracking-widest";
  switch (state.kind) {
    case "final":
      return <span className={`${base} text-white/35`}>Final{state.overtime ? ` · ${state.overtime}` : ""}</span>;
    case "unverified":
      return <span className={`${base} text-amber-400/80`}>Score à vérifier</span>;
    case "live":
      return (
        <span className={`${base} flex items-center gap-1 text-emerald-400`}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          En cours
        </span>
      );
    case "postponed":
      return <span className={`${base} text-amber-400/80`}>Reporté</span>;
    case "pending":
      return <span className={`${base} text-white/35`}>Résultat en attente</span>;
    case "upcoming":
      return <span className={`${base} text-white/35`}>À venir</span>;
  }
}

function TeamLogo({ team, size = 28 }: { team: ScheduleTeam; size?: number }) {
  if (!team.logoUrl) {
    return (
      <span
        className="shrink-0 rounded flex items-center justify-center text-[9px] font-mono text-white/50 bg-white/[0.05]"
        style={{ width: size, height: size }}
      >
        {team.abbr}
      </span>
    );
  }
  return <Image src={team.logoUrl} alt="" width={size} height={size} className="object-contain shrink-0" unoptimized />;
}

function Leader({ leader, locale, align }: { leader: GameLeader; locale: string; align: "left" | "right" }) {
  const line = (
    <>
      <span className="text-white/70">{leader.name}</span>{" "}
      <span className="font-mono tabular-nums text-white/45">{leader.pts} pts</span>
    </>
  );
  const className = `min-w-0 ${align === "right" ? "text-right" : ""} [overflow-wrap:anywhere]`;
  return leader.slug ? (
    <Link href={`/${locale}/joueurs/${leader.slug}`} className={`${className} hover:text-orange-300 hover:underline`}>
      {line}
    </Link>
  ) : (
    <span className={className}>{line}</span>
  );
}

export function GameCard({ game, locale, now }: { game: ScheduleGame; locale: string; now: Date }) {
  const state = gameState(game, now);
  const showScore = state.kind === "final" || state.kind === "unverified";
  const decided = state.kind === "final";
  const homeWon = decided && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = decided && (game.awayScore ?? 0) > (game.homeScore ?? 0);
  const phase = phaseLabel(game.phase);
  const teamClass = (won: boolean) => `text-sm font-medium leading-tight truncate ${!decided || won ? "text-white" : "text-white/55"}`;

  return (
    <article className="rounded-2xl border border-white/[0.06] bg-[#111114] transition hover:border-white/[0.12]">
      <Link href={`/${locale}/matchs/${game.id}`} className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3.5">
        <span className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <TeamLogo team={game.awayTeam} />
          <span className="min-w-0">
            <span className={`block ${teamClass(awayWon)}`}>
              <span className="sm:hidden">{game.awayTeam.abbr}</span>
              <span className="hidden sm:inline">{game.awayTeam.city}</span>
            </span>
            <span className="hidden sm:block text-[11px] text-white/30 font-mono">{game.awayTeam.abbr}</span>
          </span>
        </span>

        <span className="flex flex-col items-center shrink-0 gap-1 min-w-[84px]">
          {phase && <span className="text-[9px] font-mono uppercase tracking-widest text-orange-300/70">{phase}</span>}
          {showScore ? (
            <span className="font-display font-bold tabular-nums text-lg tracking-tight whitespace-nowrap">
              <span className={!decided || awayWon ? "text-white" : "text-white/50"}>{game.awayScore ?? "–"}</span>
              <span className="text-white/20 mx-1.5">-</span>
              <span className={!decided || homeWon ? "text-white" : "text-white/50"}>{game.homeScore ?? "–"}</span>
            </span>
          ) : state.kind === "upcoming" ? (
            <span className="font-mono text-sm text-white/70">{formatParisTime(game.gameDate)}</span>
          ) : null}
          <StateBadge state={state} />
        </span>

        <span className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 justify-end">
          <span className="min-w-0 text-right">
            <span className={`block ${teamClass(homeWon)}`}>
              <span className="sm:hidden">{game.homeTeam.abbr}</span>
              <span className="hidden sm:inline">{game.homeTeam.city}</span>
            </span>
            <span className="hidden sm:block text-[11px] text-white/30 font-mono">{game.homeTeam.abbr}</span>
          </span>
          <TeamLogo team={game.homeTeam} />
        </span>
      </Link>

      {(game.awayLeader || game.homeLeader) && (
        <div className="border-t border-white/[0.05] px-3 sm:px-5 py-2 flex items-start justify-between gap-3 text-xs">
          {game.awayLeader ? <Leader leader={game.awayLeader} locale={locale} align="left" /> : <span />}
          {game.homeLeader ? <Leader leader={game.homeLeader} locale={locale} align="right" /> : <span />}
        </div>
      )}
      {state.kind === "unverified" && (
        <p className="border-t border-white/[0.05] px-3 sm:px-5 py-2 text-[11px] text-amber-300/80">
          Score incohérent avec le tableau des quarts-temps : il est affiché sans vainqueur en attendant la correction.
        </p>
      )}
    </article>
  );
}

export function DayNav({
  locale,
  previous,
  next,
  isDefault,
}: {
  locale: string;
  previous: string | null;
  next: string | null;
  isDefault: boolean;
}) {
  const button =
    "flex min-h-11 items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 text-sm text-white/70 hover:border-white/[0.16] hover:text-white transition";
  const disabled = "flex min-h-11 items-center gap-1.5 rounded-xl border border-white/[0.04] px-3 text-sm text-white/20";
  return (
    <nav aria-label="Journées" className="flex items-center justify-between gap-2">
      {previous ? (
        <Link href={dayHref(locale, previous)} className={button} aria-label={`Journée précédente : ${dayShort(previous)}`}>
          <span aria-hidden>←</span>
          <span className="whitespace-nowrap">{dayShort(previous)}</span>
        </Link>
      ) : (
        <span className={disabled}>←</span>
      )}
      {!isDefault && (
        <Link href={matchsPath(locale)} className="min-h-11 flex items-center px-2 text-sm text-orange-300 hover:underline">
          Aujourd&apos;hui
        </Link>
      )}
      {next ? (
        <Link href={dayHref(locale, next)} className={button} aria-label={`Journée suivante : ${dayShort(next)}`}>
          <span className="whitespace-nowrap">{dayShort(next)}</span>
          <span aria-hidden>→</span>
        </Link>
      ) : (
        <span className={disabled}>→</span>
      )}
    </nav>
  );
}

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function MonthCalendar({
  locale,
  selected,
  counts,
  previousMonth,
  nextMonth,
}: {
  locale: string;
  selected: string;
  counts: Record<string, number>;
  previousMonth: string | null;
  nextMonth: string | null;
}) {
  const arrow = "min-h-11 min-w-11 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.05]";
  return (
    <details className="group rounded-2xl border border-white/[0.06] bg-[#111114]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm text-white/70">
        <span>
          Calendrier · {capitalizeFirst(monthTitle(selected))}
        </span>
        <span aria-hidden className="text-white/40 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="px-2 sm:px-4 pb-4">
        <div className="flex items-center justify-between">
          {previousMonth ? (
            <Link href={dayHref(locale, previousMonth)} className={arrow} aria-label="Mois précédent">←</Link>
          ) : (
            <span className={`${arrow} text-white/15`}>←</span>
          )}
          <span className="text-sm font-medium">{capitalizeFirst(monthTitle(selected))}</span>
          {nextMonth ? (
            <Link href={dayHref(locale, nextMonth)} className={arrow} aria-label="Mois suivant">→</Link>
          ) : (
            <span className={`${arrow} text-white/15`}>→</span>
          )}
        </div>
        <table className="w-full table-fixed text-center text-xs">
          <thead>
            <tr>
              {WEEKDAYS.map((day, index) => (
                <th key={index} className="py-1 font-mono font-normal text-white/30">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthGrid(selected).map((week, index) => (
              <tr key={index}>
                {week.map((day, column) => {
                  if (!day) return <td key={column} />;
                  const count = counts[day] ?? 0;
                  const label = Number(day.slice(8));
                  const isSelected = day === selected;
                  return (
                    <td key={column} className="p-0.5">
                      {count > 0 ? (
                        <Link
                          href={dayHref(locale, day)}
                          aria-label={`${dayWithWeekday(day)} : ${count} match${count > 1 ? "s" : ""}`}
                          aria-current={isSelected ? "date" : undefined}
                          className={`flex min-h-10 flex-col items-center justify-center rounded-lg tabular-nums ${
                            isSelected ? "bg-orange-400 text-black font-semibold" : "text-white hover:bg-white/[0.06]"
                          }`}
                        >
                          {label}
                          <span className={`text-[9px] ${isSelected ? "text-black/60" : "text-white/35"}`}>{count}</span>
                        </Link>
                      ) : (
                        <span
                          className={`flex min-h-10 items-center justify-center rounded-lg tabular-nums ${
                            isSelected ? "ring-1 ring-orange-400/60 text-white/50" : "text-white/20"
                          }`}
                        >
                          {label}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 px-2 text-[11px] text-white/30">Sous chaque date : le nombre de matchs de la journée.</p>
      </div>
    </details>
  );
}

export function TeamPicker({
  locale,
  teams,
  current,
}: {
  locale: string;
  teams: { abbr: string; city: string; name: string }[];
  current?: string;
}) {
  return (
    <details className="group rounded-2xl border border-white/[0.06] bg-[#111114]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm text-white/70">
        <span>Calendrier d&apos;une équipe{current ? ` · ${current}` : ""}</span>
        <span aria-hidden className="text-white/40 transition group-open:rotate-180">▾</span>
      </summary>
      <ul className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-1 px-2 sm:px-4 pb-4">
        {teams.map((team) => (
          <li key={team.abbr}>
            <Link
              href={teamScheduleHref(locale, team.abbr)}
              title={`${team.city} ${team.name}`}
              aria-current={team.abbr === current ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-lg font-mono text-xs ${
                team.abbr === current ? "bg-orange-400 text-black font-semibold" : "text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              {team.abbr}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Ligne du calendrier d'une équipe : date, adversaire, résultat ou heure. */
export function TeamGameRow({ game, team, locale, now }: { game: ScheduleGame; team: string; locale: string; now: Date }) {
  const isHome = game.homeTeam.abbr === team;
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const state = gameState(game, now);
  const own = isHome ? game.homeScore : game.awayScore;
  const other = isHome ? game.awayScore : game.homeScore;
  const phase = phaseLabel(game.phase);

  let outcome: React.ReactNode;
  if (state.kind === "final") {
    const won = (own ?? 0) > (other ?? 0);
    outcome = (
      <span className="font-mono tabular-nums whitespace-nowrap">
        <span className={won ? "text-emerald-400" : "text-red-400/80"}>{won ? "V" : "D"}</span>{" "}
        <span className="text-white/80">
          {own}-{other}
        </span>
        {state.overtime && <span className="text-white/35"> {state.overtime}</span>}
      </span>
    );
  } else if (state.kind === "unverified") {
    outcome = <span className="text-amber-300/80 text-xs">Score à vérifier</span>;
  } else if (state.kind === "postponed") {
    outcome = <span className="text-amber-300/80 text-xs">Reporté</span>;
  } else if (state.kind === "pending") {
    outcome = <span className="text-white/40 text-xs">En attente</span>;
  } else if (state.kind === "live") {
    outcome = <span className="text-emerald-400 text-xs">En cours</span>;
  } else {
    outcome = <span className="font-mono text-white/60">{formatParisTime(game.gameDate)}</span>;
  }

  return (
    <li>
      <Link
        href={`/${locale}/matchs/${game.id}`}
        className="flex min-h-12 items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 text-sm hover:bg-white/[0.03]"
      >
        <span className="w-[4.75rem] sm:w-24 shrink-0 text-[11px] font-mono text-white/40">{capitalizeFirst(dayWithWeekday(game.dayKey))}</span>
        <span className="w-4 shrink-0 text-center text-[11px] font-mono text-white/30">{isHome ? "vs" : "@"}</span>
        <TeamLogo team={opponent} size={20} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-white/80">
            <span className="sm:hidden">{opponent.abbr}</span>
            <span className="hidden sm:inline">
              {opponent.city} <span className="text-white/40">{opponent.name}</span>
            </span>
          </span>
          {phase && <span className="block text-[10px] font-mono uppercase tracking-wider text-orange-300/70">{phase}</span>}
        </span>
        <span className="shrink-0 text-right">{outcome}</span>
      </Link>
    </li>
  );
}
