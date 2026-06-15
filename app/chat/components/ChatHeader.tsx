"use client";

import { Message } from "@/lib/types";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { SessionMemberMeta } from "./types";

interface ChatHeaderProps {
  sessionId: string | null;
  status: string;
  roundNumber: number;
  activeSessionMembers: SessionMemberMeta[];
  isChatMembersOpen: boolean;
  isSharing: boolean;
  shareUrl: string | null;
  groupedMessages: Message[];
  onToggleChatMembers: () => void;
  onToggleMute: (sessionId: string, participantId: string, muted: boolean) => void;
  onShare: () => void;
  onDismissShare: () => void;
  onCopyShare: () => void;
}

export function ChatHeader({
  sessionId,
  status,
  roundNumber,
  activeSessionMembers,
  isChatMembersOpen,
  isSharing,
  shareUrl,
  groupedMessages,
  onToggleChatMembers,
  onToggleMute,
  onShare,
  onDismissShare,
  onCopyShare,
}: ChatHeaderProps) {
  return (
    <header className="border-b border-slate-200 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-600">
            Session: <span className="font-mono text-xs">{sessionId ?? "not created"}</span> | Status: {status} |
            Round: {roundNumber}
          </p>
          {sessionId && activeSessionMembers.length > 0 && (
            <div className="mt-3">
              <button
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left"
                type="button"
                onClick={onToggleChatMembers}
              >
                <div className="flex -space-x-2">
                  {activeSessionMembers.slice(0, 5).map((member, memberIndex) => (
                    <div
                      key={member.id}
                      className={`relative h-9 w-9 overflow-hidden rounded-full border-2 border-white ${
                        member.muted ? "opacity-50" : ""
                      }`}
                    >
                      <img
                        alt={member.label}
                        className="h-full w-full object-cover"
                        src={member.avatarUrl || getDefaultAvatarUrl(memberIndex)}
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700">
                    {activeSessionMembers.filter((member) => !member.muted).length} active / {activeSessionMembers.length} members
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isChatMembersOpen ? "Hide members" : "Show members"}
                  </p>
                </div>
              </button>
              {isChatMembersOpen && (
                <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-2">
                  {activeSessionMembers.map((member, memberIndex) => (
                    <div key={member.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
                      <div className={`relative h-10 w-10 overflow-hidden rounded-full bg-slate-100 ${member.muted ? "opacity-50" : ""}`}>
                        <img
                          alt={member.label}
                          className="h-full w-full object-cover"
                          src={member.avatarUrl || getDefaultAvatarUrl(memberIndex)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{member.label}</p>
                        <p className="truncate text-[11px] text-slate-500">{member.model ?? "model not set"}</p>
                      </div>
                      <button
                        className={`rounded-md px-2 py-1 text-[11px] ${
                          member.muted
                            ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border border-amber-300 bg-amber-50 text-amber-700"
                        }`}
                        disabled={!sessionId}
                        onClick={() => {
                          if (!sessionId) {
                            return;
                          }
                          onToggleMute(sessionId, member.id, !member.muted);
                        }}
                        type="button"
                      >
                        {member.muted ? "Unmute" : "Mute"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {sessionId && groupedMessages.some((m) => m.sourceRole !== "user" && m.status === "completed") && (
          <div className="relative self-start lg:self-auto">
            <button
              type="button"
              onClick={onShare}
              disabled={isSharing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {isSharing ? "Sharing…" : "Share"}
            </button>
            {shareUrl && (
              <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <p className="text-xs font-semibold text-slate-700">Link copied to clipboard</p>
                <p className="mt-1 break-all text-xs text-slate-500">{shareUrl}</p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={onCopyShare}
                  >
                    Copy again
                  </button>
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:underline"
                    onClick={onDismissShare}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
