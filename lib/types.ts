export type Mode = "roundtable";
export type ProviderType = "openrouter" | "custom";

export type Role = "user" | "assistant" | "summarizer";

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  baseUrl?: string;
}

export interface ParticipantConfig {
  id: string;
  label: string;
  model: string;
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
  createdAt: string;
  status: "streaming" | "completed" | "failed";
  content: string;
}

export interface SessionConfig {
  sessionId: string;
  mode: Mode;
  agentInitialPrompt?: string;
  globalApiKey?: string;
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
    | "message_delta"
    | "message_updated"
    | "server_error"
    | "round_completed";
  payload: Record<string, unknown>;
}

export interface ModelMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderAdapter {
  streamChat(input: {
    model: string;
    messages: ModelMessage[];
    provider: ProviderConfig;
  }): AsyncGenerator<string>;
  listModels?(provider: ProviderConfig): Promise<Array<{ id: string; name: string }>>;
}
