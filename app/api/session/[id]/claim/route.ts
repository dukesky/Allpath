import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/serverAuth";
import { persistSessionState } from "@/lib/sessionPersistence";
import { getSession } from "@/lib/store";

// Claims a live guest session for the signed-in user: attaches ownerUid +
// persistentId and persists the full transcript, so sessions started before
// sign-in are not lost. Only works while the session is still in memory.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const config = session.config;

  if (config.ownerUid && config.ownerUid !== user.uid) {
    return NextResponse.json({ error: "Session belongs to another account." }, { status: 403 });
  }

  // Already claimed by this user — idempotent.
  if (config.ownerUid === user.uid && config.persistentId) {
    return NextResponse.json({ persistentId: config.persistentId, alreadyClaimed: true });
  }

  config.ownerUid = user.uid;
  config.persistentId = config.persistentId ?? randomUUID();

  try {
    await persistSessionState(config);
  } catch (error) {
    console.error(`[allpath] claim_persist_failed session=${id}`, error);
    config.ownerUid = undefined;
    config.persistentId = undefined;
    return NextResponse.json({ error: "Failed to save session." }, { status: 500 });
  }

  return NextResponse.json({ persistentId: config.persistentId, alreadyClaimed: false });
}
