"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { formatFeaturedModeLabel, parseFeaturedSharesResponse } from "@/lib/featuredShares";
import { FeaturedShareAgent, FeaturedShareSummary } from "@/lib/types";

const MAX_VISIBLE_AVATARS = 4;
const MAX_LISTED_NAMES = 3;

function formatAgentNames(agents: FeaturedShareAgent[]): string {
  const names = agents.slice(0, MAX_LISTED_NAMES).map((agent) => agent.label);
  const extra = agents.length - names.length;
  return extra > 0 ? `${names.join(", ")} +${extra}` : names.join(", ");
}

function FeaturedCard({ share }: { share: FeaturedShareSummary }) {
  const visibleAgents = share.agents.slice(0, MAX_VISIBLE_AVATARS);
  const hiddenAgentCount = share.agents.length - visibleAgents.length;

  return (
    <Link
      className="group flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white/92 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
      href={`/share/${encodeURIComponent(share.shareId)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex -space-x-2">
          {visibleAgents.map((agent, index) => (
            <div
              key={`${agent.label}-${index}`}
              className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm"
              title={agent.roleTitle ? `${agent.label} — ${agent.roleTitle}` : agent.label}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={agent.label}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  const fallback = getDefaultAvatarUrl(index);
                  if (!event.currentTarget.src.endsWith(fallback)) {
                    event.currentTarget.src = fallback;
                  }
                }}
                src={agent.avatarUrl || getDefaultAvatarUrl(index)}
              />
            </div>
          ))}
          {hiddenAgentCount > 0 && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-semibold text-slate-600 shadow-sm">
              +{hiddenAgentCount}
            </div>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
          {formatFeaturedModeLabel(share.mode)}
        </span>
      </div>

      <h4 className="mt-5 line-clamp-2 text-xl font-semibold tracking-tight">{share.title}</h4>
      <p className="mt-2 text-xs text-slate-500">
        {share.agents.length > 0 && <>{formatAgentNames(share.agents)} · </>}
        {share.messageCount} {share.messageCount === 1 ? "message" : "messages"}
      </p>

      {share.excerpt && (
        <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-700">“{share.excerpt}”</p>
      )}

      <span className="mt-auto pt-6 text-sm font-medium text-primary group-hover:underline">
        Read the conversation →
      </span>
    </Link>
  );
}

// Landing-page section. `/` is statically rendered, so featured shares are
// fetched client-side after mount; renders nothing when empty or on failure.
export function FeaturedConversations() {
  const [shares, setShares] = useState<FeaturedShareSummary[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    // "no-cache": always revalidate instead of letting the browser apply the
    // route's stale-while-revalidate (meant for shared caches). The server keeps
    // its own 5-minute memo, so this stays cheap.
    fetch("/api/share/featured", { cache: "no-cache", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: unknown) => {
        if (!controller.signal.aborted) {
          setShares(parseFeaturedSharesResponse(payload));
        }
      })
      .catch(() => {
        // Network error or aborted — keep the section hidden.
      });
    return () => controller.abort();
  }, []);

  if (shares.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="featured-conversations-heading" className="pb-8">
      <div className="mb-6 flex flex-col gap-3 px-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Featured conversations
          </p>
          <h3
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
            id="featured-conversations-heading"
          >
            See an AI team think it through.
          </h3>
        </div>
        <p className="max-w-md text-sm leading-7 text-slate-700">
          Real multi-agent discussions from AllPath. Read every round, then ask the same team your
          own question.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {shares.map((share) => (
          <FeaturedCard key={share.shareId} share={share} />
        ))}
      </div>
    </section>
  );
}
