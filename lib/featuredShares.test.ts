import { describe, expect, it, vi } from "vitest";
import {
  FEATURED_CACHE_TTL_MS,
  FEATURED_EXCERPT_MAX_CHARS,
  FEATURED_FAILURE_RETRY_MS,
  buildFeaturedShareSummary,
  buildShareExcerpt,
  createTtlCache,
  formatFeaturedModeLabel,
  isCacheEntryFresh,
  isShareExpired,
  parseFeaturedSharesResponse,
  selectFeaturedShareSummaries,
  sortByFeaturedAtDesc
} from "./featuredShares";
import { Message, ShareRecord } from "./types";

let messageCounter = 0;
function msg(overrides: Partial<Message>): Message {
  messageCounter += 1;
  return {
    messageId: `m${messageCounter}`,
    roundId: 1,
    sourceRole: "assistant",
    sourceLabel: "Alice",
    createdAt: "2026-09-18T10:00:00.000Z",
    status: "completed",
    content: "hello",
    ...overrides
  };
}

function record(overrides: Partial<ShareRecord> = {}): ShareRecord {
  return {
    shareId: "share-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-08-31T00:00:00.000Z",
    mode: "roundtable",
    title: "Should we raise prices?",
    transcript: [
      msg({ sourceRole: "user", sourceLabel: "You", content: "Should we raise prices?" }),
      msg({ sourceLabel: "Alice", content: "Raise them for new customers first." }),
      msg({ sourceLabel: "Bob", content: "Keep them flat until churn drops." })
    ],
    agentConfig: [
      {
        id: "a1",
        label: "Alice",
        avatarUrl: "/avatars/sun-wukong.png",
        model: "openai/gpt-5-mini",
        roleTitle: "Strategist",
        character: "Bold and direct."
      },
      { id: "a2", label: "Bob", model: "anthropic/claude-sonnet-4" }
    ],
    featured: true,
    featuredAt: "2026-09-10T00:00:00.000Z",
    ...overrides
  };
}

describe("isShareExpired", () => {
  const now = new Date("2026-09-18T00:00:00.000Z");

  it("treats past expiresAt as expired for normal shares", () => {
    expect(isShareExpired({ expiresAt: "2026-09-01T00:00:00.000Z" }, now)).toBe(true);
    expect(isShareExpired({ expiresAt: "2026-10-01T00:00:00.000Z" }, now)).toBe(false);
  });

  it("never expires featured shares", () => {
    expect(isShareExpired({ expiresAt: "2026-09-01T00:00:00.000Z", featured: true }, now)).toBe(false);
  });

  it("does not expire shares without a valid expiresAt", () => {
    expect(isShareExpired({ expiresAt: "" }, now)).toBe(false);
    expect(isShareExpired({ expiresAt: "not a date" }, now)).toBe(false);
  });
});

describe("buildShareExcerpt", () => {
  it("returns short text unchanged apart from whitespace normalisation", () => {
    expect(buildShareExcerpt("  Hello\n\n  world  ")).toBe("Hello world");
  });

  it("strips common markdown markers", () => {
    expect(buildShareExcerpt("- **Raise** prices `now`\n> quoted\n1. first\n```ts\ncode()\n```")).toBe(
      "Raise prices now quoted first code()"
    );
  });

  it("drops heading lines so they don't run into the prose", () => {
    expect(buildShareExcerpt("## Verdict\n\n**Yes** — raise prices.\n### Why\nMargins.")).toBe(
      "Yes — raise prices. Margins."
    );
  });

  it("keeps heading text when the message is only headings", () => {
    expect(buildShareExcerpt("# Short answer\n## No")).toBe("Short answer No");
  });

  it("truncates long text at a word boundary with an ellipsis", () => {
    const text = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
    const excerpt = buildShareExcerpt(text);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(FEATURED_EXCERPT_MAX_CHARS + 1);
    expect(excerpt.length).toBeGreaterThan(FEATURED_EXCERPT_MAX_CHARS - 30);
    // No half-cut words: everything before the ellipsis is whole words from the source.
    const words = excerpt.slice(0, -1).trim().split(" ");
    expect(text.startsWith(words.join(" "))).toBe(true);
    expect(words.at(-1)).toMatch(/^word\d+$/);
  });

  it("hard-cuts a single very long token", () => {
    const excerpt = buildShareExcerpt("x".repeat(400));
    expect(excerpt).toBe("x".repeat(FEATURED_EXCERPT_MAX_CHARS) + "…");
  });

  it("returns an empty string for empty content", () => {
    expect(buildShareExcerpt("   \n ")).toBe("");
  });
});

