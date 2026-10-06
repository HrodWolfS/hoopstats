// Variante `?saison=` du tableau des playoffs : le proxy y réécrit l'adresse publique pour
// qu'elle soit mise en cache comme la page par défaut (lib/query-routes.ts).
export { default, metadata } from "../../page";

export const revalidate = 300;

export function generateStaticParams() {
  return [];
}
