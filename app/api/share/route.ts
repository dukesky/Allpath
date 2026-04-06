// app/api/share/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/store";
import { createShareRecord } from "@/lib/share";
import { ShareableParticipant } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  const { sessionId } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const { config } = session;
  const completedMessages = config.messages.filter((m) => m.status === "completed");

  if (completedMessages.length === 0) {
    return NextResponse.json({ error: "No completed messages to share." }, { status: 400 });
  }

  // Strip API keys from participant configs
  const agentConfig: ShareableParticipant[] = config.participants.map((p) => ({
    id: p.id,
    label: p.label,
    avatarUrl: p.avatarUrl,
    model: p.model,
    roleTitle: p.roleTitle,
    character: p.character
  }));

  let record;
  try {
    record = await createShareRecord({
      mode: config.mode,
      transcript: completedMessages,
      agentConfig
    });
  } catch (err) {
    console.error("[share] Firestore write failed:", err);
    return NextResponse.json({ error: "Failed to save share record." }, { status: 500 });
  }

  const baseUrl = process.env.APP_BASE_URL ?? process.env.OPENROUTER_SITE_URL ?? "https://all-path.com";
  const url = `${baseUrl}/share/${record.shareId}`;

  return NextResponse.json({ shareId: record.shareId, url });
}
