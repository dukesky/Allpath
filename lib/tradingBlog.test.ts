import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ACCOUNT,
  DATES,
  EXITS,
  NDX,
  NVDA,
  NVDA_SEQUENCE,
  NVDA_STOP,
  RULES_BEFORE,
  RULES_SINCE,
  SOX,
  SP500
} from "../app/trading/blog/semis-slide-what-the-stops-did/data";
import {
  TRADING_BLOG_POSTS,
  formatPostDate,
  getTradingBlogPost,
  indexTo100,
  listTradingBlogPosts,
  readingMinutesFor,
  signedPct,
  totalChangePct
} from "./tradingBlog";

const blogDir = fileURLToPath(new URL("../app/trading/blog/", import.meta.url));

describe("trading blog registry", () => {
  it("has at least one post, each with a unique kebab-case slug and an ISO date", () => {
    expect(TRADING_BLOG_POSTS.length).toBeGreaterThan(0);
    const slugs = TRADING_BLOG_POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const post of TRADING_BLOG_POSTS) {
      expect(post.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.title.length).toBeGreaterThan(0);
      expect(post.summary.length).toBeGreaterThan(0);
    }
  });

  it("has a page file for every listed post, plus the index page", () => {
    expect(existsSync(`${blogDir}page.tsx`)).toBe(true);
    for (const post of TRADING_BLOG_POSTS) {
      expect(existsSync(`${blogDir}${post.slug}/page.tsx`), post.slug).toBe(true);
    }
  });

  it("lists posts newest first without mutating the registry", () => {
    const listed = listTradingBlogPosts();
    for (let i = 1; i < listed.length; i += 1) {
      expect(listed[i - 1].date >= listed[i].date).toBe(true);
    }
    expect(listed).not.toBe(TRADING_BLOG_POSTS);
  });

  it("looks a post up by slug", () => {
    expect(getTradingBlogPost("semis-slide-what-the-stops-did")?.date).toBe("2026-11-20");
    expect(getTradingBlogPost("no-such-post")).toBeUndefined();
  });
});

describe("trading blog helpers", () => {
  it("formats dates without timezone drift", () => {
    expect(formatPostDate("2026-11-20")).toBe("November 20, 2026");
    expect(formatPostDate("2027-01-01")).toBe("January 1, 2027");
    expect(formatPostDate("garbage")).toBe("garbage");
  });

  it("indexes a series to 100 and reports its total change", () => {
    expect(indexTo100([50, 75, 25])).toEqual([100, 150, 50]);
    expect(totalChangePct([200, 150])).toBeCloseTo(-25);
    expect(indexTo100([0, 1])).toEqual([100, 100]);
  });

  it("rounds reading time at 230 words a minute", () => {
    expect(readingMinutesFor(1150)).toBe(5);
    expect(readingMinutesFor(40)).toBe(1);
  });

  it("formats signed percentages with a real minus sign", () => {
    expect(signedPct(-11.19)).toBe("−11.2%");
    expect(signedPct(1.64)).toBe("+1.6%");
  });
});

/* The post's prose quotes these figures. If someone edits the data, the
   sentences in page.tsx must change with it; these tests are the tripwire. */
describe("semis-slide post data", () => {
  it("uses one shared window for every series", () => {
    expect(DATES[0]).toBe("2026-10-28");
    expect(DATES[DATES.length - 1]).toBe("2026-11-20");
    for (const series of [ACCOUNT, SP500, NDX, SOX, NVDA]) {
      expect(series.length).toBe(DATES.length);
    }
  });

  it("matches the window changes quoted in the post", () => {
    expect(totalChangePct(ACCOUNT).toFixed(1)).toBe("-11.2");
    expect(totalChangePct(SP500).toFixed(1)).toBe("-10.8");
    expect(totalChangePct(NDX).toFixed(1)).toBe("-16.0");
    expect(totalChangePct(SOX).toFixed(1)).toBe("-28.0");
    expect(totalChangePct(NVDA).toFixed(1)).toBe("-41.7");
  });

  it("matches the after-the-exits figures quoted in the post", () => {
    const from = (DATES as readonly string[]).indexOf("2026-11-12");
    expect(totalChangePct(ACCOUNT.slice(from)).toFixed(1)).toBe("-4.0");
    expect(totalChangePct(SOX.slice(from)).toFixed(1)).toBe("-20.0");
    expect(totalChangePct(NVDA.slice(from)).toFixed(1)).toBe("-24.5");
    expect(totalChangePct(ACCOUNT.slice(-2)).toFixed(1)).toBe("-1.6");
    expect(totalChangePct(SOX.slice(-2)).toFixed(1)).toBe("-10.7");
    expect(totalChangePct(NVDA.slice(-2)).toFixed(1)).toBe("-14.0");
  });

  it("matches the low point quoted in the post", () => {
    const low = Math.min(...ACCOUNT);
    expect(low).toBe(87503.09);
    expect(DATES[(ACCOUNT as readonly number[]).indexOf(low)]).toBe("2026-11-05");
    expect(((low / ACCOUNT[0] - 1) * 100).toFixed(1)).toBe("-13.1");
  });

  it("counts 17 trading days after the October 28 close", () => {
    expect(DATES.length - 1).toBe(17);
  });

  it("has the NVDA sequence the post describes", () => {
    const buys = NVDA_SEQUENCE.filter((f) => f.side === "buy");
    const sells = NVDA_SEQUENCE.filter((f) => f.side === "sell");
    expect(buys.length).toBe(7);
    expect(sells.map((f) => f.price)).toEqual([204.65, 156.4]);
    expect(NVDA_SEQUENCE[0].side).toBe("sell");
    expect(NVDA_SEQUENCE[NVDA_SEQUENCE.length - 1].side).toBe("sell");
    // "The first four fills came between $205.39 and $208.34 ... the last three ... below it."
    const above = buys.slice(0, 4).map((f) => f.price);
    expect(Math.min(...above)).toBe(205.39);
    expect(Math.max(...above)).toBe(208.34);
    expect(buys.slice(4).map((f) => f.price)).toEqual([191.57, 194.1, 171.67]);
    for (const f of buys.slice(4)) expect(f.price).toBeLessThan(NVDA_STOP);
  });

  it("shows the rule change the post describes", () => {
    expect(RULES_BEFORE).not.toContain("rearm: 120");
    expect(RULES_BEFORE).toContain("state: armed\n  rearm: 90");
    expect(RULES_SINCE).toContain("rearm: 120");
    expect(RULES_SINCE).toContain("state: disabled");
  });

  it("lists exits that all sold above where the stock closed on Nov 20", () => {
    expect(EXITS.length).toBe(7);
    for (const exit of EXITS) {
      expect(exit.soldAt).toBeGreaterThan(exit.lastClose);
    }
  });
});
