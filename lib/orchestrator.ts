import { randomUUID } from "crypto";
import { getAdapter } from "@/lib/providers";
import { addMessage, emit, getSession, shiftQueue, updateMessage } from "@/lib/store";
import { Message, MessageAttachment, ModelMessage, ParticipantConfig, ProviderConfig } from "@/lib/types";
import { applyOwnerTrialUsage, resolveOpenRouterProviderForSession, TrialAccessError } from "@/lib/trial";

function nowIso(): string {
  return new Date().toISOString();
}

function rosterText(participants: ParticipantConfig[], summarizer?: ParticipantConfig): string {
  const participantLines = participants.map((item) => {
    const role = item.roleTitle ? `role=${item.roleTitle}` : "role=not set";
    return `- ${item.label}: model=${item.model}, ${role}`;
  });

  const summarizerLine = summarizer
    ? `- ${summarizer.label}: model=${summarizer.model}, role=${summarizer.roleTitle ?? "summarizer"}`
    : "- Summarizer: disabled";

  return ["Configured participants:", ...participantLines, "Configured summarizer:", summarizerLine].join("\n");
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeAgentOutput(content: string, participant: ParticipantConfig): string {
  const label = escapeRegex(participant.label.trim());
  const model = escapeRegex(participant.model.trim());
  const bracketPrefix = new RegExp(
    `^(?:\\s*\\[(?:${label})(?:\\s*\\|\\s*${model})?\\]\\s*)+`,
    "i"
  );
  const anyBracketTag = /\[[^\]\n]{1,80}\|[^\]\n]{1,120}\]\s*/g;

  const speakerLine = new RegExp(`^\\s*Speaker\\s*:\\s*.*(?:\\n|\\r\\n?)`, "i");
  const messageLabel = /^\s*Message\s*:\s*/i;
  const speakerBlock = /(?:^|\n)\s*Speaker\s*:\s*[^\n]*(?:\n|\r\n?)\s*Message\s*:\s*[\s\S]*?(?=(?:\n\s*Speaker\s*:)|$)/gi;
  const speakerBlockWithCapture =
    /(?:^|\n)\s*Speaker\s*:\s*([^\n]*)(?:\n|\r\n?)\s*Message\s*:\s*([\s\S]*?)(?=(?:\n\s*Speaker\s*:)|$)/gi;
  const internalLine = /^\s*(?:source_role|speaker|model|round_id|content_json)\s*:\s*.*(?:\n|\r\n?)/gim;
  const historyBlock = /<\/?history_message>\s*/gi;
  const transcriptHeader = /^\s*\[(?:User|Agent|Summarizer)\s*\|\s*[^\]\n]{1,120}\]\s*/gim;

  const parsedBlocks: Array<{ speaker: string; message: string }> = [];
  let blockMatch: RegExpExecArray | null = speakerBlockWithCapture.exec(content);
  while (blockMatch) {
    parsedBlocks.push({
      speaker: blockMatch[1].trim(),
      message: blockMatch[2].trim()
    });
    blockMatch = speakerBlockWithCapture.exec(content);
  }

  if (parsedBlocks.length > 0) {
    const labelLower = participant.label.trim().toLowerCase();
    const ownBlock =
      parsedBlocks.find((block) => block.speaker.toLowerCase().includes(labelLower)) ?? parsedBlocks[0];
    if (ownBlock?.message) {
      return ownBlock.message.replace(anyBracketTag, "").trim();
    }
  }

  let cleaned = content.replace(bracketPrefix, "").trimStart();
  cleaned = cleaned.replace(speakerBlock, "");
  cleaned = cleaned.replace(speakerLine, "").trimStart();
  cleaned = cleaned.replace(messageLabel, "").trimStart();
  cleaned = cleaned.replace(historyBlock, "");
  cleaned = cleaned.replace(internalLine, "");
  cleaned = cleaned.replace(transcriptHeader, "");
  cleaned = cleaned.replace(anyBracketTag, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned;
}

