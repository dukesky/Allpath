import {
  FeaturedShareAgent,
  FeaturedShareSummary,
  Message,
  Mode,
  ShareableParticipant,
  ShareRecord
} from "@/lib/types";

// Pure helpers for featured shares on the landing page. No Firestore access here:
// lib/share.ts::getFeaturedShares() does the query and hands records to these.

export const FEATURED_DEFAULT_LIMIT = 3;
// Single-field equality query only (no composite index); sorted in memory.
export const FEATURED_QUERY_LIMIT = 20;
export const FEATURED_EXCERPT_MAX_CHARS = 160;
// Server-side cache of computed summaries (per instance). Share docs hold full
// transcripts, so the landing page must not trigger a Firestore read per visit.
export const FEATURED_CACHE_TTL_MS = 5 * 60 * 1000;
// After a failed fetch, retry this soon — a failure is never cached for the full TTL.
export const FEATURED_FAILURE_RETRY_MS = 30 * 1000;
export const FEATURED_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

const UNTITLED_TITLE = "Untitled conversation";
const MAX_TITLE_CHARS = 120;
const MAX_URL_AVATAR_CHARS = 2048;
// Custom avatars are stored as data URLs (up to ~2.7 MB). Only small ones are
// inlined into summaries; the landing card falls back to a default avatar.
const MAX_INLINE_AVATAR_CHARS = 64 * 1024;

const MODE_LABELS: Record<Mode, string> = {
  roundtable: "Round table",
  one_to_one: "One-to-one"
};

export function formatFeaturedModeLabel(mode: Mode): string {
  return MODE_LABELS[mode] ?? MODE_LABELS.roundtable;
}