describe("buildFeaturedShareSummary", () => {
  it("builds the card summary without the transcript", () => {
    const summary = buildFeaturedShareSummary(record());
    expect(summary).toEqual({
      shareId: "share-1",
      title: "Should we raise prices?",
      mode: "roundtable",
      messageCount: 3,
      agents: [
        { label: "Alice", avatarUrl: "/avatars/sun-wukong.png", roleTitle: "Strategist" },
        { label: "Bob" }
      ],
      excerpt: "Raise them for new customers first."
    });
    expect(summary).not.toHaveProperty("transcript");
    expect(summary).not.toHaveProperty("agentConfig");
  });

  it("never exposes model, character or id of agents", () => {
    const summary = buildFeaturedShareSummary(record());
    for (const agent of summary.agents) {
      for (const key of Object.keys(agent)) {
        expect(["label", "avatarUrl", "roleTitle"]).toContain(key);
      }
    }
    expect(JSON.stringify(summary)).not.toContain("openai/gpt-5-mini");
    expect(JSON.stringify(summary)).not.toContain("Bold and direct.");
  });

  it("takes the excerpt from the first completed non-user message", () => {
    const summary = buildFeaturedShareSummary(
      record({
        transcript: [
          msg({ sourceRole: "user", content: "Question?" }),
          msg({ status: "failed", content: "Provider error" }),
          msg({ status: "streaming", content: "partial" }),
          msg({ content: "   " }),
          msg({ sourceRole: "summarizer", sourceLabel: "Summary", content: "The team agrees." }),
          msg({ content: "Later reply" })
        ]
      })
    );
    expect(summary.excerpt).toBe("The team agrees.");
    expect(summary.messageCount).toBe(6);
  });

  it("falls back to an empty excerpt and untitled title", () => {
    const summary = buildFeaturedShareSummary(
      record({ title: "  ", transcript: [msg({ sourceRole: "user", content: "Only me" })] })
    );
    expect(summary.excerpt).toBe("");
    expect(summary.title).toBe("Untitled conversation");
  });

  it("keeps small avatars and drops unsafe or oversized ones", () => {
    const smallDataUrl = `data:image/png;base64,${"A".repeat(100)}`;
    const hugeDataUrl = `data:image/png;base64,${"A".repeat(200_000)}`;
    const summary = buildFeaturedShareSummary(
      record({
        agentConfig: [
          { id: "1", label: "Path", model: "m", avatarUrl: "/avatars/owl.png" },
          { id: "2", label: "Https", model: "m", avatarUrl: "https://example.com/a.png" },
          { id: "3", label: "Small", model: "m", avatarUrl: smallDataUrl },
          { id: "4", label: "Huge", model: "m", avatarUrl: hugeDataUrl },
          { id: "5", label: "Script", model: "m", avatarUrl: "javascript:alert(1)" },
          { id: "6", label: "Protocol-relative", model: "m", avatarUrl: "//evil.example/a.png" },
          { id: "7", label: "Empty", model: "m", avatarUrl: "", roleTitle: "  " }
        ]
      })
    );
    expect(summary.agents).toEqual([
      { label: "Path", avatarUrl: "/avatars/owl.png" },
      { label: "Https", avatarUrl: "https://example.com/a.png" },
      { label: "Small", avatarUrl: smallDataUrl },
      { label: "Huge" },
      { label: "Script" },
      { label: "Protocol-relative" },
      { label: "Empty" }
    ]);
  });

  it("tolerates malformed records", () => {
    const summary = buildFeaturedShareSummary({
      shareId: "s",
      title: "T",
      mode: "one_to_one"
    } as unknown as ShareRecord);
    expect(summary).toEqual({
      shareId: "s",
      title: "T",
      mode: "one_to_one",
      messageCount: 0,
      agents: [],
      excerpt: ""
    });
  });
});

