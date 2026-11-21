"use client";

import { useState } from "react";

/* The only client-side island on the page: one clipboard button, used for
   the agent-setup prompt and for blog code blocks. Falls back silently if the Clipboard API is blocked
   (http origins, old browsers) — the text is still selectable by hand. */
export default function CopyButton({ text, label = "Copy prompt" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* selection fallback only */
        }
      }}
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-primary hover:text-white"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
