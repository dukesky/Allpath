import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { FieldValue } from "@google-cloud/firestore";
import { getFirestoreDb } from "@/lib/firestore";
import { decryptSecret, encryptSecret, signGuestCookie, verifyGuestCookie } from "@/lib/trialCrypto";
import { ProviderConfig } from "@/lib/types";

const GUEST_COOKIE_NAME = "allpath_guest";
const INVITE_CODES_COLLECTION = "trial_invite_codes";
const GUESTS_COLLECTION = "trial_guests";
const TRIAL_BUDGET_USD = 2;

export type TrialStatus = "active" | "exhausted" | "revoked";

export interface TrialInviteCodeRecord {
  code: string;
  enabled: boolean;
  label?: string;
  trialBudgetUsd?: number;
  redeemedCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrialGuestRecord {
  guestId: string;
  redeemedCode: string;
  trialBudgetUsd: number;
  trialSpentUsd: number;
  trialStatus: TrialStatus;
  userProvidedOpenRouterKeyEncrypted?: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface TrialStatusPayload {
  available: boolean;
  requiresInviteCode: boolean;
  guestId?: string;
  redeemedCode?: string;
  trialStatus?: TrialStatus;
  remainingBudgetUsd?: number;
  trialBudgetUsd?: number;
  trialSpentUsd?: number;
  hasPersonalOpenRouterKey: boolean;
}

export class TrialAccessError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "trial_access_error", status = 400) {
    super(message);
    this.name = "TrialAccessError";
    this.code = code;
    this.status = status;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeInviteCode(code: string): string {
  return code.trim().toLowerCase();
}

function roundUsd(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.max(0, Number(amount.toFixed(6)));
}

function getGuestRef(guestId: string) {
  return getFirestoreDb().collection(GUESTS_COLLECTION).doc(guestId);
}

function getInviteCodeRef(code: string) {
  return getFirestoreDb().collection(INVITE_CODES_COLLECTION).doc(normalizeInviteCode(code));
}

export function toStatusPayload(guest: TrialGuestRecord | null, available = true): TrialStatusPayload {
  if (!guest) {
    return {
      available,
      requiresInviteCode: true,
      hasPersonalOpenRouterKey: false
    };
  }

  const remainingBudgetUsd = roundUsd(guest.trialBudgetUsd - guest.trialSpentUsd);

  return {
    available,
    requiresInviteCode: false,
    guestId: guest.guestId,
    redeemedCode: guest.redeemedCode,
    trialStatus: guest.trialStatus,
    remainingBudgetUsd,
    trialBudgetUsd: guest.trialBudgetUsd,
    trialSpentUsd: guest.trialSpentUsd,
    hasPersonalOpenRouterKey: !!guest.userProvidedOpenRouterKeyEncrypted
  };
}

export function trialCookieName(): string {
  return GUEST_COOKIE_NAME;
}

export async function getGuestFromCookie(): Promise<TrialGuestRecord | null> {
  try {
    const store = await cookies();
    const raw = store.get(GUEST_COOKIE_NAME)?.value;
    const guestId = verifyGuestCookie(raw);
    if (!guestId) {
      return null;
    }

    const snapshot = await getGuestRef(guestId).get();
    if (!snapshot.exists) {
      return null;
    }

    return snapshot.data() as TrialGuestRecord;
  } catch {
    return null;
  }
}

export async function getGuestById(guestId: string | undefined): Promise<TrialGuestRecord | null> {
  if (!guestId) {
    return null;
  }

  const snapshot = await getGuestRef(guestId).get();
  if (!snapshot.exists) {
    return null;
  }
  return snapshot.data() as TrialGuestRecord;
}

export async function getTrialStatusForRequest(): Promise<TrialStatusPayload> {
  try {
    const guest = await getGuestFromCookie();
    if (!guest) {
      return toStatusPayload(null, true);
    }

    await getGuestRef(guest.guestId).set({ lastSeenAt: nowIso() }, { merge: true });
    return toStatusPayload(guest, true);
  } catch {
    return {
      available: false,
      requiresInviteCode: true,
      hasPersonalOpenRouterKey: false
    };
  }
}

export async function redeemInviteCode(code: string): Promise<{ guest: TrialGuestRecord; cookieValue: string }> {
  const existingGuest = await getGuestFromCookie();
  const normalizedCode = normalizeInviteCode(code);
  if (existingGuest && existingGuest.trialStatus === "active") {
    throw new TrialAccessError(
      "This browser already has active trial access. Use it up first or add your own OpenRouter key.",
      "trial_already_active",
      409
    );
  }

  if (existingGuest && existingGuest.trialStatus === "revoked") {
    throw new TrialAccessError(
      "This browser's guest trial is revoked and cannot redeem another invite code.",
      "trial_revoked",
      403
    );
  }

  if (!normalizedCode) {
    throw new TrialAccessError("Invite code is required.", "invite_code_required", 400);
  }

  if (
    existingGuest &&
    normalizeInviteCode(existingGuest.redeemedCode) === normalizedCode
  ) {
    throw new TrialAccessError(
      "This invite code has already been used in this browser.",
      "invite_code_already_used",
      409
    );
  }

  if (existingGuest && existingGuest.trialStatus === "exhausted") {
    const inviteRef = getInviteCodeRef(normalizedCode);
    const inviteSnapshot = await inviteRef.get();
    if (!inviteSnapshot.exists) {
      throw new TrialAccessError("Invite code is invalid.", "invite_code_invalid", 404);
    }

    const invite = inviteSnapshot.data() as TrialInviteCodeRecord;
    if (!invite.enabled) {
      throw new TrialAccessError("Invite code is disabled.", "invite_code_disabled", 403);
    }

    const nextGuest: TrialGuestRecord = {
      ...existingGuest,
      redeemedCode: normalizedCode,
      trialBudgetUsd: roundUsd(invite.trialBudgetUsd ?? TRIAL_BUDGET_USD),
      trialSpentUsd: 0,
      trialStatus: "active",
      lastSeenAt: nowIso()
    };

    await getGuestRef(existingGuest.guestId).set(nextGuest, { merge: true });
    await inviteRef.set(
      {
        redeemedCount: FieldValue.increment(1),
        updatedAt: nowIso()
      },
      { merge: true }
    );

    return {
      guest: nextGuest,
      cookieValue: signGuestCookie(existingGuest.guestId)
    };
  }

  const inviteRef = getInviteCodeRef(normalizedCode);
  const inviteSnapshot = await inviteRef.get();
  if (!inviteSnapshot.exists) {
    throw new TrialAccessError("Invite code is invalid.", "invite_code_invalid", 404);
  }

  const invite = inviteSnapshot.data() as TrialInviteCodeRecord;
  if (!invite.enabled) {
    throw new TrialAccessError("Invite code is disabled.", "invite_code_disabled", 403);
  }

  const guestId = randomUUID();
  const guest: TrialGuestRecord = {
    guestId,
    redeemedCode: normalizedCode,
    trialBudgetUsd: roundUsd(invite.trialBudgetUsd ?? TRIAL_BUDGET_USD),
    trialSpentUsd: 0,
    trialStatus: "active",
    createdAt: nowIso(),
    lastSeenAt: nowIso()
  };

  await getGuestRef(guestId).set(guest);
  await inviteRef.set(
    {
      redeemedCount: FieldValue.increment(1),
      updatedAt: nowIso()
    },
    { merge: true }
  );

  return {
    guest,
    cookieValue: signGuestCookie(guestId)
  };
}

export async function saveGuestPersonalOpenRouterKey(guestId: string, apiKey: string): Promise<TrialGuestRecord> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new TrialAccessError("OpenRouter API key is required.", "api_key_required", 400);
  }

