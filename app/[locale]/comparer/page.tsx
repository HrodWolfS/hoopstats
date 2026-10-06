import { Suspense } from "react";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentSeason } from "@/lib/nba";
import { Crumbs } from "@/components/ui/crumbs";
import { FadeIn } from "@/components/ui/fade-in";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { PlayerPicker } from "@/components/compare/player-picker";
import { stat, pct } from "@/lib/format";
import { getPlayerMetric } from "@/lib/stats/metrics";
import { mostRecentCommonSeason, weightedBy } from "@/lib/stats/career";
import { AnalyticsEvent } from "@/components/analytics/analytics-event";
import { ShareButton } from "@/components/analytics/share-button";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Comparer des joueurs NBA | hoopstats",
  description:
    "Compare les statistiques de deux joueurs NBA côte à côte : points, rebonds, passes, stats avancées et historique carrière.",
  alternates: { canonical: "/fr/comparer" },
  robots: { index: false, follow: true },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type PlayerWithSeasons = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  position: string | null;
  photoUrl: string | null;
  seasons: {
    season: string;
    gamesPlayed: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    stealsPerGame: number;
    blocksPerGame: number;
    fgPct: number | null;
    threePtPct: number | null;
    trueShooting: number | null;
    per: number | null;
    netRating: number | null;
    team: { abbr: string; primaryColor: string; secondaryColor: string };
  }[];
};

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function fetchPlayer(slug: string): Promise<PlayerWithSeasons | null> {
  // Carrière complète : une saison commune aux deux joueurs peut être
  // ancienne, la tronquer empêcherait de la trouver.
  return prisma.player.findUnique({
    where: { slug },
    include: {
      seasons: {
        orderBy: { season: "desc" },
        include: {
          team: {
            select: { abbr: true, primaryColor: true, secondaryColor: true },
          },
        },
      },
    },
  });
}

type SeasonRow = PlayerWithSeasons["seasons"][number];

/**
 * Regroupe les lignes d'une même saison en une seule.
 *
 * Sans cela, `seasons[0]` d'un joueur transféré désigne un passage en équipe
 * choisi arbitrairement, donc une saison partielle. Les statistiques de
 * comptage sont pondérées par les matchs ; les taux ne sont pas agrégés,
 * faute des volumes nécessaires (même politique que la page carrière).
 */
function seasonRowsBySeason(rows: readonly SeasonRow[]): Map<string, SeasonRow> {
  const bySeason = new Map<string, SeasonRow[]>();
  for (const row of rows) {
    const stints = bySeason.get(row.season);
    if (stints) stints.push(row);
    else bySeason.set(row.season, [row]);
  }

  const merged = new Map<string, SeasonRow>();
  for (const [season, stints] of bySeason) {
    if (stints.length === 1) {
      merged.set(season, stints[0]);
      continue;
    }

    const games = (row: SeasonRow) => row.gamesPlayed;
    const weighted = (value: (row: SeasonRow) => number) =>
      weightedBy(stints, games, value) ?? 0;
    const primary = [...stints].sort((a, b) => b.gamesPlayed - a.gamesPlayed)[0];

    merged.set(season, {
      ...primary,
      gamesPlayed: stints.reduce((sum, row) => sum + row.gamesPlayed, 0),
      pointsPerGame: weighted((row) => row.pointsPerGame),
      reboundsPerGame: weighted((row) => row.reboundsPerGame),
      assistsPerGame: weighted((row) => row.assistsPerGame),
      stealsPerGame: weighted((row) => row.stealsPerGame),
      blocksPerGame: weighted((row) => row.blocksPerGame),
      fgPct: null,
      threePtPct: null,
      trueShooting: null,
      per: null,
      netRating: null,
    });
  }

  return merged;
}

// ── Stat row helpers ──────────────────────────────────────────────────────────

type StatRowDef = {
  label: string;
  getValue: (
    s: PlayerWithSeasons["seasons"][number],
  ) => number | null | undefined;
  format: (v: number | null | undefined) => string;
  higherIsBetter?: boolean;
};