describe("sortByFeaturedAtDesc", () => {
  it("orders newest featuredAt first, missing or invalid dates last, without mutating input", () => {
    const input = [
      { id: "old", featuredAt: "2026-09-01T00:00:00.000Z" },
      { id: "none" },
      { id: "new", featuredAt: "2026-09-15T00:00:00.000Z" },
      { id: "bad", featuredAt: "garbage" },
      { id: "mid", featuredAt: "2026-09-10T00:00:00.000Z" }
    ];
    const snapshot = input.map((r) => r.id);
    expect(sortByFeaturedAtDesc(input).map((r) => r.id)).toEqual(["new", "mid", "old", "none", "bad"]);
    expect(input.map((r) => r.id)).toEqual(snapshot);
  });
});

describe("selectFeaturedShareSummaries", () => {
  it("keeps only featured records, sorts by featuredAt desc and applies the limit", () => {
    const records = [
      record({ shareId: "a", featuredAt: "2026-09-01T00:00:00.000Z" }),
      record({ shareId: "b", featuredAt: "2026-09-12T00:00:00.000Z" }),
      record({ shareId: "c", featured: false, featuredAt: "2026-09-17T00:00:00.000Z" }),
      record({ shareId: "d", featuredAt: "2026-09-05T00:00:00.000Z" }),
      record({ shareId: "e", featuredAt: "2026-09-08T00:00:00.000Z" })
    ];
    expect(selectFeaturedShareSummaries(records).map((s) => s.shareId)).toEqual(["b", "e", "d"]);
    expect(selectFeaturedShareSummaries(records, 10).map((s) => s.shareId)).toEqual([
      "b",
      "e",
      "d",
      "a"
    ]);
    expect(selectFeaturedShareSummaries(records, 0)).toEqual([]);
  });

  it("skips records without a usable shareId", () => {
    const records = [record({ shareId: "" }), record({ shareId: "ok" })];
    expect(selectFeaturedShareSummaries(records).map((s) => s.shareId)).toEqual(["ok"]);
  });
});

describe("parseFeaturedSharesResponse", () => {
  it("returns valid summaries and drops malformed entries", () => {
    const good = buildFeaturedShareSummary(record());
    expect(
      parseFeaturedSharesResponse({
        shares: [good, null, { shareId: 5 }, { ...good, shareId: "" }, { ...good, agents: "x" }]
      })
    ).toEqual([good]);
  });

  it("returns an empty list for anything that is not a share list", () => {
    expect(parseFeaturedSharesResponse(null)).toEqual([]);
    expect(parseFeaturedSharesResponse({})).toEqual([]);
    expect(parseFeaturedSharesResponse({ shares: "nope" })).toEqual([]);
    expect(parseFeaturedSharesResponse("text")).toEqual([]);
  });

  it("caps the list at three cards", () => {
    const good = buildFeaturedShareSummary(record());
    const shares = ["a", "b", "c", "d"].map((shareId) => ({ ...good, shareId }));
    expect(parseFeaturedSharesResponse({ shares }).map((s) => s.shareId)).toEqual(["a", "b", "c"]);
  });
});

describe("formatFeaturedModeLabel", () => {
  it("labels both modes", () => {
    expect(formatFeaturedModeLabel("roundtable")).toBe("Round table");
    expect(formatFeaturedModeLabel("one_to_one")).toBe("One-to-one");
  });
});

