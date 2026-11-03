import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { PLAYER_EXPLORER_CACHE_TAG } from "@/lib/stats/player-explorer-data";

/**
 * POST /api/revalidate
 * Invalide le cache ISR de toutes les pages.
 * Protégé par Bearer token (CRON_SECRET).
 * Appelé en fin de sync quotidien par GitHub Actions.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;

  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Invalide tout le layout → toutes les routes reconstruites au prochain hit
  revalidatePath("/", "layout");
  // Données de l'explorateur joueurs : relues dès la visite suivante.
  revalidateTag(PLAYER_EXPLORER_CACHE_TAG, { expire: 0 });

  return NextResponse.json({
    revalidated: true,
    timestamp: new Date().toISOString(),
  });
}
