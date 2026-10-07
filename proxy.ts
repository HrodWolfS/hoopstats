import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isPilotageAuthorized,
  isPilotagePath,
  PILOTAGE_CHALLENGE,
} from "@/lib/pilotage-auth";
import { legacySeasonRedirect, queryRouteRewrite } from "@/lib/query-routes";

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
    const rewrite = queryRouteRewrite(request.nextUrl);
    return rewrite ? NextResponse.rewrite(rewrite) : NextResponse.next();
  }

  request.nextUrl.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