describe("isCacheEntryFresh", () => {
  it("is fresh only within the TTL", () => {
    expect(isCacheEntryFresh(null, 1_000, FEATURED_CACHE_TTL_MS)).toBe(false);
    expect(isCacheEntryFresh(1_000, 1_000, FEATURED_CACHE_TTL_MS)).toBe(true);
    expect(isCacheEntryFresh(1_000, 1_000 + FEATURED_CACHE_TTL_MS - 1, FEATURED_CACHE_TTL_MS)).toBe(true);
    expect(isCacheEntryFresh(1_000, 1_000 + FEATURED_CACHE_TTL_MS, FEATURED_CACHE_TTL_MS)).toBe(false);
  });

  it("treats a clock that moved backwards as stale", () => {
    expect(isCacheEntryFresh(5_000, 1_000, FEATURED_CACHE_TTL_MS)).toBe(false);
  });

  it("uses a five-minute TTL for featured shares", () => {
    expect(FEATURED_CACHE_TTL_MS).toBe(5 * 60 * 1000);
    expect(FEATURED_FAILURE_RETRY_MS).toBeLessThan(FEATURED_CACHE_TTL_MS);
  });
});

describe("createTtlCache", () => {
  function setup(load: () => Promise<string[]>) {
    let clock = 0;
    const onError = vi.fn();
    const loadSpy = vi.fn(load);
    const cache = createTtlCache<string[]>({
      load: loadSpy,
      ttlMs: 1_000,
      failureRetryMs: 100,
      now: () => clock,
      onError
    });
    return {
      cache,
      loadSpy,
      onError,
      advance: (ms: number) => {
        clock += ms;
      }
    };
  }

  it("serves cached values within the TTL and reloads after it", async () => {
    let n = 0;
    const { cache, loadSpy, advance } = setup(async () => [`v${++n}`]);
    expect(await cache.get()).toEqual(["v1"]);
    advance(999);
    expect(await cache.get()).toEqual(["v1"]);
    expect(loadSpy).toHaveBeenCalledTimes(1);
    advance(1);
    expect(await cache.get()).toEqual(["v2"]);
    expect(loadSpy).toHaveBeenCalledTimes(2);
  });

  it("caches an empty successful result like any other value", async () => {
    const { cache, loadSpy, advance } = setup(async () => []);
    expect(await cache.get()).toEqual([]);
    advance(500);
    expect(await cache.get()).toEqual([]);
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    let resolve!: (value: string[]) => void;
    const { cache, loadSpy } = setup(
      () =>
        new Promise<string[]>((r) => {
          resolve = r;
        })
    );
    const a = cache.get();
    const b = cache.get();
    resolve(["x"]);
    expect(await a).toEqual(["x"]);
    expect(await b).toEqual(["x"]);
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failure for the full TTL", async () => {
    let fail = true;
    const { cache, loadSpy, onError, advance } = setup(async () => {
      if (fail) throw new Error("firestore down");
      return ["ok"];
    });
    await expect(cache.get()).rejects.toThrow("firestore down");
    expect(onError).toHaveBeenCalledTimes(1);

    // Within the short retry window the failure is not retried...
    advance(50);
    await expect(cache.get()).rejects.toThrow("firestore down");
    expect(loadSpy).toHaveBeenCalledTimes(1);

    // ...but well before the TTL it is.
    fail = false;
    advance(50);
    expect(await cache.get()).toEqual(["ok"]);
    expect(loadSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps serving the last good value when a refresh fails", async () => {
    let fail = false;
    const { cache, loadSpy, onError, advance } = setup(async () => {
      if (fail) throw new Error("boom");
      return ["good"];
    });
    expect(await cache.get()).toEqual(["good"]);
    fail = true;
    advance(1_000);
    expect(await cache.get()).toEqual(["good"]);
    expect(onError).toHaveBeenCalledTimes(1);
    advance(50);
    expect(await cache.get()).toEqual(["good"]);
    expect(loadSpy).toHaveBeenCalledTimes(2);
    fail = false;
    advance(50);
    expect(await cache.get()).toEqual(["good"]);
    expect(loadSpy).toHaveBeenCalledTimes(3);
  });
});