export function isShareExpired(
  record: { expiresAt?: string; featured?: boolean },
  now: Date = new Date()
): boolean {
  if (record.featured === true) {
    return false;
  }
  if (!record.expiresAt) {
    return false;
  }
  const expiresAt = Date.parse(record.expiresAt);
  if (Number.isNaN(expiresAt)) {
    return false;
  }
  return expiresAt < now.getTime();
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function sanitizeAvatarUrl(value: unknown): string | undefined {
  const url = cleanText(value);
  if (!url) {
    return undefined;
  }
  // Site-relative path (but not protocol-relative "//host" or "/\host").
  if (/^\/(?![/\\])/.test(url) || /^https?:\/\//i.test(url)) {
    return url.length <= MAX_URL_AVATAR_CHARS ? url : undefined;
  }
  if (/^data:image\//i.test(url) && url.length <= MAX_INLINE_AVATAR_CHARS) {
    return url;
  }
  return undefined;
}

export function buildShareExcerpt(
  content: string,
  maxChars: number = FEATURED_EXCERPT_MAX_CHARS
): string {
  const lines = String(content ?? "")
    .replace(/```[^\n]*/g, " ")
    .split("\n");
  const isHeading = (line: string) => /^\s*#{1,6}\s+/.test(line);
  // Headings ("## Verdict") read badly when run into prose; keep them only if
  // the message has nothing else.
  const hasProse = lines.some((line) => line.trim() && !isHeading(line));
  const plain = lines
    .filter((line) => !hasProse || !isHeading(line))
    .map((line) => line.replace(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/, ""))
    .join(" ")
    .replace(/\*+|__|`+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxChars) {
    return plain;
  }

  const slice = plain.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace >= maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s,;:.\-–—]+$/, "")}…`;
}

function excerptFromTranscript(transcript: Message[]): string {
  for (const message of transcript) {
    if (
      !message ||
      message.sourceRole === "user" ||
      message.status !== "completed" ||
      typeof message.content !== "string"
    ) {
      continue;
    }
    const excerpt = buildShareExcerpt(message.content);
    if (excerpt) {
      return excerpt;
    }
  }
  return "";
}

function toFeaturedAgent(agent: ShareableParticipant): FeaturedShareAgent | null {
  const label = cleanText(agent?.label);
  if (!label) {
    return null;
  }
  const result: FeaturedShareAgent = { label };
  const avatarUrl = sanitizeAvatarUrl(agent.avatarUrl);
  if (avatarUrl) {
    result.avatarUrl = avatarUrl;
  }
  const roleTitle = cleanText(agent.roleTitle);
  if (roleTitle) {
    result.roleTitle = roleTitle;
  }
  return result;
}

export function buildFeaturedShareSummary(record: ShareRecord): FeaturedShareSummary {
  const transcript = Array.isArray(record.transcript) ? record.transcript : [];
  const agentConfig = Array.isArray(record.agentConfig) ? record.agentConfig : [];
  const title = cleanText(record.title) ?? UNTITLED_TITLE;

  return {
    shareId: record.shareId,
    title: title.length > MAX_TITLE_CHARS ? `${title.slice(0, MAX_TITLE_CHARS - 1)}…` : title,
    mode: record.mode === "one_to_one" ? "one_to_one" : "roundtable",
    messageCount: transcript.length,
    agents: agentConfig
      .map(toFeaturedAgent)
      .filter((agent): agent is FeaturedShareAgent => agent !== null),
    excerpt: excerptFromTranscript(transcript)
  };
}

function featuredTime(value: unknown): number {
  if (typeof value !== "string") {
    return Number.NEGATIVE_INFINITY;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

export function sortByFeaturedAtDesc<T extends { featuredAt?: string }>(records: readonly T[]): T[] {
  return [...records].sort((a, b) => {
    const ta = featuredTime(a.featuredAt);
    const tb = featuredTime(b.featuredAt);
    if (ta === tb) {
      return 0;
    }
    return tb > ta ? 1 : -1;
  });
}

export function selectFeaturedShareSummaries(
  records: readonly ShareRecord[],
  limit: number = FEATURED_DEFAULT_LIMIT
): FeaturedShareSummary[] {
  const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : FEATURED_DEFAULT_LIMIT;
  if (max === 0) {
    return [];
  }
  const featured = records.filter(
    (record) => record?.featured === true && Boolean(cleanText(record.shareId))
  );
  return sortByFeaturedAtDesc(featured).slice(0, max).map(buildFeaturedShareSummary);
}

function isFeaturedShareSummary(value: unknown): value is FeaturedShareSummary {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    Boolean(cleanText(v.shareId)) &&
    typeof v.title === "string" &&
    (v.mode === "roundtable" || v.mode === "one_to_one") &&
    typeof v.messageCount === "number" &&
    typeof v.excerpt === "string" &&
    Array.isArray(v.agents) &&
    v.agents.every(
      (agent) =>
        Boolean(agent) &&
        typeof agent === "object" &&
        typeof (agent as { label?: unknown }).label === "string"
    )
  );
}

// Client-side guard for the /api/share/featured payload.
export function parseFeaturedSharesResponse(
  payload: unknown,
  limit: number = FEATURED_DEFAULT_LIMIT
): FeaturedShareSummary[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const shares = (payload as { shares?: unknown }).shares;
  if (!Array.isArray(shares)) {
    return [];
  }
  return shares.filter(isFeaturedShareSummary).slice(0, limit);
}

export function isCacheEntryFresh(fetchedAt: number | null, now: number, ttlMs: number): boolean {
  if (fetchedAt === null) {
    return false;
  }
  const age = now - fetchedAt;
  return age >= 0 && age < ttlMs;
}

export interface TtlCacheOptions<T> {
  load: () => Promise<T>;
  ttlMs: number;
  // After a failed load, callers get the last good value (or the error) until
  // this much time has passed; then the next call retries.
  failureRetryMs: number;
  now?: () => number;
  onError?: (error: unknown) => void;
}

export interface TtlCache<T> {
  get(): Promise<T>;
}

// Module-level memo with TTL, in-flight de-duplication, stale-on-error and a
// short failure back-off (failures are never cached as a success).
export function createTtlCache<T>(options: TtlCacheOptions<T>): TtlCache<T> {
  const now = options.now ?? Date.now;
  let entry: { value: T; fetchedAt: number } | null = null;
  let failure: { error: unknown; failedAt: number } | null = null;
  let inflight: Promise<T> | null = null;

  function startLoad(): Promise<T> {
    const promise = (async () => {
      try {
        const value = await options.load();
        entry = { value, fetchedAt: now() };
        failure = null;
        return value;
      } catch (error) {
        failure = { error, failedAt: now() };
        options.onError?.(error);
        throw error;
      }
    })();
    inflight = promise;
    const clear = () => {
      if (inflight === promise) {
        inflight = null;
      }
    };
    promise.then(clear, clear);
    return promise;
  }

  return {
    async get(): Promise<T> {
      const t = now();
      if (entry && isCacheEntryFresh(entry.fetchedAt, t, options.ttlMs)) {
        return entry.value;
      }
      if (!inflight && failure && isCacheEntryFresh(failure.failedAt, t, options.failureRetryMs)) {
        if (entry) {
          return entry.value;
        }
        throw failure.error;
      }
      try {
        return await (inflight ?? startLoad());
      } catch (error) {
        if (entry) {
          return entry.value;
        }
        throw error;
      }
    }
  };
}
