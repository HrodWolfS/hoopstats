import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { referenceDate } from "@/lib/nba";
import { isTeamParam } from "@/lib/query-routes";
import { capitalizeFirst, dayTitle, defaultDayKey, isDayKey, monthTitle } from "@/lib/schedule";
import { nightLabel } from "@/lib/stats/night";
import { firstDayOfMonth, loadDay, loadTeams, loadTeamSchedule } from "@/lib/stats/schedule-data";
import {
  DayNav,
  GameCard,
  MonthCalendar,
  TeamGameRow,
  TeamPicker,
} from "@/components/matchs/schedule-views";

import { ShareButton } from "@/components/analytics/share-button";

export const metadata: Metadata = {
  title: "Matchs NBA | hoopstats",
  description: "Résultats, programme et calendrier NBA journée par journée, heures de Paris, meilleurs marqueurs de chaque match.",
  alternates: { canonical: "/fr/matchs" },
};

export const revalidate = 300;

type Params = { locale: string; date?: string; equipe?: string };

function Header({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display font-semibold text-2xl tracking-tight mb-1">{title}</h1>
        <p className="text-white/45 text-sm">{subtitle}</p>
      </div>
      <ShareButton dimension="schedule" />
    </div>
  );
}

async function DayView({ locale, date }: { locale: string; date?: string }) {
  const now = referenceDate();
  const key = date ?? defaultDayKey(now);
  const [day, teams, previousMonth, nextMonth] = await Promise.all([
    loadDay(key),
    loadTeams(),
    firstDayOfMonth(key, -1),
    firstDayOfMonth(key, 1),
  ]);

  return (
    <div className="space-y-5">
      <Header
        title="Matchs NBA"
        subtitle={
          <>
            {capitalizeFirst(dayTitle(key))}
            <span className="text-white/30"> · {nightLabel(key)} en France</span>
          </>
        }
      />
      <DayNav locale={locale} previous={day.previous} next={day.next} isDefault={!date} />

      {day.games.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] px-4 py-12 text-center space-y-2">
          <p className="text-white/50 text-sm">Aucun match NBA cette journée.</p>
          {day.next && (
            <p className="text-white/35 text-xs">
              Prochaine journée : utilisez la flèche → ou le calendrier ci-dessous.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {day.games.map((game) => (
            <GameCard key={game.id} game={game} locale={locale} now={now} />
          ))}
          <p className="pt-1 text-[11px] text-white/30">
            Heures de Paris. Sous chaque score, le meilleur marqueur de chaque équipe.{" "}
            <Link href={`/${locale}/sources#matchs`} className="underline hover:text-white/60">
              Règles d&apos;affichage
            </Link>
          </p>
        </div>
      )}

      <MonthCalendar
        locale={locale}
        selected={key}
        counts={day.month}
        previousMonth={previousMonth}
        nextMonth={nextMonth}
      />
      <TeamPicker locale={locale} teams={teams} />
    </div>
  );
}

async function TeamView({ locale, equipe }: { locale: string; equipe: string }) {
  const now = referenceDate();
  const [data, teams] = await Promise.all([loadTeamSchedule(equipe, now), loadTeams()]);
  if (!data) notFound();
  const { team, season, games, later } = data;

  const months = new Map<string, typeof games>();
  for (const game of games) {
    const month = game.dayKey.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), game]);
  }
  const monthList = (title: string, list: typeof games, key: string) => (
    <section key={key} className="space-y-2">
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-mono">{title}</h2>
      <ul className="rounded-2xl border border-white/[0.06] bg-[#111114] divide-y divide-white/[0.04] overflow-hidden">
        {list.map((game) => (
          <TeamGameRow key={game.id} game={game} team={team.abbr} locale={locale} now={now} />
        ))}
      </ul>
    </section>
  );
  const regular = games.filter((game) => game.phase === "regular" && game.status === "final");
  const wins = regular.filter((game) => {
    const isHome = game.homeTeam.abbr === team.abbr;
    return (isHome ? game.homeScore ?? 0 : game.awayScore ?? 0) > (isHome ? game.awayScore ?? 0 : game.homeScore ?? 0);
  }).length;
  const upcoming = [...games, ...later].filter((game) => game.status === "scheduled" && game.gameDate > now).length;

  return (
    <div className="space-y-5">
      <Header
        title={`Calendrier ${team.city} ${team.name}`}
        subtitle={
          <>
            Saison {season} · {games.length} matchs en base
            {regular.length > 0 && ` · ${wins}-${regular.length - wins} en saison régulière`}
            {upcoming > 0 && ` · ${upcoming} à venir`}
          </>
        }
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={`/${locale}/matchs`} className="min-h-11 flex items-center text-orange-300 hover:underline">
          ← Toutes les journées
        </Link>
        <Link href={`/${locale}/equipes/${team.slug}`} className="min-h-11 flex items-center text-white/60 hover:text-white hover:underline">
          Fiche {team.abbr}
        </Link>
      </div>
      <TeamPicker locale={locale} teams={teams} current={team.abbr} />

      {later.length > 0 && monthList(`À venir · saison ${later[0].season}`, later, "later")}
      {games.length === 0 ? (
        <p className="rounded-2xl border border-white/[0.06] bg-[#111114] px-4 py-12 text-center text-sm text-white/50">
          Aucun match en base pour {season}.
        </p>
      ) : (
        [...months].map(([month, monthGames]) => monthList(monthTitle(month), monthGames, month))
      )}
    </div>
  );
}

export default async function MatchsPage({ params }: { params: Promise<Params> }) {
  const { locale, date, equipe } = await params;
  if (date !== undefined && !isDayKey(date)) notFound();
  if (equipe !== undefined && !isTeamParam(equipe)) notFound();
  return equipe ? <TeamView locale={locale} equipe={equipe} /> : <DayView locale={locale} date={date} />;
}
