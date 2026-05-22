import { type Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CURRENT_SEASON } from "@/lib/nba";
import { TeamMono } from "@/components/ui/team-mono";

export const metadata: Metadata = {
  title: "Les 30 équipes NBA — hoopstats",
  description:
    "Stats, roster et historique des 30 franchises NBA. Données saison 2024-25.",
};

export const revalidate = 21600;

export default async function TeamsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const { locale } = await params;
  const { saison } = await searchParams;
  const season = saison ?? CURRENT_SEASON;

  const teams = await prisma.team.findMany({
    orderBy: { conference: "asc" },
    include: {
      seasons: {
        where: { season },
        take: 1,
      },
    },
  });

  const east = teams.filter((t) => t.conference === "East");
  const west = teams.filter((t) => t.conference === "West");

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display font-semibold text-4xl tracking-tight mb-1">
          Les 30 franchises
        </h1>
        <p className="text-white/40 text-sm">Saison {season}</p>
      </div>

      {[
        { label: "Conférence Est", teams: east },
        { label: "Conférence Ouest", teams: west },
      ].map(({ label, teams: confTeams }) => (
        <section key={label}>
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-medium mb-4">
            {label}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {confTeams.map((team) => {
              const season = team.seasons[0];
              return (
                <Link
                  key={team.slug}
                  href={`/${locale}/equipes/${team.slug}`}
                  className="group rounded-2xl border border-white/[0.06] bg-[#111114] p-4 flex flex-col items-center gap-3 hover:border-white/[0.15] transition"
                >
                  <TeamMono
                    abbr={team.abbr}
                    primaryColor={team.primaryColor}
                    secondaryColor={team.secondaryColor}
                    logoUrl={team.logoUrl}
                    size="lg"
                  />
                  <div className="text-center">
                    <div className="text-sm font-medium leading-tight">
                      {team.city}
                    </div>
                    <div className="text-sm text-white/40">{team.name}</div>
                  </div>
                  {season && (
                    <div className="text-xs font-mono text-white/40 tabular-nums">
                      {season.wins}–{season.losses}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
