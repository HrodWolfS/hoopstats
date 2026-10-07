import { Suspense } from "react";
import Link from "next/link";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { currentSeason } from "@/lib/nba";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { PlayerPicker } from "@/components/compare/player-picker";
import { SeasonSelect } from "@/components/compare/season-select";
import { stat, pct } from "@/lib/format";
import { getPlayerMetric } from "@/lib/stats/metrics";
import { MULTI_TEAM_ABBR } from "@/lib/stats/career";
import { percentileLabel, percentileOf, SMALL_SAMPLE_GAMES } from "@/lib/stats/compare";
import {
  loadComparison,
  loadLeagueReference,
  loadPlayer,
  type ComparedSeason,
  type LeagueMetric,
  type LeagueReference,
} from "@/lib/stats/compare-data";
import { loadShotVolume, type ShotVolume } from "@/lib/stats/season-totals";
import { AnalyticsEvent } from "@/components/analytics/analytics-event";
import { ShareButton } from "@/components/analytics/share-button";

export const revalidate = 300;

type ComparerSearchParams = { j1?: string; j2?: string; s1?: string; s2?: string; saison?: string };

const BASE_METADATA = {
  title: "Comparer des joueurs NBA | hoopstats",
  description:
    "Compare les statistiques de deux joueurs NBA côte à côte : points, rebonds, passes, stats avancées et historique carrière.",
  alternates: { canonical: "/fr/comparer" },
  robots: { index: false, follow: true },
} satisfies Metadata;

/**
 * Adresse de la carte de partage, saisons résolues écrites en toutes
 * lettres : l'image correspond exactement à ce que la page affiche.
 */
