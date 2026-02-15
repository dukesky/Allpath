import { randomUUID } from "crypto";
import { getAdapter } from "@/lib/providers";
import { addMessage, emit, getSession, shiftQueue, updateMessage } from "@/lib/store";
import { Message, ModelMessage, ParticipantConfig } from "@/lib/types";

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

  let cleaned = content.replace(bracketPrefix, "").trimStart();
  cleaned = cleaned.replace(speakerBlock, "");
  cleaned = cleaned.replace(speakerLine, "").trimStart();
  cleaned = cleaned.replace(messageLabel, "").trimStart();
  cleaned = cleaned.replace(anyBracketTag, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned;
}

function buildPromptForParticipant(input: {
  participant: ParticipantConfig;
  messages: Message[];
  participants: ParticipantConfig[];
  summarizer?: ParticipantConfig;
  agentInitialPrompt?: string;
}): ModelMessage[] {
  const { participant, messages, participants, summarizer, agentInitialPrompt } = input;

  const systemPrompt = [
    "You are participating in an AllPath multi-agent roundtable.",
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
    "Output only the response content.",
    "If asked which models are present, answer using the configured roster above.",
    "Keep answers concise, factual, and collaboration-oriented.",
    agentInitialPrompt ? `Additional session rules:\n${agentInitialPrompt}` : ""
  ].join("\n\n");

  const conversation: ModelMessage[] = messages.map((message) => ({
    role: message.sourceRole === "user" ? "user" : "assistant",
    content: `Speaker: ${message.sourceLabel}${message.sourceModel ? ` (${message.sourceModel})` : ""}\nMessage: ${message.content}`
  }));

  return [{ role: "system", content: systemPrompt }, ...conversation];
}

async function runParticipantTurn(sessionId: string, participant: ParticipantConfig, roundId: number): Promise<void> {
  const state = getSession(sessionId);
  if (!state) {
    return;
  }

  const prompt = buildPromptForParticipant({
    participant,
    messages: state.config.messages,
    participants: state.config.participants,
    summarizer: state.config.summarizer,
    agentInitialPrompt: state.config.agentInitialPrompt
  });

  const messageId = randomUUID();
  addMessage(sessionId, {
    messageId,
    roundId,
    sourceRole: "assistant",
    sourceModel: participant.model,
    sourceLabel: participant.label,
    createdAt: nowIso(),
    status: "streaming",
    content: ""
  });

  const adapter = getAdapter(participant.provider);
  let completed = false;

  try {
    for await (const delta of adapter.streamChat({
      model: participant.model,
      messages: prompt,
      provider: participant.provider
    })) {
      updateMessage(sessionId, messageId, (message) => {
        message.content += delta;
      });

      emit(sessionId, {
        type: "message_delta",
        payload: { messageId, delta }
      });
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
    updateMessage(sessionId, messageId, (message) => {
      message.content = sanitizeAgentOutput(message.content, participant);
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

  const nextMessageId = shiftQueue(sessionId);
  if (!nextMessageId) {
    return;
  }

  state.config.status = "running";
  state.config.roundNumber += 1;
  const roundId = state.config.roundNumber;

  emit(sessionId, {
    type: "session_state",
    payload: { status: state.config.status, roundNumber: state.config.roundNumber }
  });

  for (const participant of state.config.participants) {
    await runParticipantTurn(sessionId, participant, roundId);
  }

  state.config.status = "waiting";
  emit(sessionId, {
    type: "session_state",
    payload: { status: state.config.status, roundNumber: state.config.roundNumber }
  });

  emit(sessionId, { type: "round_completed", payload: { roundId, userMessageId: nextMessageId } });

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
    createdAt: nowIso(),
    status: "streaming",
    content: ""
  });

  const adapter = getAdapter(summarizer.provider);
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
    agentInitialPrompt: state.config.agentInitialPrompt
  });

  try {
    for await (const delta of adapter.streamChat({
      model: summarizer.model,
      messages: prompt,
      provider: summarizer.provider
    })) {
      updateMessage(sessionId, messageId, (message) => {
        message.content += delta;
      });

      emit(sessionId, {
        type: "message_delta",
        payload: { messageId, delta }
      });
    }

    updateMessage(sessionId, messageId, (message) => {
      message.content = sanitizeAgentOutput(message.content, summarizer);
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
