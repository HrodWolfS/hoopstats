// Variante `?saison=` de la page draft : le proxy y réécrit l'adresse publique pour
// qu'elle soit mise en cache comme la page par défaut (lib/query-routes.ts).
export { default, metadata } from "../../page";

export function generateStaticParams() {
  return [];
}
