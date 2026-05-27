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
const datasourceUrl =
  process.env.NODE_ENV === "development" && process.env.DIRECT_URL
    ? process.env.DIRECT_URL
    : process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;
