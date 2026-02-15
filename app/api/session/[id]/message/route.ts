import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processSessionQueue } from "@/lib/orchestrator";
import { addMessage, getSession, pushQueue } from "@/lib/store";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { content?: string };

  if (!body.content?.trim()) {
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
    content: body.content.trim()
  });

  pushQueue(id, messageId);
  void processSessionQueue(id);

  return NextResponse.json({ ok: true, messageId });
}