  const ref = getGuestRef(guestId);
  await ref.set(
    {
      userProvidedOpenRouterKeyEncrypted: encryptSecret(trimmed),
      lastSeenAt: nowIso()
    },
    { merge: true }
  );

  const snapshot = await ref.get();
  return snapshot.data() as TrialGuestRecord;
}

export async function clearGuestPersonalOpenRouterKey(guestId: string): Promise<TrialGuestRecord> {
  const ref = getGuestRef(guestId);
  await ref.set(
    {
      userProvidedOpenRouterKeyEncrypted: FieldValue.delete(),
      lastSeenAt: nowIso()
    },
    { merge: true }
  );

  const snapshot = await ref.get();
  return snapshot.data() as TrialGuestRecord;
}

export async function resolveOpenRouterProviderForSession(input: {
  sessionGlobalApiKey?: string;
  provider: ProviderConfig;
  trialGuestId?: string;
}): Promise<{ provider: ProviderConfig; funding: "client" | "guest_personal" | "owner_trial" }> {
  const { provider, sessionGlobalApiKey, trialGuestId } = input;
  if (provider.type !== "openrouter") {
    return { provider, funding: "client" };
  }

  const explicitApiKey = provider.apiKey.trim() || sessionGlobalApiKey?.trim() || "";
  if (explicitApiKey) {
    return {
      provider: { ...provider, apiKey: explicitApiKey },
      funding: "client"
    };
  }

  const guest = await getGuestById(trialGuestId);
  if (!guest) {
    throw new TrialAccessError(
      "OpenRouter access requires an invite code or your own API key.",
      "trial_invite_required",
      401
    );
  }

  if (guest.userProvidedOpenRouterKeyEncrypted) {
    return {
      provider: { ...provider, apiKey: decryptSecret(guest.userProvidedOpenRouterKeyEncrypted) },
      funding: "guest_personal"
    };
  }

  const remainingBudgetUsd = roundUsd(guest.trialBudgetUsd - guest.trialSpentUsd);
  if (guest.trialStatus !== "active" || remainingBudgetUsd <= 0) {
    throw new TrialAccessError(
      "Your free trial budget is exhausted. Add your own OpenRouter API key to continue.",
      "trial_exhausted",
      402
    );
  }

  const ownerApiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!ownerApiKey) {
    throw new TrialAccessError(
      "Owner-funded OpenRouter access is not configured on the server.",
      "owner_api_key_missing",
      500
    );
  }

  return {
    provider: { ...provider, apiKey: ownerApiKey },
    funding: "owner_trial"
  };
}

export async function applyOwnerTrialUsage(input: {
  guestId?: string;
  costUsd?: number;
}): Promise<TrialGuestRecord | null> {
  const guestId = input.guestId;
  if (!guestId) {
    return null;
  }

  const costUsd = roundUsd(Math.max(0, input.costUsd ?? 0));
  if (costUsd <= 0) {
    return getGuestById(guestId);
  }

  const ref = getGuestRef(guestId);
  await getFirestoreDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new TrialAccessError("Guest trial record not found.", "trial_guest_missing", 404);
    }

    const guest = snapshot.data() as TrialGuestRecord;
    const nextSpent = roundUsd(guest.trialSpentUsd + costUsd);
    const nextStatus: TrialStatus =
      nextSpent >= guest.trialBudgetUsd ? "exhausted" : guest.trialStatus === "revoked" ? "revoked" : "active";

    transaction.set(
      ref,
      {
        trialSpentUsd: nextSpent,
        trialStatus: nextStatus,
        lastSeenAt: nowIso()
      },
      { merge: true }
    );
  });

  return getGuestById(guestId);
}
