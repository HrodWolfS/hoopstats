import { prisma } from "@/lib/prisma";
import {
  isAnalyticsEvent,
  isAnalyticsRecorded,
  sanitizeAnalyticsDimension,
} from "@/lib/analytics";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return new Response(null, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 512) {
    return new Response(null, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Payload JSON invalide" }, { status: 400 });
  }
  const payload = body as { event?: unknown; dimension?: unknown };
  const dimension = sanitizeAnalyticsDimension(payload.dimension);
  if (!isAnalyticsEvent(payload.event) || !dimension) {
    return Response.json({ error: "Événement non autorisé" }, { status: 400 });
  }

  // Validé mais pas enregistré hors production : même réponse pour le client.
  if (!isAnalyticsRecorded(new URL(request.url).host)) return new Response(null, { status: 204 });

  const now = new Date();
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  await prisma.analyticsDaily.upsert({
    where: { day_event_dimension: { day, event: payload.event, dimension } },
    create: { day, event: payload.event, dimension, count: 1 },
    update: { count: { increment: 1 } },
  });
  return new Response(null, { status: 204 });
}
