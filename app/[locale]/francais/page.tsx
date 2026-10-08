import Link from "next/link";
import { type Metadata } from "next";
import { currentSeason } from "@/lib/nba";
import { stat } from "@/lib/format";
import { GAME_PHASE_LABELS, type GamePhase } from "@/lib/season-phase";
import { nightLabel } from "@/lib/stats/night";
import { getPlayerMetric } from "@/lib/stats/metrics";
import { playerSeasonHref } from "@/lib/team-links";
import { loadFrenchHub, MULTI_TEAM_ABBR, type FrenchHubData } from "@/lib/stats/french-data";
import { FRENCH_SCHEDULE_DAYS } from "@/lib/french";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { FrenchRow } from "@/components/home/night-recap";
import { SortablePlayerTable, type SortableRow } from "@/components/ui/sortable-player-table";
import { ShareButton } from "@/components/analytics/share-button";
import { playerStatsOrigin } from "@/lib/data-sources";
import { tableUpdatedAt } from "@/lib/data-updates";
import { csvFilename, isExportable } from "@/lib/export";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Français en NBA — stats, matchs et historique | hoopstats",
  description:
    "Tous les joueurs français de la NBA : performances de la nuit, statistiques de la saison, forme récente, prochains matchs et carrière de chaque Français depuis 1997.",
  alternates: { canonical: "/fr/francais" },
};

const PARIS = "Europe/Paris";

function SectionTitle({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="font-display text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      {aside && <span className="text-[11px] text-white/35">{aside}</span>}
    </div>
  );
}

const card = "rounded-2xl border border-white/[0.06] bg-[#111114]";

function signed(value: number): string {
  const text = stat(value);
  return value > 0 ? `+${text}` : text;
}

function tone(value: number): string {
  if (Math.abs(value) < 0.05) return "text-white/40";
  return value > 0 ? "text-emerald-400" : "text-rose-400";
}

function seasonSpan(first: string, last: string): string {
  const start = first.slice(0, 4);
  const end = String(Number(last.slice(0, 4)) + 1);
  return start === String(Number(end) - 1) ? first : `${start}–${end}`;
}

export default async function FrenchHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const data = await loadFrenchHub();
  const liveSeason = currentSeason();
  const active = data.history.filter((row) => row.active).length;

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="flex items-center justify-between gap-3">
          <Crumbs items={[{ label: "Accueil", href: `/${locale}` }, { label: "Français en NBA" }]} />
          <ShareButton dimension="french_hub" />
        </div>
        <div className="mt-4 space-y-2">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] md:text-5xl">Français en NBA</h1>
          <p className="max-w-2xl text-sm text-white/45">
            {data.history.length} joueurs français ont disputé au moins un match de saison régulière NBA, dont {active} en{" "}
            {data.season}. Leur nuit, leur saison, leur forme et leurs prochains matchs.
          </p>
          <p className="text-[11px] text-white/30">
            <Link href={`/${locale}/sources#francais`} className="underline decoration-white/15 underline-offset-2 hover:text-white">
              Qui compte comme Français ?
            </Link>
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <NightSection data={data} locale={locale} />
      </FadeIn>

      <FadeIn delay={0.1}>
        <ScheduleSection data={data} locale={locale} />
      </FadeIn>

      <FadeIn delay={0.15}>
        <SeasonSection data={data} locale={locale} liveSeason={liveSeason} />
      </FadeIn>

      {data.trends && (
        <FadeIn delay={0.2}>
          <TrendsSection data={data} trends={data.trends} locale={locale} liveSeason={liveSeason} />
        </FadeIn>
      )}

      <FadeIn delay={0.25}>
        <HistorySection data={data} locale={locale} />
      </FadeIn>
    </div>
  );
}

