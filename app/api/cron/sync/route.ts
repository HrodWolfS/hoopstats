import { dispatchRequest, isCronAuthorized } from "@/lib/morning-sync";

/**
 * GET /api/cron/sync — appelé par le cron Vercel (vercel.json) le matin.
 * Lance `daily-sync.yml` sur GitHub ; la synchro elle-même tourne là-bas.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Une preview partage la base : seule la production déclenche la synchro.
  if (process.env.VERCEL_ENV !== "production") {
    return Response.json({ dispatched: false, reason: "hors production" });
  }
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return Response.json({ error: "GITHUB_DISPATCH_TOKEN absent" }, { status: 500 });
  }

  const { url, init } = dispatchRequest(token);
  const response = await fetch(url, init);
  if (response.status !== 204) {
    // Échec visible dans les journaux Vercel ; l'horaire GitHub reste en secours.
    const detail = (await response.text()).slice(0, 200);
    console.error(`[cron/sync] GitHub ${response.status} : ${detail}`);
    return Response.json({ dispatched: false, status: response.status }, { status: 502 });
  }
  return Response.json({ dispatched: true, at: new Date().toISOString() });
}
