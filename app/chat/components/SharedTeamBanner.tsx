"use client";

import { Fragment, ReactNode } from "react";
import Link from "next/link";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { BlockedShareFork } from "./types";

interface SharedTeamBannerProps {
  fork: BlockedShareFork;
  showInviteHint: boolean;
  showSignInHint: boolean;
  isStarting: boolean;
  onStart: () => void;
  onDismiss: () => void;
}

// Renders "a, b or c" from a list of inline hint nodes.
function joinHints(parts: ReactNode[]): ReactNode[] {
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 && (index === parts.length - 1 ? " or " : ", ")}
      {part}
    </Fragment>
  ));
}

// Shown at the top of the setup panel when a share → chat fork could not
// start (usually no trial access yet). Start retries the same fork.
export function SharedTeamBanner({
  fork,
  showInviteHint,
  showSignInHint,
  isStarting,
  onStart,
  onDismiss,
}: SharedTeamBannerProps) {
  const { record, request, reason, errorMessage } = fork;
  const isContinue = request.intent === "continue";
  const title = record.title || "Shared conversation";

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-indigo-900">
            {isContinue ? "Continue this shared conversation" : "Ask this shared team your own question"}
          </p>
          <p className="mt-0.5 break-words text-xs text-indigo-800">
            {isContinue
              ? `“${title}” · ${record.transcript.length} messages carry over`
              : `From “${title}” · starts a fresh conversation`}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          disabled={isStarting}
          aria-label="Dismiss shared team"
          className="shrink-0 rounded-md px-2 py-0.5 text-xs text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {record.agentConfig.map((agent, index) => (
          <div
            key={`${agent.id}-${index}`}
            className="flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-2 py-1"
          >
            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-200">
              <img
                src={agent.avatarUrl || getDefaultAvatarUrl(index)}
                alt={agent.label}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 pr-1">
              <p className="text-xs font-medium text-slate-800">{agent.label}</p>
              {agent.model && (
                <p className="text-[10px] text-slate-500">{agent.model.split("/")[1] ?? agent.model}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {reason === "access" ? (
        <p className="mt-3 text-xs text-indigo-900">
          To start chatting with this team,{" "}
          {joinHints([
            ...(showInviteHint ? ["redeem an invite code below"] : []),
            <>
              add your own OpenRouter API key in{" "}
              <Link href="/profile" className="font-medium underline">
                User Profile
              </Link>
            </>,
            ...(showSignInHint ? ["sign in"] : []),
          ])}
          , then press Start.
        </p>
      ) : (
        <p className="mt-3 text-xs text-rose-700">
          Couldn&apos;t start this conversation{errorMessage ? `: ${errorMessage}` : "."}
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={isStarting}
        className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {isStarting ? "Starting..." : "Start"}
      </button>
    </div>
  );
}

// Share → chat hand-off problems that leave no team to show (expired share,
// load failure). Lives in the setup panel so it is visible on mobile too.
export function ShareForkNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="flex items-start justify-between gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900"
      role="alert"
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-md px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-100"
      >
        Dismiss
      </button>
    </div>
  );
}
