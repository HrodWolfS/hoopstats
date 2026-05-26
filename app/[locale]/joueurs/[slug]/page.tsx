import { notFound } from "next/navigation";
import { type Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";
import { stat, pct } from "@/lib/format";
import { Crumbs } from "@/components/ui/crumbs";
import { PlayerHeader } from "@/components/player/player-header";
import { PlayerTabs } from "@/components/player/player-tabs";
import {
  PlayerRadarChart,
  type RadarStat,
} from "@/components/player/player-radar";
import type { CareerSeason } from "@/components/player/career-view";
import type { AdvancedSeason } from "@/components/player/advanced-view";

export const revalidate = 21600;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Calcule le rang (1 = meilleur), le total et le percentile d'une valeur. */
function calcRank(
  values: number[],
  target: number,
): { rank: number; total: number; percentile: number } {
  const valid = values.filter((v) => v != null);
  if (valid.length === 0) return { rank: 1, total: 1, percentile: 50 };
  const above = valid.filter((v) => v > target).length;
  const rank = above + 1;
  const below = valid.filter((v) => v < target).length;
  const percentile = Math.round((below / valid.length) * 100);
  return { rank, total: valid.length, percentile };
}

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

// ── generateMetadata ──────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
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
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const { locale, slug } = await params;
  const { saison } = await searchParams;
  const season = saison ?? CURRENT_SEASON;

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

  const currentSeason =
    player.seasons.find((s) => s.season === season) ??
    player.seasons[player.seasons.length - 1] ??
    null;

  const currentTeam = currentSeason?.team ?? null;
  const primaryColor = currentTeam?.primaryColor ?? "#7C3AED";
  const secondaryColor = currentTeam?.secondaryColor ?? "#06B6D4";

  // ── Radar : percentiles par position ─────────────────────────────────────

  const posGroup = positionGroup(player.position);

  const peers = currentSeason
    ? await prisma.playerSeason.findMany({
        where: {
          season: currentSeason.season,
          gamesPlayed: { gte: 15 },
          ...(posGroup ? { player: { position: { in: posGroup } } } : {}),
        },
        select: {
          pointsPerGame: true,
          reboundsPerGame: true,
          assistsPerGame: true,
          stealsPerGame: true,
          blocksPerGame: true,
          trueShooting: true,
        },
      })
    : [];

  const radarStats: RadarStat[] = currentSeason
    ? [
        {
          key: "PTS",
          label: "Points",
          value: stat(currentSeason.pointsPerGame),
          ...calcRank(
            peers.map((p) => p.pointsPerGame),
            currentSeason.pointsPerGame,
          ),
        },
        {
          key: "REB",
          label: "Rebonds",
          value: stat(currentSeason.reboundsPerGame),
          ...calcRank(
            peers.map((p) => p.reboundsPerGame),
            currentSeason.reboundsPerGame,
          ),
        },
        {
          key: "AST",
          label: "Passes",
          value: stat(currentSeason.assistsPerGame),
          ...calcRank(
            peers.map((p) => p.assistsPerGame),
            currentSeason.assistsPerGame,
          ),
        },
        {
          key: "TS%",
          label: "True Shooting",
          value:
            currentSeason.trueShooting != null
              ? `${pct(currentSeason.trueShooting)}%`
              : "—",
          ...calcRank(
            peers
              .filter((p) => p.trueShooting != null)
              .map((p) => p.trueShooting!),
            currentSeason.trueShooting ?? 0,
          ),
        },
        {
          key: "STL",
          label: "Interceptions",
          value: stat(currentSeason.stealsPerGame),
          ...calcRank(
            peers.map((p) => p.stealsPerGame),
            currentSeason.stealsPerGame,
          ),
        },
        {
          key: "BLK",
          label: "Contres",
          value: stat(currentSeason.blocksPerGame),
          ...calcRank(
            peers.map((p) => p.blocksPerGame),
            currentSeason.blocksPerGame,
          ),
        },
      ]
    : [];

  // ── Adapter les types pour les composants ─────────────────────────────────

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

  const advanced: AdvancedSeason[] = player.seasons.map((ps) => ({
    season: ps.season,
    teamAbbr: ps.team.abbr,
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
      <Crumbs
        items={[
          { label: "Accueil", href: `/${locale}` },
          { label: "Joueurs", href: `/${locale}/joueurs` },
          { label: `${player.firstName} ${player.lastName}` },
        ]}
      />

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
        ppg={currentSeason?.pointsPerGame ?? null}
        rpg={currentSeason?.reboundsPerGame ?? null}
        apg={currentSeason?.assistsPerGame ?? null}
        tsPct={currentSeason?.trueShooting ?? null}
      />

      {/* Radar chart — percentiles vs même position */}
      {radarStats.length > 0 && (
        <section className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-12 md:col-span-5">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <PlayerRadarChart
                stats={radarStats}
                color={primaryColor}
                positionLabel={positionLabel(player.position)}
                season={currentSeason?.season ?? season}
              />
            </div>
          </div>

          {/* Légende détaillée */}
          <div className="col-span-12 md:col-span-7 self-stretch">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 h-full">
              {/* Header */}
              <div className="flex items-baseline justify-between mb-5">
                <p className="text-[10px] text-white/30 uppercase tracking-[0.18em] font-medium">
                  Profil statistique · {currentSeason?.season ?? season}
                </p>
                <p className="text-[10px] text-white/20 font-mono">
                  vs {positionLabel(player.position)}
                </p>
              </div>

              {/* Colonne headers */}
              <div className="flex items-center gap-4 mb-3 pb-2 border-b border-white/[0.04]">
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

              <div className="space-y-3.5">
                {radarStats.map((s) => {
                  const isElite = s.rank <= Math.ceil(s.total * 0.1);
                  const isGood = s.rank <= Math.ceil(s.total * 0.25);

                  return (
                    <div key={s.key} className="flex items-center gap-4">
                      <span className="text-[10px] text-white/25 font-mono w-8 shrink-0">
                        {s.key}
                      </span>
                      <span className="text-sm text-white/55 w-28 shrink-0">
                        {s.label}
                      </span>
                      <span className="font-display font-semibold text-white w-14 tabular-nums">
                        {s.value}
                      </span>
                      <div className="flex-1 h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${s.percentile}%`,
                            backgroundColor: primaryColor,
                            opacity: isElite ? 0.8 : isGood ? 0.55 : 0.35,
                          }}
                        />
                      </div>
                      {/* rang / total */}
                      <span
                        className="text-[11px] font-mono tabular-nums text-right shrink-0 w-16"
                        style={{
                          color: isElite
                            ? primaryColor
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

      <PlayerTabs
        primaryColor={primaryColor}
        career={career}
        advanced={advanced}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdPerson) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
    </div>
  );
}
