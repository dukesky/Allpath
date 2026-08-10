export type Mode = "roundtable" | "one_to_one";
export type ProviderType = "openrouter" | "custom";

export type Role = "user" | "assistant" | "summarizer";

export interface MessageAttachment {
  attachmentId: string;
  name: string;
  mimeType: string;
  kind: "image" | "text";
  dataUrl?: string;
  textContent?: string;
}

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  baseUrl?: string;
}

export interface ProviderUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
}

export type ProviderStreamEvent =
  | { type: "delta"; delta: string }
  | { type: "usage"; usage: ProviderUsage }
  | { type: "generation"; generationId: string };

export interface ParticipantConfig {
  id: string;
  label: string;
  avatarUrl?: string;
  model: string;
  muted?: boolean;
  provider: ProviderConfig;
  roleTitle?: string;
  character?: string;
}

export interface Message {
  messageId: string;
  roundId: number;
  parentId?: string;
  sourceRole: Role;
  sourceModel?: string;
  sourceLabel: string;
  sourceAvatarUrl?: string;
  createdAt: string;
  status: "streaming" | "completed" | "failed";
  content: string;
  attachments?: MessageAttachment[];
}

export interface SessionConfig {
  sessionId: string;
  // Set for sessions owned by a signed-in user; enables Firestore persistence.
  // persistentId stays stable when a session is recreated from a stored transcript.
  ownerUid?: string;
  persistentId?: string;
  title?: string;
  mode: Mode;
  agentInitialPrompt?: string;
  globalApiKey?: string;
  trialGuestId?: string;
  participants: ParticipantConfig[];
  summarizer?: ParticipantConfig;
  roundNumber: number;
  status: "idle" | "running" | "waiting";
  messages: Message[];
}

export interface StreamEvent {
  type:
    | "session_state"
    | "message_created"
    | "message_removed"
    | "message_delta"
    | "message_updated"
    | "server_error"
    | "round_completed";
  payload: Record<string, unknown>;
}

export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

export interface ProviderAdapter {
  streamChat(input: {
    model: string;
    messages: ModelMessage[];
    provider: ProviderConfig;
  }): AsyncGenerator<ProviderStreamEvent>;
  listModels?(provider: ProviderConfig): Promise<Array<{ id: string; name: string }>>;
}

// Shareable session types — API keys are always excluded
export interface ShareableParticipant {
  id: string;
  label: string;
  avatarUrl?: string;
  model: string;
  roleTitle?: string;
  character?: string;
}

export interface ShareRecord {
  shareId: string;
  createdAt: string;
  expiresAt: string;
  mode: Mode;
  title: string;
  transcript: Message[];
  agentConfig: ShareableParticipant[];
}
