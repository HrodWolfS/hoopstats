import { type Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/ui/fade-in";
import { PlayerAvatar } from "@/components/ui/player-avatar";

export const metadata: Metadata = {
  title: "Trophées NBA — MVP, DPOY, Champions | hoopstats",
  description:
    "Tous les trophées NBA depuis 2015-16 : MVP, DPOY, MIP, ROY, Sixième homme, Finals MVP, NBA Cup et champions NBA / Est / Ouest.",
};

export const revalidate = 21600;

// ── Types ────────────────────────────────────────────────────────────────────

type AwardRow = {
  id: string;
  type: string;
  season: string;
  notes: string | null;
  coachName: string | null;
  player: {
    slug: string;
    firstName: string;
    lastName: string;
    position: string | null;
    photoUrl: string | null;
  } | null;
  team: {
    slug: string;
    abbr: string;
    city: string;
    name: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
  } | null;
};

// ── Config awards ────────────────────────────────────────────────────────────

const INDIVIDUAL_AWARDS: { type: string; label: string; sub: string }[] = [
  { type: "MVP", label: "MVP", sub: "Most Valuable Player" },
  { type: "FMVP", label: "Finals MVP", sub: "MVP des finales NBA" },
  { type: "DPOY", label: "DPOY", sub: "Defensive Player of the Year" },
  { type: "ROY", label: "ROY", sub: "Rookie of the Year" },
  { type: "MIP", label: "MIP", sub: "Most Improved Player" },
  { type: "SMOY", label: "6e homme", sub: "Sixth Man of the Year" },
  { type: "CPOY", label: "Clutch", sub: "Clutch Player of the Year" },
  { type: "NBA_CUP_MVP", label: "Cup MVP", sub: "NBA Cup MVP" },
];

// ── Data ─────────────────────────────────────────────────────────────────────

async function getAwards(season: string): Promise<AwardRow[]> {
  return prisma.award.findMany({
    where: { season },
    select: {
      id: true,
      type: true,
      season: true,
      notes: true,
      coachName: true,
      player: {
        select: {
          slug: true,
          firstName: true,
          lastName: true,
          position: true,
          photoUrl: true,
        },
      },
      team: {
        select: {
          slug: true,
          abbr: true,
          city: true,
          name: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
        },
      },
    },
  });
}

async function getSeasons(): Promise<string[]> {
  const rows = await prisma.award.findMany({
    select: { season: true },
    distinct: ["season"],
    orderBy: { season: "desc" },
  });
  return rows.map((r) => r.season);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IndividualCard({
  label,
  sub,
  award,
  locale,
  highlight,
}: {
  label: string;
  sub: string;
  award: AwardRow | undefined;
  locale: string;
  highlight?: boolean;
}) {
  if (!award || !award.player) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.06] bg-[#0d0d10] px-5 py-4 flex flex-col gap-1 opacity-50">
        <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono">
          {label}
        </div>
        <div className="text-white/30 text-sm">Non décerné</div>
      </div>
    );
  }
  const p = award.player;
  const t = award.team;

  return (
    <Link
      href={`/${locale}/joueurs/${p.slug}`}
      className={`group relative block rounded-2xl border bg-[#111114] overflow-hidden hover:border-white/[0.12] transition ${
        highlight
          ? "border-orange-500/30 shadow-lg shadow-orange-500/[0.08]"
          : "border-white/[0.06]"
      }`}
    >
      {highlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-orange-500/[0.18] blur-3xl"
        />
      )}

      <div className="relative px-5 py-4 flex items-center gap-4">
        <PlayerAvatar
          firstName={p.firstName}
          lastName={p.lastName}
          primaryColor={t?.primaryColor ?? "#444"}
          secondaryColor={t?.secondaryColor ?? "#222"}
          photoUrl={p.photoUrl}
          size="lg"
          showNum={false}
        />
        <div className="min-w-0 flex-1">
          <div
            className={`text-[10px] uppercase tracking-widest font-mono mb-1.5 flex items-center gap-1.5 ${
              highlight ? "text-orange-400" : "text-white/40"
            }`}
          >
            <TrophyIcon className="h-3 w-3" />
            {label}
          </div>
          <div className="font-display font-semibold text-base leading-tight truncate group-hover:text-orange-300 transition">
            {p.firstName} {p.lastName}
          </div>
          <div className="text-[11px] text-white/30 mt-0.5 truncate">
            {t?.abbr}
            {p.position ? ` · ${p.position}` : ""} · {sub}
          </div>
          {award.notes && (
            <div className="text-[11px] text-white/40 italic mt-1.5 line-clamp-2">
              {award.notes}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function ChampionCard({
  award,
  locale,
  size,
}: {
  award: AwardRow | undefined;
  locale: string;
  size: "lg" | "md";
}) {
  if (!award || !award.team) return null;
  const t = award.team;

  if (size === "lg") {
    return (
      <Link
        href={`/${locale}/equipes/${t.slug}`}
        className="group relative block overflow-hidden rounded-3xl border border-white/[0.06] hover:border-white/[0.12] transition"
        style={{
          background: `linear-gradient(135deg, ${t.primaryColor}22 0%, #111114 60%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full blur-3xl opacity-40 transition group-hover:opacity-60"
          style={{ background: t.primaryColor }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-3xl opacity-10 bg-orange-500"
        />

        <div className="relative grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-6 p-6 sm:p-8">
          {t.logoUrl ? (
            <Image
              src={t.logoUrl}
              alt={t.abbr}
              width={120}
              height={120}
              className="object-contain"
              unoptimized
            />
          ) : (
            <div
              className="h-28 w-28 rounded-2xl flex items-center justify-center font-display font-bold text-3xl text-white"
              style={{ background: t.primaryColor }}
            >
              {t.abbr}
            </div>
          )}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[10px] font-mono uppercase tracking-widest mb-3">
              <TrophyIcon className="h-3 w-3" />
              Champion NBA · {award.season}
            </div>
            <h3 className="font-display font-bold text-3xl sm:text-4xl tracking-tight leading-[1.05] mb-1 group-hover:text-orange-300 transition">
              {t.city}
            </h3>
            <div className="font-display font-semibold text-xl text-white/60 mb-3">
              {t.name}
            </div>
            {award.notes && (
              <div className="text-sm text-white/50 italic max-w-md">
                {award.notes}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/equipes/${t.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111114] hover:border-white/[0.12] transition"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-0.5"
        style={{ background: t.primaryColor }}
      />
      <div className="relative flex items-center gap-4 px-5 py-4">
        {t.logoUrl ? (
          <Image
            src={t.logoUrl}
            alt={t.abbr}
            width={48}
            height={48}
            className="object-contain shrink-0"
            unoptimized
          />
        ) : (
          <div
            className="h-12 w-12 rounded-lg flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
            style={{ background: t.primaryColor }}
          >
            {t.abbr}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono mb-0.5">
            Finaliste
          </div>
          <div className="font-display font-semibold text-base leading-tight truncate group-hover:text-orange-300 transition">
            {t.city} <span className="text-white/50">{t.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CoachCard({
  award,
  locale,
}: {
  award: AwardRow | undefined;
  locale: string;
}) {
  if (!award || !award.coachName) return null;
  const t = award.team;

  // Initiales du coach pour l'avatar
  const parts = award.coachName.split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");

  return (
    <Link
      href={t ? `/${locale}/equipes/${t.slug}` : "#"}
      className="group relative block overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111114] hover:border-white/[0.12] transition"
    >
      {t && (
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-0.5"
          style={{ background: t.primaryColor }}
        />
      )}

      <div className="relative px-5 py-4 flex items-center gap-4">
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center font-display font-bold text-base text-white shrink-0"
          style={{
            background: t
              ? `linear-gradient(135deg, ${t.primaryColor}, ${t.secondaryColor})`
              : "#333",
          }}
          title={award.coachName}
        >
          {initials.toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest font-mono text-white/40 mb-1.5 flex items-center gap-1.5">
            <TrophyIcon className="h-3 w-3" />
            COY
          </div>
          <div className="font-display font-semibold text-base leading-tight truncate group-hover:text-orange-300 transition">
            {award.coachName}
          </div>
          <div className="text-[11px] text-white/30 mt-0.5 truncate">
            {t?.abbr} · Coach of the Year
          </div>
          {award.notes && (
            <div className="text-[11px] text-white/40 italic mt-1.5 line-clamp-2">
              {award.notes}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function TropheesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const seasons = await getSeasons();

  const selectedSeason =
    sp.season && seasons.includes(sp.season) ? sp.season : seasons[0];

  if (!selectedSeason) {
    return (
      <div className="space-y-6">
        <h1 className="font-display font-semibold text-3xl tracking-tight">
          Trophées
        </h1>
        <p className="text-white/40">Aucune donnée disponible.</p>
      </div>
    );
  }

  const awards = await getAwards(selectedSeason);
  const byType = new Map(awards.map((a) => [a.type, a]));

  const nbaChampion = byType.get("NBA_CHAMPION");
  const eastChampion = byType.get("EAST_CHAMPION");
  const westChampion = byType.get("WEST_CHAMPION");
  const cupChampion = byType.get("NBA_CUP_CHAMPION");
  const hasCup = Boolean(byType.get("NBA_CUP_MVP") || cupChampion);

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <FadeIn>
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] font-medium uppercase tracking-wider mb-3">
              <TrophyIcon className="h-3 w-3" />
              Trophées · saison {selectedSeason}
            </div>
            <h1 className="font-display font-semibold text-4xl tracking-[-0.03em] leading-tight">
              Trophées NBA
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Individuels et collectifs depuis {seasons[seasons.length - 1]}.
            </p>
          </div>
        </section>
      </FadeIn>

      {/* ── Sélecteur saison ───────────────────────────────────────────── */}
      <FadeIn delay={0.04}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
          {seasons.map((s) => {
            const active = s === selectedSeason;
            return (
              <Link
                key={s}
                href={`/${locale}/trophees${s === seasons[0] ? "" : `?season=${s}`}`}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-mono transition ${
                  active
                    ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
                    : "bg-white/[0.04] text-white/50 border border-transparent hover:bg-white/[0.07] hover:text-white/80"
                }`}
              >
                {s}
              </Link>
            );
          })}
        </div>
      </FadeIn>

      {/* ── Champion NBA (hero) ────────────────────────────────────────── */}
      {nbaChampion && (
        <FadeIn delay={0.08}>
          <ChampionCard award={nbaChampion} locale={locale} size="lg" />
        </FadeIn>
      )}

      {/* ── Finalistes Est / Ouest ─────────────────────────────────────── */}
      {(eastChampion || westChampion) && (
        <FadeIn delay={0.12}>
          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg tracking-tight">
              Finalistes de conférence{" "}
              <span className="text-white/25 font-normal text-sm">
                vainqueurs des finales de conférence
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChampionCard award={eastChampion} locale={locale} size="md" />
              <ChampionCard award={westChampion} locale={locale} size="md" />
            </div>
          </section>
        </FadeIn>
      )}

      {/* ── NBA Cup ────────────────────────────────────────────────────── */}
      {hasCup && (
        <FadeIn delay={0.16}>
          <section className="space-y-3">
            <h2 className="font-display font-semibold text-lg tracking-tight">
              NBA Cup{" "}
              <span className="text-white/25 font-normal text-sm">
                tournoi de mi-saison
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cupChampion && (
                <ChampionCard award={cupChampion} locale={locale} size="md" />
              )}
              {byType.get("NBA_CUP_MVP") && (
                <IndividualCard
                  label="Cup MVP"
                  sub="NBA Cup MVP"
                  award={byType.get("NBA_CUP_MVP")}
                  locale={locale}
                />
              )}
            </div>
          </section>
        </FadeIn>
      )}

      {/* ── Trophées individuels ───────────────────────────────────────── */}
      <FadeIn delay={0.2}>
        <section className="space-y-3">
          <h2 className="font-display font-semibold text-lg tracking-tight">
            Trophées individuels{" "}
            <span className="text-white/25 font-normal text-sm">
              récompenses joueurs
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {INDIVIDUAL_AWARDS.filter((a) => a.type !== "NBA_CUP_MVP").map(
              (a) => (
                <IndividualCard
                  key={a.type}
                  label={a.label}
                  sub={a.sub}
                  award={byType.get(a.type)}
                  locale={locale}
                  highlight={a.type === "MVP"}
                />
              ),
            )}
            <CoachCard award={byType.get("COY")} locale={locale} />
          </div>
        </section>
      </FadeIn>

      {/* ── Footer note ────────────────────────────────────────────────── */}
      <p className="text-[11px] text-white/25 leading-relaxed pt-2">
        Awards depuis 2015-16. La NBA Cup et le Clutch Player of the Year sont
        décernés depuis 2023-24 et 2022-23 respectivement. Les All-NBA teams ne
        sont pas encore intégrées.
      </p>
    </div>
  );
}
