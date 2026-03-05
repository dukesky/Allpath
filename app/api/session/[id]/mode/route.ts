import { NextRequest, NextResponse } from "next/server";
import { Mode } from "@/lib/types";
import { getSession, setSessionMode } from "@/lib/store";

function isMode(value: unknown): value is Mode {
  return value === "roundtable" || value === "one_to_one";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { mode?: unknown };

  if (!isMode(body.mode)) {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }

  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  setSessionMode(id, body.mode);
  return NextResponse.json({ ok: true, mode: body.mode });
}
