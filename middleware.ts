import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Host-based routing for the Trading Agent microsite.
 *
 * `trading.all-path.com` is served by this same Next.js app (one Cloud Run
 * service, one deploy) — requests arriving on that host are rewritten onto
 * the `/trading` route tree. Static assets, Next internals, and the API stay
 * on their real paths so the subdomain can still load images/JS.
 *
 * On the primary host nothing changes: `/trading` remains reachable at
 * https://all-path.com/trading as well.
 */
const TRADING_HOSTS = new Set(["trading.all-path.com", "trading.localhost"]);

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!TRADING_HOSTS.has(host)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // Already the microsite tree, or an asset/API path — leave it alone.
  if (
    pathname.startsWith("/trading") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.[a-z0-9]+$/i.test(pathname) // favicon.ico, *.png, *.svg, ...
  ) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/trading" : `/trading${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
