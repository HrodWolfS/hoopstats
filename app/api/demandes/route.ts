import { prisma } from "@/lib/prisma";
import { statRequestCutoff, validateStatRequest } from "@/lib/stat-requests";

// Limite anti-abus en mémoire de l'instance : 5 demandes par 10 minutes.
// L'adresse sert de clé le temps de la fenêtre et n'est jamais écrite en base.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function rateLimited(key: string, now: number) {
  for (const [entry, times] of recent) {
    if (times.every((time) => now - time > WINDOW_MS)) recent.delete(entry);
  }
  const times = (recent.get(key) ?? []).filter((time) => now - time <= WINDOW_MS);
  times.push(now);
  recent.set(key, times);
  return times.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return new Response(null, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 2048) {
    return new Response(null, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Demande invalide." }, { status: 400 });
  }
  // Champ piège invisible : un robot qui le remplit reçoit un succès sans écriture.
  if (body && typeof body === "object" && (body as { site?: unknown }).site) {
    return new Response(null, { status: 204 });
  }
  const parsed = validateStatRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const now = new Date();
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(key, now.getTime())) {
    return Response.json({ error: "Trop de demandes, réessayez dans quelques minutes." }, { status: 429 });
  }

  await prisma.statRequest.create({ data: parsed.value });
  await prisma.statRequest.deleteMany({ where: { createdAt: { lt: statRequestCutoff(now) } } });
  return new Response(null, { status: 204 });
}
