import { type Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Matchs NBA | hoopstats",
  description: "Résultats et programmes NBA — hier, aujourd'hui et demain.",
};

export const revalidate = 300;

// ── Types ─────────────────────────────────────────────────────────────────────

type GameRow = {
  id: string;
  gameDate: Date;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: {
    abbr: string;
    name: string;
    city: string;
    logoUrl: string | null;
    primaryColor: string;
  };
  awayTeam: {
    abbr: string;
    name: string;
    city: string;
    logoUrl: string | null;
    primaryColor: string;
  };
};

type Tab = "hier" | "aujourd-hui" | "demain";

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Returns UTC bounds for a given NBA "game date", treating midnight as 04:00 UTC
 * (midnight EDT = UTC−4, which covers most of the NBA season).
 */
function getNbaDateRange(offset: number): {
  gte: Date;
  lt: Date;
  label: string;
} {
  const EDT_MS = 4 * 60 * 60 * 1000;
  const now = new Date();
  // Current time in EDT
  const nowEdt = new Date(now.getTime() - EDT_MS);
  // Start of targeted day in EDT (midnight)
  const midnightEdt = new Date(nowEdt);
  midnightEdt.setUTCHours(0, 0, 0, 0);
  midnightEdt.setUTCDate(midnightEdt.getUTCDate() + offset);
  // Convert back to UTC
  const gte = new Date(midnightEdt.getTime() + EDT_MS);
  const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000);

  const label = midnightEdt.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return { gte, lt, label };
}

// ── Data ──────────────────────────────────────────────────────────────────────

async function getGames(offset: number): Promise<GameRow[]> {
  const { gte, lt } = getNbaDateRange(offset);

  return prisma.game.findMany({
    where: { gameDate: { gte, lt } },
    orderBy: { gameDate: "asc" },
    select: {
      id: true,
      gameDate: true,
      status: true,
      homeScore: true,
      awayScore: true,
      homeTeam: {
        select: {
          abbr: true,
          name: true,
          city: true,
          logoUrl: true,
          primaryColor: true,
        },
      },
      awayTeam: {
        select: {
          abbr: true,
          name: true,
          city: true,
          logoUrl: true,
          primaryColor: true,
        },
      },
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "final") {
    return (
      <span className="text-[9px] font-mono uppercase tracking-widest text-white/30">
        Final
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        En cours
      </span>
    );
  }
  return null;
}

function TeamLogo({
  logoUrl,
  abbr,
  size = 32,
}: {
  logoUrl: string | null;
  abbr: string;
  size?: number;
}) {
  if (!logoUrl) {
    return (
      <div
        className="shrink-0 rounded flex items-center justify-center text-[10px] font-mono text-white/50 bg-white/[0.05]"
        style={{ width: size, height: size }}
      >
        {abbr}
      </div>
    );
  }
  return (
    <Image
      src={logoUrl}
      alt={abbr}
      width={size}
      height={size}
      className="object-contain shrink-0"
      unoptimized
    />
  );
}

function GameCard({ game, locale }: { game: GameRow; locale: string }) {
  const isFinal = game.status === "final";
  const isLive = game.status === "in_progress";
  const homeWon = isFinal && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = isFinal && (game.awayScore ?? 0) > (game.homeScore ?? 0);

  return (
    <Link
      href={`/${locale}/matchs/${game.id}`}
      className="rounded-2xl border border-white/[0.06] bg-[#111114] px-5 py-4 flex items-center gap-4 hover:border-white/[0.12] hover:bg-[#16161a] transition"
    >
      {/* Away */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <TeamLogo logoUrl={game.awayTeam.logoUrl} abbr={game.awayTeam.abbr} />
        <div className="min-w-0">
          <div
            className={`text-sm font-medium leading-tight truncate ${awayWon ? "text-white" : "text-white/60"}`}
          >
            {game.awayTeam.city}
          </div>
          <div className="text-[11px] text-white/30 font-mono">
            {game.awayTeam.abbr}
          </div>
        </div>
      </div>

      {/* Score / Time */}
      <div className="flex flex-col items-center shrink-0 gap-1 min-w-[80px]">
        {isFinal || isLive ? (
          <div className="font-display font-bold tabular-nums text-lg tracking-tight">
            <span className={awayWon ? "text-white" : "text-white/50"}>
              {game.awayScore ?? "–"}
            </span>
            <span className="text-white/20 mx-2">—</span>
            <span className={homeWon ? "text-white" : "text-white/50"}>
              {game.homeScore ?? "–"}
            </span>
          </div>
        ) : (
          <div className="font-mono text-sm text-white/60">
            {formatTime(game.gameDate)}
          </div>
        )}
        <StatusBadge status={game.status} />
      </div>

      {/* Home */}
      <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
        <div className="min-w-0 text-right">
          <div
            className={`text-sm font-medium leading-tight truncate ${homeWon ? "text-white" : "text-white/60"}`}
          >
            {game.homeTeam.city}
          </div>
          <div className="text-[11px] text-white/30 font-mono">
            {game.homeTeam.abbr}
          </div>
        </div>
        <TeamLogo logoUrl={game.homeTeam.logoUrl} abbr={game.homeTeam.abbr} />
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MatchsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ locale }, { tab: rawTab = "aujourd-hui" }] = await Promise.all([
    params,
    searchParams,
  ]);

  const tab = (
    ["hier", "aujourd-hui", "demain"].includes(rawTab) ? rawTab : "aujourd-hui"
  ) as Tab;

  const tabOffset = tab === "hier" ? -1 : tab === "demain" ? 1 : 0;
  const [games, { label: dateLabel }] = await Promise.all([
    getGames(tabOffset),
    Promise.resolve(getNbaDateRange(tabOffset)),
  ]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "hier", label: "Hier" },
    { id: "aujourd-hui", label: "Aujourd'hui" },
    { id: "demain", label: "Demain" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-semibold text-2xl tracking-tight mb-1">
          Matchs NBA
        </h1>
        <p className="text-white/40 text-sm capitalize">{dateLabel}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] pb-0">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/${locale}/matchs${t.id === "aujourd-hui" ? "" : `?tab=${t.id}`}`}
            className={`relative px-4 py-3 text-sm font-medium transition ${
              tab === t.id ? "text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute left-3 right-3 -bottom-px h-px bg-violet-400" />
            )}
          </Link>
        ))}
      </div>

      {/* Games list */}
      {games.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-[#111114] py-16 flex flex-col items-center justify-center gap-3">
          <div className="text-4xl opacity-20">🏀</div>
          <p className="text-white/30 text-sm">Aucun match ce jour</p>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map((g) => (
            <GameCard key={g.id} game={g} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