function transcriptLabelForMessage(message: Message): string {
  if (message.sourceRole === "user") {
    return "User | You";
  }

  if (message.sourceRole === "summarizer") {
    return `Summarizer | ${message.sourceLabel}`;
  }

  return `Agent | ${message.sourceLabel}`;
}

function transcriptTextForMessage(message: Message): string {
  const sections = [`[${transcriptLabelForMessage(message)}]`, message.content.trim() || "(empty response)"];

  const attachments = message.attachments ?? [];
  for (const attachment of attachments) {
    if (attachment.kind === "image") {
      sections.push(`[Attachment: image "${attachment.name}"]`);
      continue;
    }

    if (attachment.kind === "text" && attachment.textContent) {
      sections.push(`[Attachment: text "${attachment.name}"]`);
      sections.push(attachment.textContent);
      continue;
    }

    sections.push(`[Attachment: file "${attachment.name}"]`);
  }

  return sections.join("\n");
}

function buildConversationTranscript(messages: Message[]): string {
  if (messages.length === 0) {
    return "No previous messages yet.";
  }

  const blocks: string[] = [];
  let currentRound: number | null = null;

  for (const message of messages) {
    if (message.roundId !== currentRound) {
      currentRound = message.roundId;
      blocks.push(`[Round ${currentRound}]`);
    }
    blocks.push(transcriptTextForMessage(message));
  }

  return blocks.join("\n\n");
}

function buildPromptForParticipant(input: {
  participant: ParticipantConfig;
  messages: Message[];
  participants: ParticipantConfig[];
  summarizer?: ParticipantConfig;
  agentInitialPrompt?: string;
  mode: "roundtable" | "one_to_one";
}): ModelMessage[] {
  const { participant, messages, participants, summarizer, agentInitialPrompt, mode } = input;

  const systemPrompt = [
    mode === "one_to_one"
      ? "You are participating in an AllPath one-to-one mode conversation."
      : "You are participating in an AllPath multi-agent roundtable.",
    `Your participant label: ${participant.label}`,
    `Your configured model ID: ${participant.model}`,
    participant.roleTitle ? `Your role in the discussion: ${participant.roleTitle}` : "Your role in the discussion: analyst",
    participant.character ? `Your personality guidance: ${participant.character}` : "Your personality guidance: neutral and pragmatic",
    rosterText(participants, summarizer),
    "Important: each participant above is an independently called model instance.",
    "Do not claim all voices are the same model or that you are the only model.",
    "Do not prefix your answer with speaker tags like [Name | model].",
    "Do not include prefixes like 'Speaker:' or 'Message:' in your output.",
    "Never write or simulate another agent's response text in your own answer.",
    "Conversation history is provided as transcript context, not as an output format to imitate.",
    "Never output transcript markers, XML, JSON, YAML, or metadata fields such as source_role, speaker, model, round_id, or content_json.",
    "Your output must be plain response text only. No wrappers or transcript markup.",
    "Output only the response content.",
    "If asked which models are present, answer using the configured roster above.",
    "Keep answers concise, factual, and collaboration-oriented.",
    agentInitialPrompt ? `Additional session rules:\n${agentInitialPrompt}` : ""
  ].join("\n\n");

  const visibleMessages =
    mode === "one_to_one" ? messages.filter((message) => message.sourceRole === "user") : messages;
  const transcript = buildConversationTranscript(visibleMessages);
  const latestUserMessage = [...visibleMessages].reverse().find((message) => message.sourceRole === "user");

  const contextPrompt = [
    `Conversation mode: ${mode === "one_to_one" ? "One-to-One" : "Round Table"}`,
    "Participants in this session:",
    ...participants.map((item) => {
      const role = item.roleTitle ? item.roleTitle : "not set";
      return `- ${item.label}: ${role}`;
    }),
    summarizer ? `Summarizer: ${summarizer.label}` : "Summarizer: disabled",
    "Interaction rule: all participants are separate model calls. You may respond to prior points, but do not imitate transcript formatting."
  ].join("\n");

  const currentTaskPrompt = [
    "Conversation transcript so far:",
    transcript,
    "",
    latestUserMessage
      ? `Current user request:\n${latestUserMessage.content.trim() || "(see transcript)"}`
      : "Current user request:\nNo user request yet.",
    `Respond now as ${participant.label} only.`
  ].join("\n");

  const conversation: ModelMessage[] = [
    { role: "user", content: contextPrompt },
    { role: "user", content: currentTaskPrompt }
  ];

  if (latestUserMessage?.attachments?.length) {
    conversation.push({
      role: "user",
      content: userMessageContentWithAttachments(latestUserMessage)
    });
  }

  return [{ role: "system", content: systemPrompt }, ...conversation];
}

