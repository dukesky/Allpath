// app/api/share/featured/route.ts
import { NextResponse } from "next/server";
import {
  FEATURED_CACHE_CONTROL,
  FEATURED_CACHE_TTL_MS,
  FEATURED_DEFAULT_LIMIT,
  FEATURED_FAILURE_RETRY_MS,
  createTtlCache
} from "@/lib/featuredShares";
import { getFeaturedShares } from "@/lib/share";
import { FeaturedShareSummary } from "@/lib/types";

// Never prerender: the build container has no GCP credentials and a Firestore
// call during `next build` hangs it.
export const dynamic = "force-dynamic";

// Per-instance cache of computed summaries so landing-page traffic doesn't read
// full share transcripts from Firestore on every request.
const featuredSharesCache = createTtlCache<FeaturedShareSummary[]>({
  load: () => getFeaturedShares(FEATURED_DEFAULT_LIMIT),
  ttlMs: FEATURED_CACHE_TTL_MS,
  failureRetryMs: FEATURED_FAILURE_RETRY_MS,
  onError: (error) => {
    console.error("[share] Featured shares fetch failed:", error);
  }
});

export async function GET() {
  try {
    const shares = await featuredSharesCache.get();
    return NextResponse.json(
      { shares },
      { headers: { "Cache-Control": FEATURED_CACHE_CONTROL } }
    );
  } catch {
    // Already logged via onError. Don't let a shared cache hold on to the empty
    // fallback — the landing page simply hides the section.
    return NextResponse.json({ shares: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
