/**
 * Registry for the Trading Agent blog (`/trading/blog`).
 *
 * Adding a post takes two steps:
 *   1. add its entry to `TRADING_BLOG_POSTS` below, and
 *   2. create `app/trading/blog/<slug>/page.tsx`, which renders its body
 *      inside `<BlogPostShell post={...}>`.
 * A test checks that every slug listed here has its page file.
 *
 * Posts are plain TSX on purpose: the site has no Markdown pipeline, and a
 * post that needs a table or an inline SVG chart can use them directly.
 */

export type TradingBlogPost = {
  /** URL segment under /trading/blog. Lowercase kebab-case. */
  slug: string;
  title: string;
  /** One or two sentences: index card, meta description, social preview. */
  summary: string;
  /** Publication date, YYYY-MM-DD. */
  date: string;
  readingMinutes: number;
  tags: readonly string[];
};

export const TRADING_BLOG_POSTS: readonly TradingBlogPost[] = [
  {
    slug: "semis-slide-what-the-stops-did",
    title: "Heavy in semis through the NVDA slide: what the stops did",
    summary:
      "Seventeen trading days, a chip index down 28%, and a paper account that started the stretch 99% invested. What the exit rules did, and where we got in their way.",
    date: "2026-11-20",
    readingMinutes: 4,
    tags: ["paper account", "stops", "post-mortem"]
  }
];

/** Newest first. */
export function listTradingBlogPosts(): TradingBlogPost[] {
  return [...TRADING_BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getTradingBlogPost(slug: string): TradingBlogPost | undefined {
  return TRADING_BLOG_POSTS.find((post) => post.slug === slug);
}

/** "2026-11-20" → "November 20, 2026". Timezone-free: no Date parsing. */
export function formatPostDate(date: string): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d || m > 12) return date;
  return `${months[m - 1]} ${d}, ${y}`;
}

/* ── Chart helpers ──────────────────────────────────────────────────────── */

export type IndexedSeries = {
  label: string;
  /** Raw daily values, one per date in the chart's shared date list. */
  values: readonly number[];
};

/** Rebase a series so its first value is 100. */
export function indexTo100(values: readonly number[]): number[] {
  const base = values[0];
  if (!base) return values.map(() => 100);
  return values.map((v) => (v / base) * 100);
}

/** Percentage change from the first to the last value, e.g. -11.2. */
export function totalChangePct(values: readonly number[]): number {
  const first = values[0];
  const last = values[values.length - 1];
  if (!first || last === undefined) return 0;
  return (last / first - 1) * 100;
}

export function signedPct(n: number, digits = 1): string {
  // U+2212 minus, so negatives line up with the "+" in tabular figures.
  return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}%`;
}
