import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Host-based routing for the product microsites.
 *
 * `trading.all-path.com` and `agent.all-path.com` are served by this same
 * Next.js app (one Cloud Run service, one deploy) — requests arriving on
 * those hosts are rewritten onto their route trees. Static assets, Next
 * internals, and the API stay on their real paths so the subdomains can
 * still load images/JS.
 *
 * On the primary host nothing changes: `/trading` and `/agent` remain
 * reachable at https://all-path.com/trading and https://all-path.com/agent.
 */
const MICROSITE_TREES: ReadonlyArray<{ hosts: ReadonlySet<string>; basePath: string }> = [
  { hosts: new Set(["trading.all-path.com", "trading.localhost"]), basePath: "/trading" },
  { hosts: new Set(["agent.all-path.com", "agent.localhost"]), basePath: "/agent" }
];

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const tree = MICROSITE_TREES.find((entry) => entry.hosts.has(host));
  if (!tree) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // Already the microsite tree, or an asset/API path — leave it alone.
  if (
    pathname.startsWith(tree.basePath) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.[a-z0-9]+$/i.test(pathname) // favicon.ico, *.png, *.svg, ...
  ) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? tree.basePath : `${tree.basePath}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
