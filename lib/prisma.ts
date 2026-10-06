import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * En dev local, le pooler Neon (`-pooler` host) peut être inaccessible
 * selon le réseau. On bascule sur `DIRECT_URL` (connexion directe Neon)
 * si elle est disponible. En production (Vercel), on conserve `DATABASE_URL`
 * qui pointe sur le pooler — c'est le bon choix pour le serverless.
 */
const rawDatasourceUrl =
  process.env.NODE_ENV === "development" && process.env.DIRECT_URL
    ? process.env.DIRECT_URL
    : process.env.DATABASE_URL;

/**
 * Neon (offre gratuite) met la base en veille après quelques minutes
 * d'inactivité ; la réveiller prend plusieurs secondes, au-delà des 5 s que
 * Prisma accorde par défaut. Sans marge, la première visite après une pause
 * tombait en erreur 500 et le build échouait.
 *
 * Le délai d'attente d'une connexion libre dans le pool (10 s par défaut) est
 * relevé d'autant : pendant le réveil, les requêtes du build s'accumulent
 * derrière les connexions en cours d'ouverture. Une valeur déjà présente dans
 * l'URL reste prioritaire.
 */
const NEON_WAKE_TIMEOUT_SECONDS = 30;

function withNeonWakeTimeouts(url: string | undefined): string | undefined {
  if (!url) return url;
  let result = url;
  for (const param of ["connect_timeout", "pool_timeout"]) {
    if (result.includes(`${param}=`)) continue;
    const separator = result.includes("?") ? "&" : "?";
    result = `${result}${separator}${param}=${NEON_WAKE_TIMEOUT_SECONDS}`;
  }
  return result;
}

const datasourceUrl = withNeonWakeTimeouts(rawDatasourceUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;