const STAT_ROWS: StatRowDef[] = [
  {
    label: getPlayerMetric("pointsPerGame").label,
    getValue: (s) => s.pointsPerGame,
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("reboundsPerGame").label,
    getValue: (s) => s.reboundsPerGame,
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("assistsPerGame").label,
    getValue: (s) => s.assistsPerGame,
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("stealsPerGame").label,
    getValue: (s) => s.stealsPerGame,
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("blocksPerGame").label,
    getValue: (s) => s.blocksPerGame,
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("fgPct").shortLabel,
    getValue: (s) => s.fgPct,
    format: (v) => pct(v),
  },
  {
    label: getPlayerMetric("threePtPct").shortLabel,
    getValue: (s) => s.threePtPct,
    format: (v) => pct(v),
  },
  {
    label: getPlayerMetric("trueShooting").shortLabel,
    getValue: (s) => s.trueShooting,
    format: (v) => pct(v),
  },
  {
    label: getPlayerMetric("per").shortLabel,
    getValue: (s) => s.per,
    format: (v) => stat(v),
  },
  {
    label: getPlayerMetric("netRating").shortLabel,
    getValue: (s) => s.netRating,
    format: (v) => stat(v),
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ComparerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ j1?: string; j2?: string }>;
}) {
  const { locale } = await params;
  const { j1, j2 } = await searchParams;

  // ── Empty / partial state ──────────────────────────────────────────────────
  if (!j1 || !j2) {
    const [player1Data, player2Data] = await Promise.all([
      j1 ? fetchPlayer(j1) : null,
      j2 ? fetchPlayer(j2) : null,
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
            <p className="text-white/40 text-sm">
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
          </div>
        </FadeIn>
      </div>
    );
  }

  // ── Both slugs present — fetch both ───────────────────────────────────────
  const [p1, p2] = await Promise.all([fetchPlayer(j1), fetchPlayer(j2)]);

  if (!p1 || !p2) notFound();

  // Comparer la même saison par défaut. À défaut de recouvrement, on garde la
  // dernière saison de chacun mais on l'affiche explicitement : pas de
  // substitution silencieuse (feuille de route § 0.3).
  const seasons1 = seasonRowsBySeason(p1.seasons);
  const seasons2 = seasonRowsBySeason(p2.seasons);
  const commonSeason = mostRecentCommonSeason(p1.seasons, p2.seasons);

  const s1 = commonSeason
    ? (seasons1.get(commonSeason) ?? null)
    : (seasons1.get(p1.seasons[0]?.season) ?? null);
  const s2 = commonSeason
    ? (seasons2.get(commonSeason) ?? null)
    : (seasons2.get(p2.seasons[0]?.season) ?? null);

  const seasonsDiffer = s1 != null && s2 != null && s1.season !== s2.season;

  const p1Primary = s1?.team.primaryColor ?? "#7C3AED";
  const p1Secondary = s1?.team.secondaryColor ?? "#06B6D4";
  const p2Primary = s2?.team.primaryColor ?? "#7C3AED";
  const p2Secondary = s2?.team.secondaryColor ?? "#06B6D4";

  const season = commonSeason ?? s1?.season ?? s2?.season ?? currentSeason();

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
        <div className="mb-3 flex justify-end">
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
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Player 1 card */}
          <div
            className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6 flex flex-col items-center gap-3"
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
            />
            <div className="text-center">
              <h2 className="font-display font-semibold text-xl tracking-tight">
                {p1.firstName} {p1.lastName}
              </h2>
              <p className="text-white/40 text-sm mt-0.5">
                {[s1?.team.abbr, p1.position].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center gap-1">
            <span className="font-display font-bold text-2xl text-white/20">
              VS
            </span>
          </div>

          {/* Player 2 card */}
          <div
            className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6 flex flex-col items-center gap-3"
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
            />
            <div className="text-center">
              <h2 className="font-display font-semibold text-xl tracking-tight">
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
          {/* Table header */}
          <div className="grid grid-cols-3 border-b border-white/[0.06] px-4 py-3">
            <div className="text-xs text-white/40 uppercase tracking-wider">
              {seasonsDiffer ? "STATS" : `STATS ${season}`}
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p1Primary }}
                />
                <span className="text-xs font-medium text-white/70 truncate">
                  {p1.lastName}
                </span>
              </div>
              {seasonsDiffer && (
                <span className="text-[10px] text-amber-300/70 font-mono">
                  {s1?.season}
                </span>
              )}
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p2Primary }}
                />
                <span className="text-xs font-medium text-white/70 truncate">
                  {p2.lastName}
                </span>
              </div>
              {seasonsDiffer && (
                <span className="text-[10px] text-amber-300/70 font-mono">
                  {s2?.season}
                </span>
              )}
            </div>
          </div>

          {seasonsDiffer && (
            <div className="flex items-start gap-3 border-b border-white/[0.06] bg-amber-500/[0.04] px-4 py-3">
              <span className="shrink-0 text-amber-400/70">⚠</span>
              <p className="text-xs leading-relaxed text-white/50">
                Ces deux joueurs n&apos;ont aucune saison en commun : la
                comparaison porte sur des saisons différentes, dans des
                contextes de jeu qui ne sont pas équivalents.
              </p>
            </div>
          )}

          {/* Stat rows */}
          {STAT_ROWS.map((row, i) => {
            const v1 = s1 ? row.getValue(s1) : null;
            const v2 = s2 ? row.getValue(s2) : null;
            const n1 = v1 ?? 0;
            const n2 = v2 ?? 0;
            const p1Better = n1 >= n2;
            const p2Better = n2 >= n1;
            const tied = n1 === n2;

            return (
              <div
                key={row.label}
                className={`grid grid-cols-3 items-center px-4 py-3 ${i % 2 === 1 ? "bg-white/[0.015]" : ""}`}
              >
                <div className="text-xs text-white/40">{row.label}</div>
                <div
                  className={`text-center text-sm tabular-nums ${
                    !tied && p1Better
                      ? "text-white font-semibold"
                      : "text-white/50"
                  }`}
                >
                  {row.format(v1)}
                </div>
                <div
                  className={`text-center text-sm tabular-nums ${
                    !tied && p2Better
                      ? "text-white font-semibold"
                      : "text-white/50"
                  }`}
                >
                  {row.format(v2)}
                </div>
              </div>
            );
          })}
        </div>
      </FadeIn>

      {/* ── Career history ── */}
      <FadeIn delay={0.2}>
        <h2 className="font-display font-semibold text-lg tracking-tight mb-4">
          Historique carrière
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { player: p1, color: p1Primary },
            { player: p2, color: p2Primary },
          ].map(({ player, color }) => (
            <div
              key={player.slug}
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
                    {player.seasons.map((s) => (
                      <tr
                        key={`${s.season}-${s.team.abbr}`}
                        className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition"
                      >
                        <td className="px-4 py-2 text-white/60 font-mono">
                          {s.season}
                        </td>
                        <td className="px-2 py-2 text-white/60">
                          {s.team.abbr}
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
