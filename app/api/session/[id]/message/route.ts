import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processSessionQueue } from "@/lib/orchestrator";
import { addMessage, getSession, pushQueue, setSessionMode } from "@/lib/store";
import { MessageAttachment, Mode } from "@/lib/types";
import { resolveOpenRouterProviderForSession, TrialAccessError } from "@/lib/trial";

function normalizeAttachments(raw: unknown): MessageAttachment[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const value = entry as Record<string, unknown>;
      const name = typeof value.name === "string" ? value.name : "";
      const mimeType = typeof value.mimeType === "string" ? value.mimeType : "";
      const kind = value.kind === "image" || value.kind === "text" ? value.kind : null;
      const dataUrl = typeof value.dataUrl === "string" ? value.dataUrl : undefined;
      const textContent = typeof value.textContent === "string" ? value.textContent : undefined;

      if (!name || !mimeType || !kind) {
        return null;
      }

      return {
        attachmentId: randomUUID(),
        name,
        mimeType,
        kind,
        dataUrl,
        textContent
      } as MessageAttachment;
    })
    .filter((item): item is MessageAttachment => !!item);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as {
    content?: string;
    mode?: Mode;
    targetParticipantIds?: string[];
    attachments?: unknown[];
  };

  const attachments = normalizeAttachments(body.attachments);
  if (!body.content?.trim() && attachments.length === 0) {
    return NextResponse.json({ error: "Message content is required." }, { status: 400 });
  }

  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (body.mode === "roundtable" || body.mode === "one_to_one") {
    setSessionMode(id, body.mode);
  }

  const activeParticipants = session.config.participants.filter((participant) => !participant.muted);
  const validTargetIds = (body.targetParticipantIds ?? []).filter((targetId) =>
    activeParticipants.some((participant) => participant.id === targetId)
  );

  const nextMode = body.mode === "one_to_one" ? "one_to_one" : session.config.mode;
  const participantTargets =
    nextMode === "one_to_one" && validTargetIds.length > 0
      ? activeParticipants.filter((participant) => validTargetIds.includes(participant.id))
      : activeParticipants;

  if (participantTargets.length === 0) {
    return NextResponse.json({ error: "All participants are muted. Unmute at least one member first." }, { status: 400 });
  }

  try {
    for (const participant of participantTargets) {
      await resolveOpenRouterProviderForSession({
        provider: participant.provider,
        sessionGlobalApiKey: session.config.globalApiKey,
        trialGuestId: session.config.trialGuestId
      });
    }
  } catch (error) {
    const message =
      error instanceof TrialAccessError ? error.message : "Failed to validate OpenRouter access.";
    const code =
      error instanceof TrialAccessError ? error.code : "trial_access_error";
    const status =
      error instanceof TrialAccessError ? error.status : 500;
    return NextResponse.json({ error: message, code }, { status });
  }

  const messageId = randomUUID();
  addMessage(id, {
    messageId,
    roundId: session.config.roundNumber + 1,
    sourceRole: "user",
    sourceLabel: "You",
    createdAt: new Date().toISOString(),
    status: "completed",
    content: body.content?.trim() ?? "",
    attachments: attachments.length > 0 ? attachments : undefined
  });

  pushQueue(id, {
    messageId,
    mode: nextMode,
    targetParticipantIds: validTargetIds
  });
  void processSessionQueue(id);

  return NextResponse.json({ ok: true, messageId });
}
