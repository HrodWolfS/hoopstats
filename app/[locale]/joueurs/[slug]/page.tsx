import { notFound } from "next/navigation";
import { isSeasonParam } from "@/lib/query-routes";
import { type Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { accentOnDark } from "@/lib/color";
import { currentSeason } from "@/lib/nba";
import { stat, pct } from "@/lib/format";
import { Crumbs } from "@/components/ui/crumbs";
import { PlayerHeader } from "@/components/player/player-header";
import { MULTI_TEAM_ABBR } from "@/lib/stats/season-consolidation";
import {
  consolidatePlayerCareer,
  consolidateSeasonRows,
  loadPlayerSeasonTotals,
} from "@/lib/stats/season-totals";
import { PlayerTabs } from "@/components/player/player-tabs";
import {
  PlayerRadarChart,
  type RadarStat,
} from "@/components/player/player-radar";
import type { CareerSeason } from "@/components/player/career-view";
import type { AdvancedSeason } from "@/components/player/advanced-view";
import type { PlayerGameLog } from "@/components/player/game-log-view";
import { calculateMetricContext } from "@/lib/stats/context";
import { getPlayerMetric, type PlayerMetricKey } from "@/lib/stats/metrics";
import { findSimilarPlayers } from "@/lib/stats/player-similarity";
import { buildPlayerInsights } from "@/lib/stats/player-insights";
import {
  PlayerInsights,
  SimilarPlayers,
  type SimilarPlayerCard,
} from "@/components/player/player-context-sections";
import { ShareButton } from "@/components/analytics/share-button";
import { REGULAR_SEASON_PHASE } from "@/lib/season-phase";
import { SourceNote } from "@/components/ui/source-note";
import { playerStatsOrigin } from "@/lib/data-sources";

export const revalidate = 21600;

// Plus de 500 joueurs : aucun n'est pré-rendu au build, chacun est généré à la
// première visite puis gardé en cache (ISR) au lieu d'être rendu à chaque visite.
export function generateStaticParams() {
  return [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retourne la liste des positions comparables pour un groupe. */
function positionGroup(pos: string | null): string[] | undefined {
  if (!pos) return undefined;
  const p = pos.toUpperCase();
  if (p === "C" || p.startsWith("C-") || p === "F-C")
    return ["C", "C-F", "F-C"];
  if (
    p === "G" ||
    p === "PG" ||
    p === "SG" ||
    p.startsWith("G-") ||
    p === "F-G"
  )
    return ["G", "PG", "SG", "G-F", "F-G"];
  return ["F", "SF", "PF", "F-G", "G-F", "F-C"];
}

function positionLabel(pos: string | null): string {
  if (!pos) return "joueurs NBA";
  const p = pos.toUpperCase();
  if (p === "C" || p.startsWith("C-") || p === "F-C") return "pivots NBA";
  if (p === "G" || p === "PG" || p === "SG" || p.startsWith("G-"))
    return "meneurs/arrières NBA";
  return "ailiers NBA";
}

function radarContext(
  metricKey: PlayerMetricKey,
  values: readonly (number | null | undefined)[],
  target: number | null | undefined,
): Pick<RadarStat, "rank" | "total" | "percentile"> {
  const context = calculateMetricContext(
    values,
    target,
    getPlayerMetric(metricKey).higherIsBetter,
  );
  return {
    rank: context.rank ?? 0,
    total: context.total,
    percentile: context.percentile ?? 0,
  };
}

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hoopstats.fr";

  const player = await prisma.player.findUnique({
    where: { slug },
    select: {
      firstName: true,
      lastName: true,
      position: true,
      photoUrl: true,
      summaryFr: true,
      seasons: {
        orderBy: { season: "desc" },
        take: 1,
        include: {
          team: { select: { city: true, name: true, abbr: true } },
        },
      },
    },
  });
  if (!player) return {};

  const latest = player.seasons[0];
  const nameFull = `${player.firstName} ${player.lastName}`;

  // Description longue traîne avec stats réelles
  let description: string;
  if (player.summaryFr) {
    description = player.summaryFr.slice(0, 160);
  } else {
    const parts: string[] = [];
    if (latest?.pointsPerGame) parts.push(`${stat(latest.pointsPerGame)} pts`);
    if (latest?.reboundsPerGame)
      parts.push(`${stat(latest.reboundsPerGame)} rbds`);
    if (latest?.assistsPerGame)
      parts.push(`${stat(latest.assistsPerGame)} ast`);

    const teamStr = latest?.team
      ? `, ${latest.team.city} ${latest.team.name}`
      : "";
    const statStr =
      parts.length > 0
        ? ` — ${parts.join(", ")} par match en ${latest?.season}`
        : "";

    description = `Stats NBA de ${nameFull}${player.position ? ` (${player.position}${teamStr})` : ""}${statStr}. Stats carrière complète, historique saisons et stats avancées.`;
  }

  const title = `${nameFull} — Stats NBA, carrière et stats avancées | hoopstats`;

  return {
    title,
    description,
    alternates: { canonical: `/${locale}/joueurs/${slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE}/fr/joueurs/${slug}`,
      siteName: "hoopstats",
      images: player.photoUrl
        ? [{ url: player.photoUrl, width: 400, height: 400 }]
        : [],
      locale: "fr_FR",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: player.photoUrl ? [player.photoUrl] : [],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; saison?: string }>;
}) {
  const { locale, slug, saison } = await params;
  if (saison !== undefined && !isSeasonParam(saison)) notFound();
  const season = saison ?? currentSeason();

  const player = await prisma.player.findUnique({
    where: { slug },
    include: {
      seasons: {
        include: { team: true },
        orderBy: { season: "asc" },
      },
    },
  });
  if (!player) notFound();

  // Une ligne par saison : un joueur transféré n'est pas réduit à l'un de
  // ses passages (bandeau, radar, joueurs similaires, stats avancées).
  const [{ seasons: consolidatedSeasons, exactBySeason }, totalsBySeason] =
    await Promise.all([
      consolidatePlayerCareer(player.seasons),
      loadPlayerSeasonTotals(player.id),
    ]);
  const seasonRow =
    consolidatedSeasons.find((s) => s.season === season) ??
    consolidatedSeasons[consolidatedSeasons.length - 1] ??
    null;

  const gameRows = seasonRow
    ? await prisma.playerBoxScore.findMany({
        where: {
          playerId: player.id,
          didNotPlay: false,
          // Même périmètre que les moyennes de saison : saison régulière seule.
          game: {
            season: seasonRow.season,
            status: "final",
            phase: REGULAR_SEASON_PHASE,
          },
        },
        include: {
          game: {
            include: {
              homeTeam: { select: { abbr: true, slug: true } },
              awayTeam: { select: { abbr: true, slug: true } },
            },
          },
        },
        orderBy: { game: { gameDate: "desc" } },
      })
    : [];

  // Saison transférée : l'équipe du dernier match joué, pas celle du plus
  // grand nombre de matchs.
  const lastTeamAbbr = gameRows[0]?.teamAbbr;
  const currentTeam =
    seasonRow?.stints.find((stint) => stint.team.abbr === lastTeamAbbr)?.team ??
    seasonRow?.team ??
    null;
  const primaryColor = currentTeam?.primaryColor ?? "#7C3AED";
  const secondaryColor = currentTeam?.secondaryColor ?? "#06B6D4";
  // Version lisible sur fond sombre, pour les textes et les tracés.
  const accentColor = accentOnDark(primaryColor);

  const gameLogs: PlayerGameLog[] = gameRows.map((row) => {
    const home = row.teamAbbr === row.game.homeTeam.abbr;
    const teamScore = home ? row.game.homeScore : row.game.awayScore;
    const opponentScore = home ? row.game.awayScore : row.game.homeScore;
    const opponent = home ? row.game.awayTeam : row.game.homeTeam;
    return {
      id: row.gameId,
      date: row.game.gameDate.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "Europe/Paris",
      }),
      opponent: opponent.abbr,
      opponentSlug: opponent.slug,
      home,
      won: (teamScore ?? 0) > (opponentScore ?? 0),
      minutes: row.minutes,
      pts: row.pts,
      reb: row.reb,
      ast: row.ast,
      plusMinus: row.plusMinus,
    };
  });

  // ── Radar : percentiles par position ─────────────────────────────────────

  const posGroup = positionGroup(player.position);

  // Pairs regroupés eux aussi : le seuil de 15 matchs vaut pour la saison
  // entière, et un joueur transféré ne figure qu'une fois.
  const peerStints = seasonRow
    ? await prisma.playerSeason.findMany({
        where: {
          season: seasonRow.season,
          ...(posGroup ? { player: { position: { in: posGroup } } } : {}),
        },
        select: {
          id: true,
          playerId: true,
          gamesPlayed: true,
          pointsPerGame: true,
          reboundsPerGame: true,
          assistsPerGame: true,
          stealsPerGame: true,
          blocksPerGame: true,
          trueShooting: true,
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              slug: true,
              photoUrl: true,
            },
          },
          team: {
            select: {
              abbr: true,
              primaryColor: true,
              secondaryColor: true,
            },
          },
        },
      })
    : [];
  const peers = seasonRow
    ? (await consolidateSeasonRows(seasonRow.season, peerStints)).filter(
        (peer) => peer.gamesPlayed >= 15,
      )
    : [];

  const radarStats: RadarStat[] = seasonRow
    ? [
        {
          key: "PTS",
          label: "Points",
          value: stat(seasonRow.pointsPerGame),
          ...radarContext(
            "pointsPerGame",
            peers.map((p) => p.pointsPerGame),
            seasonRow.pointsPerGame,
          ),
        },
        {
          key: "REB",
          label: "Rebonds",
          value: stat(seasonRow.reboundsPerGame),
          ...radarContext(
            "reboundsPerGame",
            peers.map((p) => p.reboundsPerGame),
            seasonRow.reboundsPerGame,
          ),
        },
        {
          key: "AST",
          label: "Passes",
          value: stat(seasonRow.assistsPerGame),
          ...radarContext(
            "assistsPerGame",
            peers.map((p) => p.assistsPerGame),
            seasonRow.assistsPerGame,
          ),
        },
        {
          key: "TS%",
          label: "True Shooting",
          value:
            seasonRow.trueShooting != null
              ? `${pct(seasonRow.trueShooting)}%`
              : "—",
          ...radarContext(
            "trueShooting",
            peers
              .filter((p) => p.trueShooting != null)
              .map((p) => p.trueShooting!),
            seasonRow.trueShooting,
          ),
        },
        {
          key: "STL",
          label: "Interceptions",
          value: stat(seasonRow.stealsPerGame),
          ...radarContext(
            "stealsPerGame",
            peers.map((p) => p.stealsPerGame),
            seasonRow.stealsPerGame,
          ),
        },
        {
          key: "BLK",
          label: "Contres",
          value: stat(seasonRow.blocksPerGame),
          ...radarContext(
            "blocksPerGame",
            peers.map((p) => p.blocksPerGame),
            seasonRow.blocksPerGame,
          ),
        },
      ]
    : [];

  const similarityResults = seasonRow
    ? findSimilarPlayers(
        {
          id: seasonRow.id,
          values: [
            seasonRow.pointsPerGame,
            seasonRow.reboundsPerGame,
            seasonRow.assistsPerGame,
            seasonRow.stealsPerGame,
            seasonRow.blocksPerGame,
            seasonRow.trueShooting,
          ],
        },
        peers
          .filter((peer) => peer.player.id !== player.id)
          .map((peer) => ({
            id: peer.id,
            values: [
              peer.pointsPerGame,
              peer.reboundsPerGame,
              peer.assistsPerGame,
              peer.stealsPerGame,
              peer.blocksPerGame,
              peer.trueShooting,
            ],
          })),
        10,
      )
    : [];
  const similarityById = new Map(
    similarityResults.map((result) => [result.id, result.similarity]),
  );
  const seenSimilarPlayers = new Set<string>();
  const similarPlayers: SimilarPlayerCard[] = peers
    .filter((peer) => similarityById.has(peer.id))
    .sort(
      (left, right) =>
        (similarityById.get(right.id) ?? 0) -
        (similarityById.get(left.id) ?? 0),
    )
    .filter((peer) => {
      if (seenSimilarPlayers.has(peer.player.id)) return false;
      seenSimilarPlayers.add(peer.player.id);
      return true;
    })
    .map((peer) => ({
      id: peer.player.id,
      slug: peer.player.slug,
      firstName: peer.player.firstName,
      lastName: peer.player.lastName,
      photoUrl: peer.player.photoUrl,
      teamAbbr: peer.isMultiTeam ? MULTI_TEAM_ABBR : peer.team.abbr,
      primaryColor: peer.team.primaryColor,
      secondaryColor: peer.team.secondaryColor,
      similarity: similarityById.get(peer.id)!,
    }))
    .slice(0, 4);
  const playerInsights = buildPlayerInsights(
    radarStats.map((item) => ({
      label: item.label,
      percentile: item.percentile,
      value: item.value,
    })),
    positionLabel(player.position),
  );

  // ── Adapter les types pour les composants ─────────────────────────────────

  // Lignes brutes : la vue carrière fusionne elle-même les transferts, avec
  // les pourcentages exacts des box scores.
  const careerShooting = Object.fromEntries(
    [...exactBySeason].map(([careerSeason, exact]) => [
      careerSeason,
      { fgPct: exact.fgPct, threePtPct: exact.threePtPct, ftPct: exact.ftPct },
    ]),
  );
  const seasonTotals = Object.fromEntries(totalsBySeason);
  const career: CareerSeason[] = player.seasons.map((ps) => ({
    season: ps.season,
    teamAbbr: ps.team.abbr,
    gamesPlayed: ps.gamesPlayed,
    minutesPerGame: ps.minutesPerGame,
    pointsPerGame: ps.pointsPerGame,
    reboundsPerGame: ps.reboundsPerGame,
    assistsPerGame: ps.assistsPerGame,
    stealsPerGame: ps.stealsPerGame,
    blocksPerGame: ps.blocksPerGame,
    fgPct: ps.fgPct,
    threePtPct: ps.threePtPct,
    ftPct: ps.ftPct,
  }));

  const advanced: AdvancedSeason[] = consolidatedSeasons.map((ps) => ({
    season: ps.season,
    teamAbbr: ps.isMultiTeam ? MULTI_TEAM_ABBR : ps.team.abbr,
    gamesPlayed: ps.gamesPlayed,
    trueShooting: ps.trueShooting,
    usageRate: ps.usageRate,
    per: ps.per,
    offRating: ps.offRating ?? null,
    defRating: ps.defRating ?? null,
    netRating: ps.netRating ?? null,
  }));

  // ── JSON-LD enrichi ───────────────────────────────────────────────────────

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hoopstats.fr";
  const playerUrl = `${BASE_URL}/${locale}/joueurs/${slug}`;

  const jsonLdPerson: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: `${player.firstName} ${player.lastName}`,
    url: playerUrl,
    sport: "Basketball",
    jobTitle: "Joueur NBA",
    ...(player.photoUrl && { image: player.photoUrl }),
    ...(player.summaryFr && { description: player.summaryFr }),
    ...(player.country && { nationality: player.country }),
    ...(player.birthDate && {
      birthDate: player.birthDate.toISOString().split("T")[0],
    }),
    ...(player.height && { height: player.height }),
    ...(player.weight && { weight: player.weight }),
    ...(currentTeam && {
      memberOf: {
        "@type": "SportsTeam",
        name: `${currentTeam.city} ${currentTeam.name}`,
        sport: "Basketball",
        memberOf: { "@type": "SportsOrganization", name: "NBA" },
      },
    }),
  };

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: `${BASE_URL}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Joueurs",
        item: `${BASE_URL}/${locale}/joueurs`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${player.firstName} ${player.lastName}`,
        item: playerUrl,
      },
    ],
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between gap-4">
        <Crumbs
          items={[
            { label: "Accueil", href: `/${locale}` },
            { label: "Joueurs", href: `/${locale}/joueurs` },
            { label: `${player.firstName} ${player.lastName}` },
          ]}
        />
        <ShareButton dimension="player_profile" />
      </div>

      <PlayerHeader
        firstName={player.firstName}
        lastName={player.lastName}
        position={player.position}
        country={player.country}
        teamCity={currentTeam?.city ?? null}
        teamName={currentTeam?.name ?? null}
        teamAbbr={currentTeam?.abbr ?? null}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        photoUrl={player.photoUrl}
        summaryFr={player.summaryFr}
        wikipediaUrlFr={player.wikipediaUrlFr}
        photoAttribution={player.photoAttribution}
        season={season}
        statsSeason={seasonRow?.season ?? null}
        ppg={seasonRow?.pointsPerGame ?? null}
        rpg={seasonRow?.reboundsPerGame ?? null}
        apg={seasonRow?.assistsPerGame ?? null}
        tsPct={seasonRow?.trueShooting ?? null}
      />

      {/* Radar chart — percentiles vs même position */}
      {radarStats.length > 0 && (
        <section className="grid grid-cols-12 gap-y-6 lg:gap-x-6 items-start">
          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
              <PlayerRadarChart
                stats={radarStats}
                color={accentColor}
                positionLabel={positionLabel(player.position)}
                season={seasonRow?.season ?? season}
              />
            </div>
          </div>

          {/* Légende détaillée */}
          <div className="col-span-12 lg:col-span-7 self-stretch">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6 h-full">
              {/* Header */}
              <div className="flex items-baseline justify-between mb-5">
                <p className="text-[10px] text-white/30 uppercase tracking-[0.18em] font-medium">
                  Profil statistique · {seasonRow?.season ?? season}
                </p>
                <p className="text-[10px] text-white/20 font-mono">
                  vs {positionLabel(player.position)}
                </p>
              </div>

              {/* Colonne headers */}
              {/* En-têtes de colonnes dès sm seulement : sur mobile, chaque
                  stat tient sur deux lignes (libellé, valeur, rang, puis la
                  barre en pleine largeur) et se lit sans légende. */}
              <div className="hidden sm:flex items-center gap-4 mb-3 pb-2 border-b border-white/[0.04]">
                <span className="w-8 shrink-0" />
                <span className="text-[9px] text-white/20 font-mono uppercase tracking-wider w-28 shrink-0">
                  Statistique
                </span>
                <span className="text-[9px] text-white/20 font-mono uppercase tracking-wider w-14 shrink-0">
                  Valeur
                </span>
                <span className="flex-1 text-[9px] text-white/20 font-mono uppercase tracking-wider">
                  Classement
                </span>
                <span className="text-[9px] text-white/20 font-mono uppercase tracking-wider w-16 text-right shrink-0">
                  Rang
                </span>
              </div>

              <div className="space-y-4 sm:space-y-3.5">
                {radarStats.map((s) => {
                  const isElite = s.rank <= Math.ceil(s.total * 0.1);
                  const isGood = s.rank <= Math.ceil(s.total * 0.25);

                  return (
                    <div
                      key={s.key}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1.5 sm:flex sm:gap-4"
                    >
                      {/* Abréviation masquée sur mobile : le libellé suffit. */}
                      <span className="hidden sm:block text-[10px] text-white/25 font-mono w-8 shrink-0">
                        {s.key}
                      </span>
                      <span className="text-sm text-white/55 min-w-0 truncate sm:w-28 sm:shrink-0">
                        {s.label}
                      </span>
                      <span className="font-display font-semibold text-white text-right sm:text-left sm:w-14 shrink-0 tabular-nums">
                        {s.value}
                      </span>
                      <div className="col-span-3 order-last sm:order-none sm:flex-1 min-w-0 h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${s.percentile}%`,
                            backgroundColor: accentColor,
                            opacity: isElite ? 0.8 : isGood ? 0.55 : 0.35,
                          }}
                        />
                      </div>
                      {/* rang / total */}
                      <span
                        className="text-[11px] font-mono tabular-nums text-right shrink-0 w-16"
                        style={{
                          color: isElite
                            ? accentColor
                            : isGood
                              ? "rgba(255,255,255,0.6)"
                              : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {s.rank}
                        <span className="opacity-40"> / {s.total}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[9px] text-white/15 font-mono mt-5">
                Comparé aux {positionLabel(player.position)} ayant joué ≥ 15
                matchs
              </p>
            </div>
          </div>
        </section>
      )}

      <PlayerInsights insights={playerInsights} />
      <SimilarPlayers players={similarPlayers} locale={locale} />

      <PlayerTabs
        primaryColor={accentColor}
        career={career}
        careerShooting={careerShooting}
        seasonTotals={seasonTotals}
        advanced={advanced}
        gameLogs={gameLogs}
        locale={locale}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdPerson).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdBreadcrumb).replace(/</g, "\\u003c"),
        }}
      />
      <SourceNote origins={[playerStatsOrigin(season), "historicStats", "advancedStats", "games"]} locale={locale} />
    </div>
  );
}
