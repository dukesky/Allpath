import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "../middleware";

/** Where the middleware sends a request: the rewritten path, or null when
    the request passes through untouched. */
function rewriteTarget(host: string, path: string): string | null {
  const req = new NextRequest(`https://${host}${path}`, { headers: { host } });
  const res = middleware(req);
  const target = res.headers.get("x-middleware-rewrite");
  return target ? new URL(target).pathname : null;
}

describe("trading microsite host rewrite", () => {
  it("serves the blog index at trading.all-path.com/blog", () => {
    expect(rewriteTarget("trading.all-path.com", "/blog")).toBe("/trading/blog");
  });

  it("serves a post at trading.all-path.com/blog/<slug>", () => {
    expect(rewriteTarget("trading.all-path.com", "/blog/semis-slide-what-the-stops-did")).toBe(
      "/trading/blog/semis-slide-what-the-stops-did"
    );
  });

  it("keeps the existing microsite pages working", () => {
    expect(rewriteTarget("trading.all-path.com", "/")).toBe("/trading");
    expect(rewriteTarget("trading.all-path.com", "/journal")).toBe("/trading/journal");
  });

  it("leaves in-tree links alone on the subdomain", () => {
    // The pages link to /trading/blog/... directly; that must not be
    // rewritten a second time into /trading/trading/blog/...
    expect(rewriteTarget("trading.all-path.com", "/trading/blog")).toBeNull();
    expect(rewriteTarget("trading.all-path.com", "/trading/blog/semis-slide-what-the-stops-did")).toBeNull();
  });

  it("leaves assets and the API alone on the subdomain", () => {
    expect(rewriteTarget("trading.all-path.com", "/allpath-logo-mark.png")).toBeNull();
    expect(rewriteTarget("trading.all-path.com", "/api/trading-log")).toBeNull();
  });

  it("does not rewrite the primary host", () => {
    expect(rewriteTarget("all-path.com", "/trading/blog")).toBeNull();
    expect(rewriteTarget("all-path.com", "/blog")).toBeNull();
  });

  it("matches the local dev alias, ignoring the port", () => {
    const req = new NextRequest("http://trading.localhost:3000/blog", {
      headers: { host: "trading.localhost:3000" }
    });
    const target = middleware(req).headers.get("x-middleware-rewrite");
    expect(target && new URL(target).pathname).toBe("/trading/blog");
  });
});
