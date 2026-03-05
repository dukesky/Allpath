import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processSessionQueue } from "@/lib/orchestrator";
import { addMessage, getSession, pushQueue, setSessionMode } from "@/lib/store";
import { MessageAttachment, Mode } from "@/lib/types";

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

  if (body.mode === "roundtable" || body.mode === "one_to_one") {
    setSessionMode(id, body.mode);
  }

  const validTargetIds = (body.targetParticipantIds ?? []).filter((targetId) =>
    session.config.participants.some((participant) => participant.id === targetId)
  );

  pushQueue(id, {
    messageId,
    mode: body.mode === "one_to_one" ? "one_to_one" : session.config.mode,
    targetParticipantIds: validTargetIds
  });
  void processSessionQueue(id);

  return NextResponse.json({ ok: true, messageId });
}
