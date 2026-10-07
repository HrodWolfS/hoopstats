// Variante `?saison=` de la page tendances : le proxy y réécrit l'adresse publique pour
// qu'elle soit mise en cache comme la page par défaut (lib/query-routes.ts).
export { default, generateMetadata } from "../../page";

export const revalidate = 21600;

export function generateStaticParams() {
  return [];
}
