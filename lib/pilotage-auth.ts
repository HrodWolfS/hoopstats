import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Accès à la page interne de pilotage (authentification HTTP Basic).
 *
 * Le mot de passe vient de `PILOTAGE_PASSWORD` ; le nom d'utilisateur est
 * libre. Sans mot de passe configuré, la page reste fermée en production et
 * n'est ouverte qu'au serveur de développement local.
 */

export const PILOTAGE_PATH = "/fr/pilotage";

export const PILOTAGE_CHALLENGE = 'Basic realm="hoopstats pilotage", charset="UTF-8"';

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Mot de passe transmis dans un en-tête `Authorization: Basic …`, ou null. */
function basicPassword(authorization: string | null): string | null {
  const match = authorization?.match(/^Basic\s+(.+)$/i);
  if (!match) return null;
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  return separator === -1 ? null : decoded.slice(separator + 1);
}

export function isPilotageAuthorized(
  authorization: string | null,
  password: string | undefined = process.env.PILOTAGE_PASSWORD,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (!password) return nodeEnv === "development";
  const given = basicPassword(authorization);
  // Comparaison à temps constant sur des empreintes de même longueur.
  return given !== null && timingSafeEqual(digest(given), digest(password));
}

export function isPilotagePath(pathname: string): boolean {
  return pathname === PILOTAGE_PATH || pathname.startsWith(`${PILOTAGE_PATH}/`);
}
