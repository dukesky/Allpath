import { NextRequest, NextResponse } from "next/server";
import { getSession, setParticipantMuted } from "@/lib/store";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { participantId?: unknown; muted?: unknown };

  if (typeof body.participantId !== "string" || typeof body.muted !== "boolean") {
    return NextResponse.json({ error: "participantId and muted are required." }, { status: 400 });
  }

  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const participants = setParticipantMuted(id, body.participantId, body.muted);
  if (!participants) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, participants });
}
