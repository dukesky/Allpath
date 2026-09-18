"use client";

import { useRouter } from "next/navigation";
import { ShareForkIntent, writeShareForkRequest } from "@/lib/shareFork";

const LABELS: Record<ShareForkIntent, string> = {
  fresh: "Ask this team your own question →",
  continue: "Continue this conversation"
};

export function StartFromHereButton({
  shareId,
  intent
}: {
  shareId: string;
  intent: ShareForkIntent;
}) {
  const router = useRouter();

  function handleClick() {
    writeShareForkRequest(sessionStorage, { shareId, intent });
    router.push("/chat");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        intent === "fresh"
          ? "rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          : "rounded-xl border border-indigo-200 bg-white px-6 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
      }
    >
      {LABELS[intent]}
    </button>
  );
}

// Both share → chat CTAs; "fresh" is the primary action.
export function StartFromHereButtons({
  shareId,
  className = ""
}: {
  shareId: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap ${className}`}>
      <StartFromHereButton shareId={shareId} intent="fresh" />
      <StartFromHereButton shareId={shareId} intent="continue" />
    </div>
  );
}
