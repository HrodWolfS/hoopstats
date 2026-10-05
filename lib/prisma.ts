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
 * tombait en erreur 500 et le build échouait. Une valeur déjà présente dans
 * l'URL reste prioritaire.
 */
const NEON_WAKE_TIMEOUT_SECONDS = 30;

function withConnectTimeout(url: string | undefined): string | undefined {
  if (!url || url.includes("connect_timeout=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connect_timeout=${NEON_WAKE_TIMEOUT_SECONDS}`;
}

const datasourceUrl = withConnectTimeout(rawDatasourceUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;