function comparisonImageUrl(locale: string, j1: string, j2: string, s1: string, s2: string): string {
  return `/${locale}/comparer/image?${new URLSearchParams({ j1, j2, s1, s2 })}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ComparerSearchParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { j1, j2, s1, s2, saison } = await searchParams;
  if (!j1 || !j2) return BASE_METADATA;
  // Même chargement mémorisé que la page : aucune requête en plus.
  const comparison = await loadComparison(j1, j2, s1, s2, saison);
  if (!comparison?.s1 || !comparison.s2) return BASE_METADATA;
  const { p1, p2, s1: row1, s2: row2 } = comparison;
  const seasons = row1.season === row2.season ? row1.season : `${row1.season} et ${row2.season}`;
  const title = `${p1.firstName} ${p1.lastName} vs ${p2.firstName} ${p2.lastName} (${seasons}) | hoopstats`;
  const description = `Comparaison NBA ${seasons} : points, rebonds, passes, efficacité, repères de ligue et historique carrière.`;
  const image = {
    url: comparisonImageUrl(locale, p1.slug, p2.slug, row1.season, row2.season),
    width: 1200,
    height: 630,
    alt: `${p1.lastName} contre ${p2.lastName}, ${seasons}`,
  };
  return {
    ...BASE_METADATA,
    title,
    description,
    openGraph: { title, description, siteName: "hoopstats", images: [image], locale: "fr_FR", type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

type SeasonRow = ComparedSeason;

// ── Stat row helpers ──────────────────────────────────────────────────────────

type StatRowDef = {
  label: string;
  getValue: (
    s: SeasonRow,
    volume: ShotVolume | null,
  ) => number | null | undefined;
  format: (v: number | null | undefined) => string;
  /** Métrique située par rapport à la ligue (moyenne, centile). */
  metric?: LeagueMetric;
};

/**
 * Volume de jeu : affiché à côté des moyennes pour juger de leur poids, sans
 * désigner de « meilleur ». Les tentatives viennent des box scores.
 */
const VOLUME_ROWS: StatRowDef[] = [
  {
    label: "Matchs joués",
    getValue: (s) => s.gamesPlayed,
    format: (v) => (v == null ? "—" : String(v)),
  },
  {
    label: getPlayerMetric("minutesPerGame").label,
    getValue: (s) => s.minutesPerGame,
    format: (v) => stat(v),
  },
  {
    label: "Tirs tentés / match",
    getValue: (_, volume) => volume?.fgaPerGame,
    format: (v) => stat(v),
  },
  {
    label: "Tirs à 3 pts tentés / match",
    getValue: (_, volume) => volume?.threePaPerGame,
    format: (v) => stat(v),
  },
  {
    label: "Lancers francs tentés / match",
    getValue: (_, volume) => volume?.ftaPerGame,
    format: (v) => stat(v),
  },
];

const STAT_ROWS: StatRowDef[] = [
  {
    label: getPlayerMetric("pointsPerGame").label,
    getValue: (s) => s.pointsPerGame,
    metric: "pointsPerGame",
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("reboundsPerGame").label,
    getValue: (s) => s.reboundsPerGame,
    metric: "reboundsPerGame",
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("assistsPerGame").label,
    getValue: (s) => s.assistsPerGame,
    metric: "assistsPerGame",
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("stealsPerGame").label,
    getValue: (s) => s.stealsPerGame,
    metric: "stealsPerGame",
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("blocksPerGame").label,
    getValue: (s) => s.blocksPerGame,
    metric: "blocksPerGame",
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("fgPct").shortLabel,
    getValue: (s) => s.fgPct,
    metric: "fgPct",
    format: (v) => pct(v),
  },
  {
    label: getPlayerMetric("threePtPct").shortLabel,
    getValue: (s) => s.threePtPct,
    metric: "threePtPct",
    format: (v) => pct(v),
  },
  {
    label: getPlayerMetric("trueShooting").shortLabel,
    getValue: (s) => s.trueShooting,
    metric: "trueShooting",
    format: (v) => pct(v),
  },
  {
    label: getPlayerMetric("per").shortLabel,
    getValue: (s) => s.per,
    metric: "per",
    format: (v) => pct(v),
  },
  {
    label: getPlayerMetric("netRating").shortLabel,
    getValue: (s) => s.netRating,
    metric: "netRating",
    format: (v) => stat(v),
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ComparerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ComparerSearchParams>;
}) {
  const { locale } = await params;
  const { j1, j2, s1: requested1, s2: requested2, saison } = await searchParams;

  // ── Empty / partial state ──────────────────────────────────────────────────
  if (!j1 || !j2) {
    const [player1Data, player2Data] = await Promise.all([
      j1 ? loadPlayer(j1) : null,
      j2 ? loadPlayer(j2) : null,
    ]);

    const p1Color = player1Data?.seasons[0]?.team.primaryColor ?? null;
    const p2Color = player2Data?.seasons[0]?.team.primaryColor ?? null;

    return (
      <div className="space-y-6">
        {(j1 || j2) && (
          <AnalyticsEvent
            event="comparison"
            dimension="incomplete"
            dedupeKey={`comparison:${j1 ?? "none"}:${j2 ?? "none"}`}
          />
        )}
        <FadeIn>
          <Crumbs
            items={[
              { label: "Accueil", href: `/${locale}` },
              { label: "Comparer" },
            ]}
          />
          <div className="mt-4">
            <h1 className="font-display font-semibold text-4xl md:text-5xl tracking-[-0.03em] mb-2">
              Comparer
            </h1>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="flex flex-col items-center gap-8 py-16">
            <p className="text-white/40 text-sm text-center">
              Sélectionne deux joueurs pour les comparer
            </p>
            <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
              <div>
                <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">
                  Joueur 1
                </div>
                <Suspense
                  fallback={
                    <div className="h-10 rounded-xl bg-white/[0.03] animate-pulse" />
                  }
                >
                  <PlayerPicker
                    slot="j1"
                    currentSlug={j1 ?? null}
                    currentName={
                      player1Data
                        ? `${player1Data.firstName} ${player1Data.lastName}`
                        : null
                    }
                    primaryColor={p1Color}
                    otherSlug={j2 ?? null}
                    locale={locale}
                  />
                </Suspense>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">
                  Joueur 2
                </div>
                <Suspense
                  fallback={
                    <div className="h-10 rounded-xl bg-white/[0.03] animate-pulse" />
                  }
                >
                  <PlayerPicker
                    slot="j2"
                    currentSlug={j2 ?? null}
                    currentName={
                      player2Data
                        ? `${player2Data.firstName} ${player2Data.lastName}`
                        : null
                    }
                    primaryColor={p2Color}
                    otherSlug={j1 ?? null}
                    locale={locale}
                  />
                </Suspense>
              </div>
            </div>
            {(player1Data ?? player2Data) && (() => {
              const alone = (player1Data ?? player2Data)!;
              return (
                <Link
                  href={`/${locale}/comparer?j1=${alone.slug}&j2=${alone.slug}`}
                  className="text-sm text-white/50 underline underline-offset-4 transition hover:text-white/80"
                >
                  Ou comparer {alone.firstName} {alone.lastName} à lui-même sur deux saisons
                </Link>
              );
            })()}
          </div>
        </FadeIn>
      </div>
    );
  }

  // ── Both slugs present — fetch both ───────────────────────────────────────
  const comparison = await loadComparison(j1, j2, requested1, requested2, saison);
  if (!comparison) notFound();
  const { p1, p2, seasons1, seasons2, samePlayer, choice, s1, s2 } = comparison;
  const [volume1, volume2, league1, league2] = await Promise.all([
    s1 ? loadShotVolume(p1.id, s1.season) : null,
    s2 ? loadShotVolume(p2.id, s2.season) : null,
    s1 ? loadLeagueReference(s1.season) : null,
    s2 ? loadLeagueReference(s2.season) : null,
  ]);

  const seasonsDiffer = s1 != null && s2 != null && s1.season !== s2.season;
  // Saison commune la plus proche du choix : celle du joueur 2, sinon celle du joueur 1.
  const alignSeason =
    samePlayer || !s1 || !s2
      ? null
      : seasons1.has(s2.season)
        ? s2.season
        : seasons2.has(s1.season)
          ? s1.season
          : null;
  const seasonList1 = [...seasons1.keys()].reverse();
  const seasonList2 = [...seasons2.keys()].reverse();

  const p1Primary = s1?.team.primaryColor ?? "#7C3AED";
  const p1Secondary = s1?.team.secondaryColor ?? "#06B6D4";
  const p2Primary = s2?.team.primaryColor ?? "#7C3AED";
  const p2Secondary = s2?.team.secondaryColor ?? "#06B6D4";

  const season = s1?.season ?? s2?.season ?? currentSeason();
  const sides = [
    { slot: "j1" as const, player: p1, row: s1, color: p1Primary },
    { slot: "j2" as const, player: p2, row: s2, color: p2Primary },
  ];
  const noVolume = (volume1 === null && s1) || (volume2 === null && s2);

  return (
    <div className="space-y-8">
      {(j1 || j2) && (
        <AnalyticsEvent
          event="comparison"
          dimension={j1 && j2 ? "complete" : "incomplete"}
          dedupeKey={`comparison:${j1 ?? "none"}:${j2 ?? "none"}`}
        />
      )}
      <FadeIn>
        <div className="mb-3 flex justify-end gap-2">
          {s1 && s2 && (
            <a
              href={comparisonImageUrl(locale, p1.slug, p2.slug, s1.season, s2.season)}
              download={`hoopstats-${p1.slug}-${s1.season}-vs-${p2.slug}-${s2.season}.png`}
              className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-white/45 transition hover:text-white"
            >
              Image
            </a>
          )}
          <ShareButton dimension="comparison" />
        </div>
        <Crumbs
          items={[
            { label: "Accueil", href: `/${locale}` },
            { label: "Comparer" },
          ]}
        />
      </FadeIn>

      {/* ── Pickers ── */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">
              Joueur 1
            </div>
            <Suspense
              fallback={
                <div className="h-10 rounded-xl bg-white/[0.03] animate-pulse" />
              }
            >
              <PlayerPicker
                slot="j1"
                currentSlug={j1}
                currentName={`${p1.firstName} ${p1.lastName}`}
                primaryColor={p1Primary}
                otherSlug={j2}
                locale={locale}
              />
            </Suspense>
          </div>
          <div>
            <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">
              Joueur 2
            </div>
            <Suspense
              fallback={
                <div className="h-10 rounded-xl bg-white/[0.03] animate-pulse" />
              }
            >
              <PlayerPicker
                slot="j2"
                currentSlug={j2}
                currentName={`${p2.firstName} ${p2.lastName}`}
                primaryColor={p2Primary}
                otherSlug={j1}
                locale={locale}
              />
            </Suspense>
          </div>
        </div>
      </FadeIn>

      {/* ── Player header cards ── */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
          {/* Player 1 card */}
          <div
            className="min-w-0 rounded-2xl border border-white/[0.06] bg-[#111114] p-3 sm:p-6 flex flex-col items-center gap-3"
            style={{ borderTop: `3px solid ${p1Primary}` }}
          >
            <PlayerAvatar
              firstName={p1.firstName}
              lastName={p1.lastName}
              primaryColor={p1Primary}
              secondaryColor={p1Secondary}
              photoUrl={p1.photoUrl}
              size="xl"
              showNum={false}
              className="max-sm:[&>div]:h-20 max-sm:[&>div]:w-20 max-sm:[&>div]:text-2xl"
            />
            <div className="text-center">
              <h2 className="font-display font-semibold text-base sm:text-xl tracking-tight break-words">
                {p1.firstName} {p1.lastName}
              </h2>
              <p className="text-white/40 text-sm mt-0.5">
                {[s1?.team.abbr, p1.position].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1">
            <span className="font-display font-bold text-lg sm:text-2xl text-white/20">
              VS
            </span>
          </div>

          {/* Player 2 card */}
          <div
            className="min-w-0 rounded-2xl border border-white/[0.06] bg-[#111114] p-3 sm:p-6 flex flex-col items-center gap-3"
            style={{ borderTop: `3px solid ${p2Primary}` }}
          >
            <PlayerAvatar
              firstName={p2.firstName}
              lastName={p2.lastName}
              primaryColor={p2Primary}
              secondaryColor={p2Secondary}
              photoUrl={p2.photoUrl}
              size="xl"
              showNum={false}
              className="max-sm:[&>div]:h-20 max-sm:[&>div]:w-20 max-sm:[&>div]:text-2xl"
            />
            <div className="text-center">
              <h2 className="font-display font-semibold text-base sm:text-xl tracking-tight break-words">
                {p2.firstName} {p2.lastName}
              </h2>
              <p className="text-white/40 text-sm mt-0.5">
                {[s2?.team.abbr, p2.position].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* ── Comparison table ── */}
      <FadeIn delay={0.15}>
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden">
          {/* Table header : saison choisie de chaque côté */}
          <div className="grid grid-cols-3 gap-2 border-b border-white/[0.06] px-4 py-3">
            <div className="self-center text-xs text-white/40 uppercase tracking-wider">
              {seasonsDiffer ? "Stats" : `Stats ${season}`}
            </div>
            {sides.map(({ slot, player, row, color }) => {
              const other = slot === "j1" ? s2 : s1;
              return (
                <div key={slot} className="flex min-w-0 flex-col items-center gap-1.5">
                  <div className="flex max-w-full items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="truncate text-xs font-medium text-white/70">{player.lastName}</span>
                  </div>
                  {row && (
                    <Suspense fallback={<div className="h-9 w-full rounded-lg bg-white/[0.03]" />}>
                      <SeasonSelect
                        slot={slot}
                        seasons={slot === "j1" ? seasonList1 : seasonList2}
                        value={row.season}
                        otherValue={other?.season ?? null}
                        otherSeasons={slot === "j1" ? seasonList2 : seasonList1}
                        samePlayer={samePlayer}
                        label={`Saison de ${player.firstName} ${player.lastName}`}
                      />
                    </Suspense>
                  )}
                  {row && row.gamesPlayed < SMALL_SAMPLE_GAMES && (
                    <span className="text-center text-[10px] leading-tight text-amber-300/80">
                      Échantillon faible ({row.gamesPlayed} match{row.gamesPlayed > 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {choice.unavailable.map(({ slot, season: missing }) => {
            const player = slot === "j1" ? p1 : p2;
            const shown = slot === "j1" ? s1 : s2;
            return (
              <div key={slot} className="flex items-start gap-3 border-b border-white/[0.06] bg-amber-500/[0.04] px-4 py-3">
                <span className="shrink-0 text-amber-400/70">⚠</span>
                <p className="text-xs leading-relaxed text-white/50">
                  {player.firstName} {player.lastName} n&apos;a pas joué en {missing}
                  {shown ? ` : saison ${shown.season} affichée à la place.` : "."}
                </p>
              </div>
            );
          })}

          {seasonsDiffer && !samePlayer && (
            <div className="flex items-start gap-3 border-b border-white/[0.06] bg-amber-500/[0.04] px-4 py-3">
              <span className="shrink-0 text-amber-400/70">⚠</span>
              <p className="text-xs leading-relaxed text-white/50">
                Saisons différentes : {s1?.season} contre {s2?.season}. Les contextes de jeu ne sont pas
                équivalents.{" "}
                {alignSeason ? (
                  <Link
                    href={`/${locale}/comparer?j1=${p1.slug}&j2=${p2.slug}&s1=${alignSeason}&s2=${alignSeason}`}
                    scroll={false}
                    className="text-white/70 underline underline-offset-2 hover:text-white"
                  >
                    Comparer les deux en {alignSeason}
                  </Link>
                ) : (
                  "Ces deux joueurs n'ont aucune saison en commun."
                )}
              </p>
            </div>
          )}

          <SectionLabel>Moyennes par match</SectionLabel>
          <StatRows
            rows={STAT_ROWS}
            left={s1}
            right={s2}
            volumes={[volume1, volume2]}
            leagues={[league1, league2]}
            highlight
          />
          <p className="border-b border-white/[0.06] px-4 py-2.5 text-[11px] leading-relaxed text-white/35">
            Ligue : moyenne des joueurs qualifiés de la saison. Centile : part de ces joueurs
            que la valeur dépasse. Seuils de qualification des classements,{" "}
            <Link
              href={`/${locale}/sources#metriques`}
              className="underline decoration-white/20 underline-offset-2 hover:text-white/70"
            >
              voir la méthode
            </Link>
            .
          </p>
          <SectionLabel>Volume de jeu</SectionLabel>
          <StatRows rows={VOLUME_ROWS} left={s1} right={s2} volumes={[volume1, volume2]} />
          {noVolume && (
            <p className="border-t border-white/[0.06] px-4 py-3 text-[11px] leading-relaxed text-white/35">
              Tentatives de tir calculées sur les feuilles de match, disponibles en base
              uniquement pour les saisons récentes.
            </p>
          )}
        </div>
      </FadeIn>

      {/* ── Career history ── */}
      <FadeIn delay={0.2}>
        <h2 className="font-display font-semibold text-lg tracking-tight mb-4">
          Historique carrière
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(samePlayer
            ? [{ player: p1, color: p1Primary, seasons: seasons1, selected: [s1?.season, s2?.season], slotKey: "j1" }]
            : [
                { player: p1, color: p1Primary, seasons: seasons1, selected: [s1?.season], slotKey: "j1" },
                { player: p2, color: p2Primary, seasons: seasons2, selected: [s2?.season], slotKey: "j2" },
              ]
          ).map(({ player, color, seasons, selected, slotKey }) => (
            <div
              key={`${player.slug}-${slotKey}`}
              className="rounded-2xl border border-white/[0.06] bg-[#111114] overflow-hidden"
            >
              <div
                className="px-4 py-3 border-b border-white/[0.06]"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <span className="text-sm font-medium text-white">
                  {player.firstName} {player.lastName}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-4 py-2 text-white/40 font-normal">
                        Saison
                      </th>
                      <th className="text-left px-2 py-2 text-white/40 font-normal">
                        Équipe
                      </th>
                      <th className="text-right px-2 py-2 text-white/40 font-normal">
                        MJ
                      </th>
                      <th className="text-right px-2 py-2 text-white/40 font-normal">
                        PTS
                      </th>
                      <th className="text-right px-2 py-2 text-white/40 font-normal">
                        REB
                      </th>
                      <th className="text-right px-2 py-2 text-white/40 font-normal">
                        PAS
                      </th>
                      <th className="text-right px-4 py-2 text-white/40 font-normal">
                        TS%
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Une ligne par saison, la plus récente en tête. */}
                    {[...seasons.values()].reverse().map((s) => (
                      <tr
                        key={s.season}
                        aria-current={selected.includes(s.season) ? "true" : undefined}
                        className={`border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition ${
                          selected.includes(s.season) ? "bg-white/[0.04]" : ""
                        }`}
                      >
                        <td className="px-4 py-2 text-white/60 font-mono">
                          {s.season}
                        </td>
                        <td
                          className="px-2 py-2 text-white/60"
                          title={
                            s.isMultiTeam
                              ? s.stints
                                  .map((stint) => stint.team.abbr)
                                  .join(", ")
                              : undefined
                          }
                        >
                          {s.isMultiTeam ? MULTI_TEAM_ABBR : s.team.abbr}
                        </td>
                        <td className="px-2 py-2 text-right text-white/80 tabular-nums">
                          {s.gamesPlayed}
                        </td>
                        <td className="px-2 py-2 text-right text-white/80 tabular-nums">
                          {stat(s.pointsPerGame)}
                        </td>
                        <td className="px-2 py-2 text-right text-white/80 tabular-nums">
                          {stat(s.reboundsPerGame)}
                        </td>
                        <td className="px-2 py-2 text-right text-white/80 tabular-nums">
                          {stat(s.assistsPerGame)}
                        </td>
                        <td className="px-4 py-2 text-right text-white/80 tabular-nums">
                          {pct(s.trueShooting)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-white/[0.04] bg-white/[0.02] px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/30">
      {children}
    </div>
  );
}

function StatRows({
  rows,
  left,
  right,
  volumes,
  leagues = [null, null],
  highlight = false,
}: {
  rows: StatRowDef[];
  left: SeasonRow | null;
  right: SeasonRow | null;
  volumes: [ShotVolume | null, ShotVolume | null];
  /** Repères de ligue de la saison de chaque côté. */
  leagues?: [LeagueReference | null, LeagueReference | null];
  /** Met en avant la meilleure valeur ; jamais pour le volume de jeu. */
  highlight?: boolean;
}) {
  return rows.map((row, i) => {
    const v1 = left ? row.getValue(left, volumes[0]) : null;
    const v2 = right ? row.getValue(right, volumes[1]) : null;
    // Égalité jugée sur la valeur affichée : pas de gras pour « 0.6 » contre « 0.6 ».
    const comparable = highlight && v1 != null && v2 != null && row.format(v1) !== row.format(v2);
    const cell = (value: number | null | undefined, wins: boolean) =>
      `text-center text-sm tabular-nums ${comparable && wins ? "text-white font-semibold" : value == null ? "text-white/25" : "text-white/60"}`;
    const distributions = row.metric
      ? [leagues[0]?.[row.metric] ?? null, leagues[1]?.[row.metric] ?? null]
      : [null, null];
    const higherIsBetter = row.metric ? getPlayerMetric(row.metric).higherIsBetter : true;
    const percentile = (value: number | null | undefined, side: 0 | 1) => {
      const distribution = distributions[side];
      if (value == null || !distribution) return null;
      return (
        <span className="mt-0.5 block text-[10px] font-normal leading-tight text-white/30">
          {percentileLabel(percentileOf(distribution, value, higherIsBetter))}
        </span>
      );
    };
    // Une seule moyenne si les deux côtés portent sur la même saison, sinon
    // une par côté, dans l'ordre des colonnes.
    const sameSeason = left?.season === right?.season;
    const shown = sameSeason ? distributions.slice(0, 1) : distributions;
    const averages = shown.some((distribution) => distribution != null)
      ? shown.map((distribution) => (distribution ? row.format(distribution.average) : "—"))
      : [];
    return (
      <div
        key={row.label}
        className={`grid grid-cols-3 items-center gap-2 px-4 py-3 ${i % 2 === 1 ? "bg-white/[0.015]" : ""}`}
      >
        <div className="text-xs text-white/40">
          {row.label}
          {averages.length > 0 && (
            <span className="mt-0.5 block text-[10px] leading-tight text-white/30">
              Ligue : {averages.join(" / ")}
            </span>
          )}
        </div>
        <div className={cell(v1, comparable && v1! > v2!)}>
          {row.format(v1)}
          {percentile(v1, 0)}
        </div>
        <div className={cell(v2, comparable && v2! > v1!)}>
          {row.format(v2)}
          {percentile(v2, 1)}
        </div>
      </div>
    );
  });
}
