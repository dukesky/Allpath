import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/serverAuth";
import { listPersistedSessions } from "@/lib/sessionPersistence";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const sessions = await listPersistedSessions(user.uid);
    return NextResponse.json({
      sessions: sessions.map((session) => ({
        persistentId: session.persistentId,
        liveSessionId: session.liveSessionId,
        title: session.title,
        mode: session.mode,
        roundNumber: session.roundNumber,
        messageCount: session.messageCount,
        updatedAt: session.updatedAt,
        participants: session.participants,
        summarizer: session.summarizer
      }))
    });
  } catch (error) {
    console.error("[allpath] list_sessions_failed", error);
    return NextResponse.json({ error: "Failed to load sessions." }, { status: 500 });
  }
}