function NightSection({ data, locale }: { data: FrenchHubData; locale: string }) {
  if (!data.night) return null;
  const { key, performances } = data.night;
  return (
    <section className="space-y-3">
      <SectionTitle title="Dernière nuit" aside={nightLabel(key)} />
      {performances.length > 0 ? (
        <ul className={`divide-y divide-white/[0.04] ${card}`}>
          {performances.map((performance) => (
            <FrenchRow key={`${performance.gameId}-${performance.playerName}`} performance={performance} locale={locale} />
          ))}
        </ul>
      ) : (
        <p className={`${card} px-4 py-6 text-center text-sm text-white/40`}>
          Aucun Français n&apos;est entré en jeu lors de la dernière journée NBA.
        </p>
      )}
    </section>
  );
}

function ScheduleSection({ data, locale }: { data: FrenchHubData; locale: string }) {
  return (
    <section className="space-y-3">
      <SectionTitle title="Prochains matchs" aside={`${FRENCH_SCHEDULE_DAYS} prochains jours, heure de Paris`} />
      {data.schedule.length > 0 ? (
        <ul className={`divide-y divide-white/[0.04] ${card}`}>
          {data.schedule.map((game) => (
            <li key={game.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/${locale}/matchs/${game.id}`} className="text-sm font-medium hover:text-orange-300">
                  {game.awayTeam.abbr} @ {game.homeTeam.abbr}
                </Link>
                <span className="shrink-0 text-[11px] tabular-nums text-white/40">
                  {game.gameDate.toLocaleString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: PARIS,
                  })}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-white/40">
                {game.phase && game.phase !== "regular" ? `${GAME_PHASE_LABELS[game.phase as GamePhase] ?? game.phase} · ` : ""}
                {game.players.map((player, index) => (
                  <span key={player.id}>
                    {index > 0 && ", "}
                    <Link href={`/${locale}/joueurs/${player.slug}`} className="text-white/60 hover:text-orange-300">
                      {player.firstName} {player.lastName}
                    </Link>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`${card} px-4 py-6 text-center text-sm text-white/40`}>
          Aucun match programmé dans les {FRENCH_SCHEDULE_DAYS} prochains jours pour les équipes des Français.
        </p>
      )}
    </section>
  );
}

async function SeasonSection({ data, locale, liveSeason }: { data: FrenchHubData; locale: string; liveSeason: string }) {
  // Saison en cours : moyennes recalculées par hoopstats, exportables. Saisons
  // passées : chiffres officiels NBA, consultables mais pas exportés.
  const origin = playerStatsOrigin(data.season);
  const csv = isExportable([origin])
    ? {
        title: `Français en NBA · saison ${data.season} · saison régulière, par match`,
        filename: csvFilename(["francais", data.season]),
        dimension: "french_season",
        updatedAt: await tableUpdatedAt([origin]),
      }
    : undefined;
  const rows: SortableRow[] = data.seasonRows.map((row) => ({
    id: row.player.id,
    playerSlug: row.player.slug,
    firstName: row.player.firstName,
    lastName: row.player.lastName,
    position: row.player.position,
    photoUrl: row.player.photoUrl,
    teamAbbr: row.isMultiTeam ? MULTI_TEAM_ABBR : row.team.abbr,
    teamSlug: row.team.slug,
    primaryColor: row.team.primaryColor,
    secondaryColor: row.team.secondaryColor,
    gamesPlayed: row.gamesPlayed,
    pointsPerGame: row.pointsPerGame,
    reboundsPerGame: row.reboundsPerGame,
    assistsPerGame: row.assistsPerGame,
    trueShooting: row.trueShooting,
  }));
  const columns = [
    { key: "gamesPlayed" as const, label: getPlayerMetric("gamesPlayed").shortLabel, show: "sm" as const },
    { key: "pointsPerGame" as const, label: getPlayerMetric("pointsPerGame").shortLabel },
    { key: "reboundsPerGame" as const, label: getPlayerMetric("reboundsPerGame").shortLabel },
    { key: "assistsPerGame" as const, label: getPlayerMetric("assistsPerGame").shortLabel },
    { key: "trueShooting" as const, label: getPlayerMetric("trueShooting").shortLabel, show: "sm" as const },
  ];
  return (
    <section className="space-y-3">
      <SectionTitle title={`Saison ${data.season}`} aside="saison régulière, par match" />
      {rows.length > 0 ? (
        <SortablePlayerTable
          rows={rows}
          columns={columns}
          defaultSort="pointsPerGame"
          locale={locale}
          season={data.season}
          liveSeason={liveSeason}
          csv={csv}
          footerNote={`${rows.length} Français en ${data.season} · TOT : plusieurs équipes · Cliquer sur une colonne pour trier`}
        />
      ) : (
        <p className={`${card} px-4 py-6 text-center text-sm text-white/40`}>Aucun Français n&apos;a encore joué en {data.season}.</p>
      )}
    </section>
  );
}

function TrendsSection({
  data,
  trends,
  locale,
  liveSeason,
}: {
  data: FrenchHubData;
  trends: NonNullable<FrenchHubData["trends"]>;
  locale: string;
  liveSeason: string;
}) {
  const players = new Map(data.seasonRows.map((row) => [row.player.id, row.player]));
  return (
    <section className="space-y-3">
      <SectionTitle
        title="Forme récente"
        aside={
          <Link href={`/${locale}/tendances`} className="underline decoration-white/15 underline-offset-2 hover:text-white">
            {trends.window} derniers matchs contre la saison
          </Link>
        }
      />
      {trends.rows.length > 0 ? (
        <ul className={`divide-y divide-white/[0.04] ${card}`}>
          {trends.rows.map((row) => {
            const player = players.get(row.playerId);
            if (!player) return null;
            const pts = row.recent.pts - row.season.pts;
            const min = row.recent.min - row.season.min;
            return (
              <li key={row.playerId} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={playerSeasonHref(locale, player.slug, trends.season, liveSeason)}
                    className="block truncate text-sm font-medium hover:text-orange-300"
                  >
                    {player.firstName} {player.lastName}
                  </Link>
                  <span className="font-mono text-[11px] tabular-nums text-white/35">
                    {stat(row.recent.pts)} pts · saison {stat(row.season.pts)} · min{" "}
                    <span className={tone(min)}>{signed(min)}</span>
                  </span>
                </div>
                <span className={`shrink-0 font-display text-lg font-semibold tabular-nums ${tone(pts)}`}>{signed(pts)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={`${card} px-4 py-6 text-center text-sm text-white/40`}>
          Aucun Français n&apos;atteint l&apos;échantillon minimal des tendances.
        </p>
      )}
    </section>
  );
}

function HistorySection({ data, locale }: { data: FrenchHubData; locale: string }) {
  return (
    <section className="space-y-3">
      <SectionTitle title="Tous les Français de l'histoire" aside="par première saison · carrière en saison régulière" />
      <ol className={`divide-y divide-white/[0.04] ${card}`}>
        {data.history.map((row) => {
          const team = data.currentTeams[row.player.id];
          return (
            <li key={row.player.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
              <PlayerAvatar
                firstName={row.player.firstName}
                lastName={row.player.lastName}
                primaryColor={team?.primaryColor}
                secondaryColor={team?.secondaryColor}
                photoUrl={row.player.photoUrl}
                size="sm"
                showNum={false}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <Link href={`/${locale}/joueurs/${row.player.slug}`} className="text-sm font-medium leading-snug hover:text-orange-300">
                    {row.player.firstName} {row.player.lastName}
                  </Link>
                  {row.active && (
                    <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-px text-[10px] text-emerald-300">
                      {team ? team.abbr : "actif"}
                    </span>
                  )}
                </div>
                <span className="block text-[11px] text-white/35">
                  {seasonSpan(row.first, row.last)} · {row.career.seasonsPlayed} saison{row.career.seasonsPlayed > 1 ? "s" : ""} ·{" "}
                  {row.career.gamesPlayed} match{row.career.gamesPlayed > 1 ? "s" : ""}
                </span>
              </div>
              <span className="shrink-0 text-right font-mono text-[11px] tabular-nums text-white/60">
                {stat(row.career.pointsPerGame)} pts
                <span className="block text-white/30">
                  {stat(row.career.reboundsPerGame)} reb · {stat(row.career.assistsPerGame)} pd
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
