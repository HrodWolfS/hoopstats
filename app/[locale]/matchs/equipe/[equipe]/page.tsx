// Variante `?equipe=` de la page matchs : le proxy y réécrit l'adresse publique pour
// qu'elle soit mise en cache comme la page par défaut (lib/query-routes.ts).
import { type Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isTeamParam } from "@/lib/query-routes";

export { default } from "../../page";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ equipe: string }> }): Promise<Metadata> {
  const { equipe } = await params;
  if (!isTeamParam(equipe)) return {};
  const team = await prisma.team.findUnique({ where: { abbr: equipe.toUpperCase() }, select: { city: true, name: true } });
  if (!team) return {};
  return {
    title: `Calendrier ${team.city} ${team.name} | hoopstats`,
    description: `Tous les matchs des ${team.city} ${team.name} de la saison : résultats, prolongations, matchs à venir à l'heure de Paris.`,
    alternates: { canonical: `/fr/matchs?equipe=${equipe}` },
  };
}
