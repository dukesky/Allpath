import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/serverAuth";
import { deletePersistedSession, getPersistedSession } from "@/lib/sessionPersistence";

export async function GET(request: NextRequest, { params }: { params: Promise<{ pid: string }> }) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { pid } = await params;

  try {
    const record = await getPersistedSession(user.uid, pid);
    if (!record) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    return NextResponse.json({ session: record.session, messages: record.messages });
  } catch (error) {
    console.error("[allpath] get_session_failed", error);
    return NextResponse.json({ error: "Failed to load session." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ pid: string }> }) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { pid } = await params;

  try {
    const deleted = await deletePersistedSession(user.uid, pid);
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[allpath] delete_session_failed", error);
    return NextResponse.json({ error: "Failed to delete session." }, { status: 500 });
  }
}
