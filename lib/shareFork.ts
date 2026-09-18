import { ShareableParticipant } from "@/lib/types";

// Hand-off from a share page (/share/[id]) to /chat. The share page writes a
// pending fork request to sessionStorage; /chat reads it on mount and keeps it
// until the fork succeeds or the visitor dismisses it, so it survives reloads
// (e.g. a redirect-based sign-in) and trips to /profile to add an API key.

export type ShareForkIntent = "fresh" | "continue";

export interface ShareForkRequest {
  shareId: string;
  intent: ShareForkIntent;
}

export const SHARE_FORK_STORAGE_KEY = "allpath-share-fork";
// Pre-intent key (bare share id). Still honoured, always as "continue".
export const LEGACY_SHARE_FORK_STORAGE_KEY = "allpath-from-share-id";

const MAX_SHARE_ID_LENGTH = 200;

type ForkStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function normalizeShareId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_SHARE_ID_LENGTH) {
    return null;
  }
  return trimmed;
}

export function parseShareForkRequest(raw: string | null): ShareForkRequest | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { shareId?: unknown; intent?: unknown };
    const shareId = normalizeShareId(parsed?.shareId);
    if (!shareId) {
      return null;
    }
    return { shareId, intent: parsed.intent === "fresh" ? "fresh" : "continue" };
  } catch {
    return null;
  }
}

// Reads the pending fork, migrating a legacy entry to the new key so later
// reloads see a single, well-formed request. Storage failures read as "none".
export function readShareForkRequest(storage: ForkStorage): ShareForkRequest | null {
  try {
    const current = parseShareForkRequest(storage.getItem(SHARE_FORK_STORAGE_KEY));
    if (current) {
      return current;
    }

    const legacyShareId = normalizeShareId(storage.getItem(LEGACY_SHARE_FORK_STORAGE_KEY));
    if (!legacyShareId) {
      return null;
    }
    const migrated: ShareForkRequest = { shareId: legacyShareId, intent: "continue" };
    storage.setItem(SHARE_FORK_STORAGE_KEY, JSON.stringify(migrated));
    storage.removeItem(LEGACY_SHARE_FORK_STORAGE_KEY);
    return migrated;
  } catch {
    return null;
  }
}

export function writeShareForkRequest(storage: ForkStorage, request: ShareForkRequest): void {
  try {
    storage.setItem(SHARE_FORK_STORAGE_KEY, JSON.stringify(request));
    storage.removeItem(LEGACY_SHARE_FORK_STORAGE_KEY);
  } catch {
    // Storage unavailable — the fork simply won't be picked up.
  }
}

export function clearShareForkRequest(storage: ForkStorage): void {
  try {
    storage.removeItem(SHARE_FORK_STORAGE_KEY);
    storage.removeItem(LEGACY_SHARE_FORK_STORAGE_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

export interface ShareForkParticipantFields {
  id: string;
  label: string;
  avatarUrl: string;
  model: string;
  roleTitle: string;
  character: string;
}

// Maps a shared team to participant fields, keeping each agent's own model.
// fallbackModel only covers records that somehow lack one.
export function shareAgentsToParticipantFields(
  agentConfig: ShareableParticipant[],
  fallbackModel: string
): ShareForkParticipantFields[] {
  return agentConfig.map((agent, index) => ({
    id: `share-${agent.id}-${index}`,
    label: agent.label,
    avatarUrl: agent.avatarUrl ?? "",
    model: typeof agent.model === "string" && agent.model.trim() ? agent.model : fallbackModel,
    roleTitle: agent.roleTitle ?? "",
    character: agent.character ?? ""
  }));
}
