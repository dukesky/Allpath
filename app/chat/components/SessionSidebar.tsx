"use client";

import { getDefaultAvatarUrl } from "@/lib/avatar";
import { SessionMeta, SessionMemberMeta } from "./types";
import { initialsForLabel } from "./utils";

interface SessionSidebarProps {
  sessionList: SessionMeta[];
  sessionId: string | null;
  expandedSessionMembers: Record<string, boolean>;
  onOpenSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onToggleMemberExpansion: (id: string) => void;
  onToggleMute: (sessionId: string, participantId: string, muted: boolean) => void;
}

export function SessionSidebar({
  sessionList,
  sessionId,
  expandedSessionMembers,
  onOpenSession,
  onDeleteSession,
  onToggleMemberExpansion,
  onToggleMute,
}: SessionSidebarProps) {
  return (
    <section className="h-full min-h-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700">Sessions</h2>
      <p className="mt-1 text-xs text-slate-500">Open a previous session and continue chatting.</p>
      <div className="mt-3 space-y-2 overflow-y-auto">
        {sessionList.length === 0 && (
          <div className="rounded-lg border border-slate-200 p-2 text-xs text-slate-500">
            No saved sessions yet.
          </div>
        )}
        {sessionList.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border px-2 py-2 text-xs ${
              item.id === sessionId
                ? "border-primary bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600"
            }`}
          >
            <div className="flex items-start gap-2">
              <button
                className="flex-1 text-left"
                onClick={() => onOpenSession(item.id)}
                type="button"
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {item.members.slice(0, 4).map((member, memberIndex) => (
                      <div
                        key={member.id}
                        className={`relative h-8 w-8 overflow-hidden rounded-full border-2 border-white ${
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
                  <p className="text-[10px] text-slate-500">{item.members.length} members</p>
                </div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 font-mono text-[10px]">{item.id}</p>
              </button>
              <div className="flex flex-col gap-1">
                <button
                  className="rounded-md border border-slate-300 px-2 py-1 text-[10px] text-slate-600"
                  onClick={() => onToggleMemberExpansion(item.id)}
                  type="button"
                >
                  {expandedSessionMembers[item.id] ? "Hide" : "Members"}
                </button>
                <button
                  className="rounded-md border border-slate-300 px-2 py-1 text-[10px] text-slate-600"
                  onClick={() => onDeleteSession(item.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
            {expandedSessionMembers[item.id] && (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white/70 p-2">
                {item.members.map((member: SessionMemberMeta) => (
                  <div key={member.id} className="flex items-center gap-2 rounded-md border border-slate-200 p-2">
                    <div className={`relative h-10 w-10 overflow-hidden rounded-full bg-slate-100 ${member.muted ? "opacity-50" : ""}`}>
                      {member.avatarUrl ? (
                        <img
                          alt={member.label}
                          className="h-full w-full object-cover"
                          src={member.avatarUrl}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-700">
                          {initialsForLabel(member.label)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{member.label}</p>
                      <p className="truncate text-[10px] text-slate-500">{member.model ?? "model not set"}</p>
                    </div>
                    <button
                      className={`rounded-md px-2 py-1 text-[10px] ${
                        member.muted
                          ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border border-amber-300 bg-amber-50 text-amber-700"
                      }`}
                      onClick={() => onToggleMute(item.id, member.id, !member.muted)}
                      type="button"
                    >
                      {member.muted ? "Unmute" : "Mute"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