function userMessageContentWithAttachments(
  message: Message
): Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> | string {
  const attachments = message.attachments ?? [];
  if (attachments.length === 0) {
    return message.content;
  }

  const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
  const intro = message.content.trim()
    ? `User message:\n${message.content.trim()}`
    : "User message contains attachments.";
  parts.push({ type: "text", text: intro });

  for (const attachment of attachments) {
    appendAttachmentPart(parts, attachment);
  }

  return parts;
}

function appendAttachmentPart(
  parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>,
  attachment: MessageAttachment
) {
  if (attachment.kind === "image" && attachment.dataUrl) {
    parts.push({ type: "text", text: `Image attachment: ${attachment.name}` });
    parts.push({ type: "image_url", image_url: { url: attachment.dataUrl } });
    return;
  }

  if (attachment.kind === "text" && attachment.textContent) {
    parts.push({
      type: "text",
      text: `Text attachment (${attachment.name}):\n${attachment.textContent}`
    });
    return;
  }

  parts.push({
    type: "text",
    text: `Attachment ${attachment.name} could not be parsed as text/image content.`
  });
}

async function runParticipantTurn(
  sessionId: string,
  participant: ParticipantConfig,
  roundId: number,
  mode: "roundtable" | "one_to_one"
): Promise<void> {
  const state = getSession(sessionId);
  if (!state) {
    return;
  }

  const prompt = buildPromptForParticipant({
    participant,
    messages: state.config.messages,
    participants: state.config.participants,
    summarizer: state.config.summarizer,
    agentInitialPrompt: state.config.agentInitialPrompt,
    mode
  });

  const messageId = randomUUID();
  addMessage(sessionId, {
    messageId,
    roundId,
    sourceRole: "assistant",
    sourceModel: participant.model,
    sourceLabel: participant.label,
    sourceAvatarUrl: participant.avatarUrl,
    createdAt: nowIso(),
    status: "streaming",
    content: ""
  });

  let resolvedProvider: ProviderConfig;
  let funding: "client" | "guest_personal" | "owner_trial";
  try {
    const resolution = await resolveOpenRouterProviderForSession({
      provider: participant.provider,
      sessionGlobalApiKey: state.config.globalApiKey,
      trialGuestId: state.config.trialGuestId
    });
    resolvedProvider = resolution.provider;
    funding = resolution.funding;
  } catch (error) {
    const message =
      error instanceof TrialAccessError ? error.message : `Model call failed: ${(error as Error).message}`;
    updateMessage(sessionId, messageId, (messageRecord) => {
      messageRecord.status = "failed";
      messageRecord.content = message;
    });
    emit(sessionId, {
      type: "server_error",
      payload: {
        message: `${participant.label} failed: ${message}`
      }
    });
    return;
  }

  const adapter = getAdapter(resolvedProvider);
  let completed = false;
  let usageCostUsd: number | undefined;

  try {
    for await (const event of adapter.streamChat({
      model: participant.model,
      messages: prompt,
      provider: resolvedProvider
    })) {
      if (event.type === "delta") {
        updateMessage(sessionId, messageId, (message) => {
          message.content += event.delta;
        });

        emit(sessionId, {
          type: "message_delta",
          payload: { messageId, delta: event.delta }
        });
      }

      if (event.type === "usage" && typeof event.usage.cost === "number" && Number.isFinite(event.usage.cost)) {
        usageCostUsd = event.usage.cost;
      }
    }

    completed = true;
  } catch (error) {
    updateMessage(sessionId, messageId, (message) => {
      message.status = "failed";
      message.content = message.content || `Model call failed: ${(error as Error).message}`;
    });

    emit(sessionId, {
      type: "server_error",
      payload: {
        message: `${participant.label} failed: ${(error as Error).message}`
      }
    });
  }

  if (completed) {
    if (funding === "owner_trial") {
      if (typeof usageCostUsd === "number" && Number.isFinite(usageCostUsd)) {
        await applyOwnerTrialUsage({
          guestId: state.config.trialGuestId,
          costUsd: usageCostUsd
        });
      } else {
        console.warn(
          `[allpath] missing_usage_cost participant=${participant.label} model=${participant.model} session=${sessionId} round=${roundId}`
        );
      }
    }

    const currentMessage = state.config.messages.find((message) => message.messageId === messageId);
    const rawContent = currentMessage?.content ?? "";
    const sanitized = sanitizeAgentOutput(rawContent, participant);

    if (!rawContent.trim()) {
      console.warn(
        `[allpath] empty_output participant=${participant.label} model=${participant.model} session=${sessionId} round=${roundId} raw_len=0 sanitized_len=0`
      );
      updateMessage(sessionId, messageId, (message) => {
        message.status = "failed";
        message.content =
          "No visible text output returned by model (empty stream or non-text response).";
      });
      return;
    }

    if (!sanitized.trim()) {
      console.warn(
        `[allpath] sanitizer_empty_fallback participant=${participant.label} model=${participant.model} session=${sessionId} round=${roundId} raw_len=${rawContent.length} sanitized_len=0`
      );
      updateMessage(sessionId, messageId, (message) => {
        message.content = rawContent.trim();
        message.status = "completed";
      });
      return;
    }

    updateMessage(sessionId, messageId, (message) => {
      message.content = sanitized;
      message.status = "completed";
    });
  }
}

