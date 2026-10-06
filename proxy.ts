import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { queryRouteRewrite } from "@/lib/query-routes";

const LOCALES = ["fr"];
const DEFAULT_LOCALE = "fr";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (hasLocale) {
    const rewrite = queryRouteRewrite(request.nextUrl);
    return rewrite ? NextResponse.rewrite(rewrite) : NextResponse.next();
  }

  request.nextUrl.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
