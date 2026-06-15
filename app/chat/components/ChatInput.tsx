"use client";

import { FormEvent, Dispatch, SetStateAction } from "react";
import { Mode } from "@/lib/types";
import { SessionMemberMeta, PendingAttachment } from "./types";
import { isImageAttachment, storyExperience } from "./utils";

interface ChatInputProps {
  sessionId: string | null;
  sessionMode: Mode;
  summarizerEnabled: boolean;
  input: string;
  pendingAttachments: PendingAttachment[];
  targetParticipantIds: string[];
  mentionCandidates: SessionMemberMeta[];
  showMentionMenu: boolean;
  activeSessionMembers: SessionMemberMeta[];
  activeStory: string;
  starterPrompts: string[];
  showStarterPrompts: boolean;
  isMobileView: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: (event: FormEvent) => void;
  onSubmitMessageRequest: (content: string, attachments?: PendingAttachment[]) => Promise<void>;
  onAddAttachments: (files: FileList | null) => Promise<void>;
  onRemoveAttachment: (localId: string) => void;
  onSelectMentionTarget: (id: string, label: string) => void;
  onSetTargetParticipantIds: Dispatch<SetStateAction<string[]>>;
  onRunSummarizer: () => Promise<void>;
  onSetLightbox: (image: { src: string; name: string } | null) => void;
}

export function ChatInput({
  sessionId,
  sessionMode,
  summarizerEnabled,
  input,
  pendingAttachments,
  targetParticipantIds,
  mentionCandidates,
  showMentionMenu,
  activeSessionMembers,
  activeStory,
  starterPrompts,
  showStarterPrompts,
  isMobileView,
  onInputChange,
  onSendMessage,
  onSubmitMessageRequest,
  onAddAttachments,
  onRemoveAttachment,
  onSelectMentionTarget,
  onSetTargetParticipantIds,
  onRunSummarizer,
  onSetLightbox,
}: ChatInputProps) {
  return (
    <div className="border-t border-slate-200 p-3">
      {showStarterPrompts && (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {activeStory ? `${activeStory} starter prompts` : "Starter prompts"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {activeStory
              ? storyExperience(activeStory).tagline
              : "Ask one of these to get the conversation moving."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {starterPrompts.slice(0, 4).map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
                onClick={() => void onSubmitMessageRequest(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
      {sessionMode === "one_to_one" && (
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="text-slate-500">Targets:</span>
          {targetParticipantIds.length === 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">All agents</span>
          ) : (
            targetParticipantIds.map((targetId) => {
              const target = activeSessionMembers.find((participant) => participant.id === targetId);
              if (!target) {
                return null;
              }
              return (
                <button
                  key={targetId}
                  className="rounded-full border border-slate-300 px-2 py-1 text-slate-700"
                  type="button"
                  onClick={() =>
                    onSetTargetParticipantIds((current) => current.filter((id) => id !== targetId))
                  }
                >
                  @{target.label} x
                </button>
              );
            })
          )}
          {targetParticipantIds.length > 0 && (
            <button
              className="rounded-md border border-slate-300 px-2 py-1 text-slate-600"
              type="button"
              onClick={() => onSetTargetParticipantIds([])}
            >
              Reply all
            </button>
          )}
        </div>
      )}
      {pendingAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment) => (
            <div
              key={attachment.localId}
              className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50"
            >
              {isImageAttachment(attachment) ? (
                <button
                  type="button"
                  className="block text-left"
                  onClick={() =>
                    onSetLightbox({
                      src: attachment.dataUrl!,
                      name: attachment.name
                    })
                  }
                >
                  <img
                    src={attachment.dataUrl}
                    alt={attachment.name}
                    className="h-24 w-24 object-cover"
                  />
                </button>
              ) : null}
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="max-w-[120px] truncate text-xs text-slate-700">
                  {attachment.kind === "image" ? attachment.name : `file: ${attachment.name}`}
                </span>
                <button
                  type="button"
                  className="text-xs text-rose-600"
                  onClick={() => onRemoveAttachment(attachment.localId)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSendMessage}>
        <div className="relative flex-1">
          <textarea
            className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-3 text-sm sm:min-h-[44px] sm:py-2"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                return;
              }
              event.preventDefault();
              void onSubmitMessageRequest(input, pendingAttachments);
            }}
            rows={isMobileView ? 4 : 2}
            placeholder={
              sessionMode === "one_to_one"
                ? "Type message, use @ to mention a specific agent"
                : "Type your message"
            }
          />
          {sessionMode === "one_to_one" && showMentionMenu && mentionCandidates.length > 0 && (
            <div className="absolute bottom-[104px] left-0 z-10 w-64 rounded-md border border-slate-200 bg-white p-1 shadow-lg sm:bottom-14">
              {mentionCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  className="block w-full rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                  type="button"
                  onClick={() => onSelectMentionTarget(candidate.id, candidate.label)}
                >
                  @{candidate.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-center text-xs text-slate-700">
            Attach
            <input
              className="hidden"
              type="file"
              multiple
              accept="image/*,.txt,.md,.json,.csv"
              onChange={(event) => {
                void onAddAttachments(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <button
            type="submit"
            disabled={!sessionId || (!input.trim() && pendingAttachments.length === 0)}
            className="rounded-md bg-ink px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            Send
          </button>
          <button
            type="button"
            onClick={onRunSummarizer}
            disabled={!sessionId || !summarizerEnabled}
            className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            Summarize
          </button>
        </div>
      </form>
    </div>
  );
}
