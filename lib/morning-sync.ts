/**
 * Déclenchement matinal de la synchro (DECISIONS.md, 014).
 *
 * Les horaires programmés de GitHub Actions partent avec plusieurs heures de
 * retard ; un déclenchement à la demande démarre en moins d'une minute. Le cron
 * Vercel appelle donc /api/cron/sync, qui demande à GitHub de lancer
 * `daily-sync.yml` tout de suite.
 */

export const SYNC_WORKFLOW = "HrodWolfS/hoopstats/actions/workflows/daily-sync.yml";

/** Vercel envoie `Authorization: Bearer <CRON_SECRET>` à chaque appel de cron. */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  return Boolean(secret) && authorization === `Bearer ${secret}`;
}

export function dispatchRequest(token: string): { url: string; init: RequestInit } {
  const [owner, repo, , , workflow] = SYNC_WORKFLOW.split("/");
  return {
    url: `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
    init: {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  };
}