export async function processSessionQueue(sessionId: string): Promise<void> {
  const state = getSession(sessionId);
  if (!state) {
    return;
  }

  if (state.config.status === "running") {
    return;
  }

  const nextQueueItem = shiftQueue(sessionId);
  if (!nextQueueItem) {
    return;
  }

  state.config.status = "running";
  state.config.roundNumber += 1;
  const roundId = state.config.roundNumber;

  emit(sessionId, {
    type: "session_state",
    payload: { status: state.config.status, roundNumber: state.config.roundNumber }
  });

  const participantTargets =
    nextQueueItem.mode === "one_to_one" && nextQueueItem.targetParticipantIds?.length
      ? state.config.participants.filter((participant) =>
          nextQueueItem.targetParticipantIds?.includes(participant.id)
        )
      : state.config.participants;

  for (const participant of participantTargets) {
    await runParticipantTurn(sessionId, participant, roundId, nextQueueItem.mode);
  }

  state.config.status = "waiting";
  emit(sessionId, {
    type: "session_state",
    payload: { status: state.config.status, roundNumber: state.config.roundNumber }
  });

  emit(sessionId, {
    type: "round_completed",
    payload: { roundId, userMessageId: nextQueueItem.messageId }
  });

  if (state.queue.length > 0) {
    await processSessionQueue(sessionId);
  }
}

