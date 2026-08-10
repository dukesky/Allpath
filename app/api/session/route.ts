import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/serverAuth";
import { persistSessionState } from "@/lib/sessionPersistence";
import { createSession } from "@/lib/store";
import { Message, Mode, ParticipantConfig, SessionConfig } from "@/lib/types";
import { getGuestFromCookie } from "@/lib/trial";
import { DEFAULT_SESSION_RULES } from "@/lib/userPreferences";

const PERSISTENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_AGENT_INITIAL_PROMPT = DEFAULT_SESSION_RULES;

function validateParticipant(raw: unknown): raw is ParticipantConfig {
  if (!raw || typeof raw !== "object") {
    return false;
  }

  const value = raw as Record<string, unknown>;
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    (typeof value.avatarUrl === "undefined" || typeof value.avatarUrl === "string") &&
    typeof value.model === "string" &&
    (typeof value.muted === "undefined" || typeof value.muted === "boolean") &&
    !!value.provider &&
    typeof (value.provider as Record<string, unknown>).type === "string" &&
    typeof (value.provider as Record<string, unknown>).apiKey === "string"
  );
}

const VALID_SOURCE_ROLES = new Set(["user", "assistant", "summarizer"]);

function isValidMessage(raw: unknown): raw is Message {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as Record<string, unknown>;
  return (
    typeof m.messageId === "string" &&
    typeof m.sourceRole === "string" &&
    VALID_SOURCE_ROLES.has(m.sourceRole) &&
    typeof m.sourceLabel === "string" &&
    typeof m.content === "string" &&
    typeof m.roundId === "number" &&
    typeof m.createdAt === "string"
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    participants?: unknown[];
    summarizer?: unknown;
    agentInitialPrompt?: unknown;
    globalApiKey?: unknown;
    mode?: unknown;
    initialMessages?: unknown[];
    persistentId?: unknown;
    title?: unknown;
  };

  const participants = (body.participants ?? []).filter(validateParticipant);

  if (participants.length < 2) {
    return NextResponse.json({ error: "At least two participants are required." }, { status: 400 });
  }

  const summarizer = validateParticipant(body.summarizer) ? body.summarizer : undefined;
  const [guest, user] = await Promise.all([getGuestFromCookie(), getAuthUser(request)]);

  const requiresServerOpenRouterAccess = [...participants, ...(summarizer ? [summarizer] : [])].some(
    (item) =>
      item.provider.type === "openrouter" &&
      !item.provider.apiKey.trim() &&
      !(typeof body.globalApiKey === "string" && body.globalApiKey.trim().length > 0)
  );

  if (requiresServerOpenRouterAccess && !guest) {
    return NextResponse.json(
      { error: "Redeem an invite code or provide your own OpenRouter API key first.", code: "trial_invite_required" },
      { status: 401 }
    );
  }

  const mode: Mode = body.mode === "one_to_one" ? "one_to_one" : "roundtable";

  const initialMessages: Message[] = Array.isArray(body.initialMessages)
    ? body.initialMessages.slice(0, 500).filter(isValidMessage)
    : [];

  const session: SessionConfig = {
    sessionId: randomUUID(),
    ownerUid: user?.uid,
    persistentId: user
      ? typeof body.persistentId === "string" && PERSISTENT_ID_PATTERN.test(body.persistentId)
        ? body.persistentId
        : randomUUID()
      : undefined,
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : undefined,
    mode,
    agentInitialPrompt:
      typeof body.agentInitialPrompt === "string" && body.agentInitialPrompt.trim().length > 0
        ? body.agentInitialPrompt.trim()
        : DEFAULT_AGENT_INITIAL_PROMPT,
    globalApiKey:
      typeof body.globalApiKey === "string" && body.globalApiKey.trim().length > 0
        ? body.globalApiKey.trim()
        : undefined,
    trialGuestId: guest?.guestId,
    participants,
    summarizer,
    roundNumber: initialMessages.length > 0 ? Math.max(...initialMessages.map((m) => m.roundId), 0) : 0,
    status: "idle",
    messages: initialMessages
  };

  createSession(session);

  if (session.ownerUid && session.persistentId) {
    // Initial persist covers the full transcript (matters when a session is
    // recreated from a stored transcript or a share import).
    void persistSessionState(session).catch((error) => {
      console.error(`[allpath] persist_failed session=${session.sessionId}`, error);
    });
  }

  return NextResponse.json({
    sessionId: session.sessionId,
    mode: session.mode,
    status: session.status,
    roundNumber: session.roundNumber,
    persistentId: session.persistentId
  });
}
