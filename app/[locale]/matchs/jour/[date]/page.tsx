// Variante `?date=` de la page matchs : le proxy y réécrit l'adresse publique pour
// qu'elle soit mise en cache comme la page par défaut (lib/query-routes.ts).
import { type Metadata } from "next";
import { dayTitle, isDayKey } from "@/lib/schedule";

export { default } from "../../page";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  if (!isDayKey(date)) return {};
  return {
    title: `Matchs NBA du ${dayTitle(date)} | hoopstats`,
    description: `Résultats et programme NBA du ${dayTitle(date)}, heures de Paris, meilleurs marqueurs de chaque match.`,
    alternates: { canonical: `/fr/matchs?date=${date}` },
  };
}