export async function runManualSummarizer(sessionId: string): Promise<void> {
  const state = getSession(sessionId);
  if (!state || !state.config.summarizer) {
    return;
  }

  const summarizer = state.config.summarizer;
  const roundId = state.config.roundNumber;
  const messageId = randomUUID();

  addMessage(sessionId, {
    messageId,
    roundId,
    sourceRole: "summarizer",
    sourceModel: summarizer.model,
    sourceLabel: summarizer.label,
    sourceAvatarUrl: summarizer.avatarUrl,
    createdAt: nowIso(),
    status: "streaming",
    content: ""
  });

  let resolvedProvider: ProviderConfig;
  let funding: "client" | "guest_personal" | "owner_trial";
  try {
    const resolution = await resolveOpenRouterProviderForSession({
      provider: summarizer.provider,
      sessionGlobalApiKey: state.config.globalApiKey,
      trialGuestId: state.config.trialGuestId
    });
    resolvedProvider = resolution.provider;
    funding = resolution.funding;
  } catch (error) {
    const message =
      error instanceof TrialAccessError ? error.message : `Summarizer failed: ${(error as Error).message}`;
    updateMessage(sessionId, messageId, (messageRecord) => {
      messageRecord.status = "failed";
      messageRecord.content = message;
    });
    emit(sessionId, {
      type: "server_error",
      payload: { message }
    });
    return;
  }

  const adapter = getAdapter(resolvedProvider);
  const prompt = buildPromptForParticipant({
    participant: {
      ...summarizer,
      character:
        summarizer.character ??
        "Provide a final synthesis in 4 sections: decision, rationale, risks, next actions."
    },
    messages: state.config.messages,
    participants: state.config.participants,
    summarizer: state.config.summarizer,
    agentInitialPrompt: state.config.agentInitialPrompt,
    mode: state.config.mode
  });
  let usageCostUsd: number | undefined;

  try {
    for await (const event of adapter.streamChat({
      model: summarizer.model,
      messages: prompt,
      provider: resolvedProvider
    })) {
      if (event.type === "delta") {
        updateMessage(sessionId, messageId, (message) => {
          message.content += event.delta;
        });

        emit(sessionId, {
          type: "message_delta",
          payload: { messageId, delta: event.delta }
        });
      }

      if (event.type === "usage" && typeof event.usage.cost === "number" && Number.isFinite(event.usage.cost)) {
        usageCostUsd = event.usage.cost;
      }
    }

    if (funding === "owner_trial") {
      if (typeof usageCostUsd === "number" && Number.isFinite(usageCostUsd)) {
        await applyOwnerTrialUsage({
          guestId: state.config.trialGuestId,
          costUsd: usageCostUsd
        });
      } else {
        console.warn(
          `[allpath] missing_usage_cost participant=${summarizer.label} model=${summarizer.model} session=${sessionId} round=${roundId}`
        );
      }
    }

    const currentMessage = state.config.messages.find((message) => message.messageId === messageId);
    const rawContent = currentMessage?.content ?? "";
    const sanitized = sanitizeAgentOutput(rawContent, summarizer);

    if (!rawContent.trim()) {
      console.warn(
        `[allpath] empty_output participant=${summarizer.label} model=${summarizer.model} session=${sessionId} round=${roundId} raw_len=0 sanitized_len=0`
      );
      updateMessage(sessionId, messageId, (message) => {
        message.status = "failed";
        message.content =
          "No visible text output returned by model (empty stream or non-text response).";
      });
      return;
    }

    if (!sanitized.trim()) {
      console.warn(
        `[allpath] sanitizer_empty_fallback participant=${summarizer.label} model=${summarizer.model} session=${sessionId} round=${roundId} raw_len=${rawContent.length} sanitized_len=0`
      );
      updateMessage(sessionId, messageId, (message) => {
        message.content = rawContent.trim();
        message.status = "completed";
      });
      return;
    }

    updateMessage(sessionId, messageId, (message) => {
      message.content = sanitized;
      message.status = "completed";
    });
  } catch (error) {
    updateMessage(sessionId, messageId, (message) => {
      message.status = "failed";
      message.content = message.content || `Summarizer failed: ${(error as Error).message}`;
    });

    emit(sessionId, {
      type: "server_error",
      payload: { message: `Summarizer failed: ${(error as Error).message}` }
    });
  }
}
