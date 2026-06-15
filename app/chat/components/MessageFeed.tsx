"use client";

import React from "react";
import Image from "next/image";
import { Message, Mode } from "@/lib/types";
import { AgentProfile } from "@/lib/agentProfiles";
import { modelPriceTag } from "@/lib/modelCatalog";
import { getDefaultAvatarUrl } from "@/lib/avatar";
import { SessionMemberMeta, PendingAttachment } from "./types";
import {
  avatarLabel,
  isImageAttachment,
  renderMessageContent,
  storyExperience,
  GENERIC_STARTER_PROMPTS,
} from "./utils";

interface MessageFeedProps {
  sessionId: string | null;
  status: string;
  groupedMessages: Message[];
  typingAgents: string[];
  activeSessionMembers: SessionMemberMeta[];
  sessionMode: Mode;
  activeStory: string;
  starterPrompts: string[];
  showStarterPrompts: boolean;
  quickStartStories: Array<{ story: string; members: AgentProfile[] }>;
  dynamicPriceMap: Map<string, string>;
  lightboxImage: { src: string; name: string } | null;
  chatScrollRef: React.RefObject<HTMLDivElement | null>;
  isMobileView: boolean;
  onSetInput: (value: string) => void;
  onSubmitPrompt: (prompt: string) => void;
  onSetMobilePanel: (panel: "chat" | "sessions" | "setup") => void;
  onSetLightbox: (image: { src: string; name: string } | null) => void;
  onToggleSetupSection: (section: string) => void;
}

export function MessageFeed({
  sessionId,
  status,
  groupedMessages,
  typingAgents,
  activeSessionMembers,
  activeStory,
  starterPrompts,
  showStarterPrompts,
  quickStartStories,
  dynamicPriceMap,
  chatScrollRef,
  isMobileView,
  onSetInput,
  onSubmitPrompt,
  onSetMobilePanel,
  onSetLightbox,
  onToggleSetupSection,
}: MessageFeedProps) {
  return (
    <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
      {!sessionId && (
        <section className="mx-auto flex max-w-3xl flex-col items-center rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white px-6 py-10 text-center shadow-sm">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-amber-200 bg-white p-3 shadow-sm">
            <Image alt="AllPath logo" className="object-contain" fill sizes="64px" src="/allpath-logo-mark.png" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-slate-900">Start fast</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Pick a story, choose a model, and open a conversation in one tap. Use Quick Start for the fastest demo, or open Setup to build your own team.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {quickStartStories.slice(0, 3).map(({ story, members }) => (
              <button
                key={story}
                type="button"
                className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
                onClick={() => {
                  onSetMobilePanel("setup");
                  onToggleSetupSection("quickStart");
                }}
              >
                {story} · {members.length} characters
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {GENERIC_STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                onClick={() => {
                  onSetInput(prompt);
                  if (isMobileView) {
                    onSetMobilePanel("setup");
                  }
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>
      )}
      {groupedMessages.map((message) => (
        <article
          key={message.messageId}
          className={`flex ${
            message.sourceRole === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-[85%] items-start gap-2 ${
              message.sourceRole === "user" ? "flex flex-row-reverse" : "flex"
            }`}
          >
            <div
              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                message.sourceRole === "user"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {message.sourceRole !== "user" ? (
                <img
                  src={message.sourceAvatarUrl ?? (() => {
                    const idx = activeSessionMembers.findIndex(m => m.label === message.sourceLabel);
                    return getDefaultAvatarUrl(idx >= 0 ? idx : 0);
                  })()}
                  alt={`${message.sourceLabel} avatar`}
                  className="h-full w-full rounded-full object-contain"
                />
              ) : (
                avatarLabel("You")
              )}
            </div>

            <div>
              <p
                className={`mb-1 text-xs ${
                  message.sourceRole === "user" ? "text-right text-slate-500" : "text-slate-500"
                }`}
              >
                {message.sourceRole === "user" ? "You" : message.sourceLabel}
                {message.sourceModel ? ` (${message.sourceModel})` : ""}
                {message.sourceModel
                  ? ` ${dynamicPriceMap.get(message.sourceModel) ?? modelPriceTag(message.sourceModel)}`
                  : ""}
              </p>
              <div
                className={`rounded-2xl px-3 py-2 text-sm ${
                  message.sourceRole === "user"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {message.content ? renderMessageContent(message.content) : "..."}
                {message.sourceRole === "user" &&
                  message.attachments &&
                  message.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div key={attachment.attachmentId}>
                          {isImageAttachment(attachment) ? (
                            <button
                              type="button"
                              className="block overflow-hidden rounded-xl border border-white/20 bg-white/10 text-left"
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
                                className="max-h-44 w-full object-cover"
                              />
                              <div className="px-2 py-1 text-xs opacity-90">{attachment.name}</div>
                            </button>
                          ) : (
                            <div className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs opacity-90">
                              File: {attachment.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </article>
      ))}

      {status === "running" && typingAgents.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
          <span>
            {typingAgents.join(", ")} {typingAgents.length > 1 ? "are" : "is"} typing...
          </span>
        </div>
      )}

      {status === "running" && typingAgents.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
          <span>Agents are thinking...</span>
        </div>
      )}
    </div>
  );
}
