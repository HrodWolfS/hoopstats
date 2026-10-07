import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isPilotageAuthorized,
  isPilotagePath,
  PILOTAGE_CHALLENGE,
} from "@/lib/pilotage-auth";
import { legacyMatchTabRedirect, legacySeasonRedirect, queryRouteRewrite } from "@/lib/query-routes";
import { referenceDate } from "@/lib/nba";

const LOCALES = ["fr"];
const DEFAULT_LOCALE = "fr";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    isPilotagePath(pathname) &&
    !isPilotageAuthorized(request.headers.get("authorization"))
  ) {
    return new NextResponse("Authentification requise", {
      status: 401,
      headers: { "WWW-Authenticate": PILOTAGE_CHALLENGE, "Cache-Control": "no-store" },
    });
  }

  const hasLocale = LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (hasLocale) {
    const legacy = legacySeasonRedirect(request.nextUrl);
    if (legacy) return NextResponse.redirect(legacy, 308);
    const legacyTab = legacyMatchTabRedirect(request.nextUrl, referenceDate());
    if (legacyTab) return NextResponse.redirect(legacyTab, 307);
    const rewrite = queryRouteRewrite(request.nextUrl);
    return rewrite ? NextResponse.rewrite(rewrite) : NextResponse.next();
  }

  request.nextUrl.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
