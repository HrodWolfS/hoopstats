import { NextRequest, NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/search-index";
import { searchEntries, type SearchKind } from "@/lib/search";

export const runtime = "nodejs";

export type { SearchResult } from "@/lib/search";

/**
 * Recherche globale. `type=player` limite aux joueurs (comparateur) ; même
 * moteur et même classement que la palette.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const kind: SearchKind = req.nextUrl.searchParams.get("type") === "player" ? "player" : "all";
  const outcome = searchEntries(await getSearchIndex(), q, { kind, limit: 8 });
  return NextResponse.json(outcome, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
