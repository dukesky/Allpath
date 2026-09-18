import { MessageAttachment, ProviderType, ShareRecord } from "@/lib/types";
import { ShareForkRequest } from "@/lib/shareFork";

export interface SessionMemberMeta {
  id: string;
  label: string;
  avatarUrl?: string;
  model?: string;
  muted?: boolean;
  roleTitle?: string;
  character?: string;
}

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: string;
  members: SessionMemberMeta[];
  // Set when the session is persisted to the signed-in user's account.
  persistentId?: string;
  updatedAt?: string;
  source?: "local" | "cloud";
}

export interface StoryExperience {
  tagline: string;
  prompts: string[];
}

export type PendingAttachment = Omit<MessageAttachment, "attachmentId"> & { localId: string };

export type ApiKeyMode = "default_profile" | "unified" | "by_agent";

export interface TrialStatusResponse {
  available: boolean;
  requiresInviteCode: boolean;
  trialStatus?: "active" | "exhausted" | "revoked";
  remainingBudgetUsd?: number;
  trialBudgetUsd?: number;
  trialSpentUsd?: number;
  hasPersonalOpenRouterKey: boolean;
}

export type ParticipantForm = {
  id: string;
  label: string;
  avatarUrl: string;
  storyFilter: string;
  model: string;
  providerType: ProviderType;
  useSpecificApiKey: boolean;
  apiKey: string;
  baseUrl: string;
  roleTitle: string;
  character: string;
  profileId: string;
};

// A share → chat fork that could not start: "access" when the visitor has no
// invite/key yet (POST /api/session code trial_*), "error" otherwise.
export interface BlockedShareFork {
  request: ShareForkRequest;
  record: Pick<ShareRecord, "title" | "mode" | "agentConfig" | "transcript">;
  reason: "access" | "error";
  errorMessage?: string;
}
