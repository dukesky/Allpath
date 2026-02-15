import { NextResponse } from "next/server";
import { runManualSummarizer } from "@/lib/orchestrator";
import { getSession } from "@/lib/store";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (!session.config.summarizer) {
    return NextResponse.json({ error: "Session has no summarizer configured." }, { status: 400 });
  }

  void runManualSummarizer(id);
  return NextResponse.json({ ok: true });
}
