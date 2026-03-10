import { NextResponse } from "next/server";
import { runManualSummarizer } from "@/lib/orchestrator";
import { getSession } from "@/lib/store";
import { resolveOpenRouterProviderForSession, TrialAccessError } from "@/lib/trial";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (!session.config.summarizer) {
    return NextResponse.json({ error: "Session has no summarizer configured." }, { status: 400 });
  }

  try {
    await resolveOpenRouterProviderForSession({
      provider: session.config.summarizer.provider,
      sessionGlobalApiKey: session.config.globalApiKey,
      trialGuestId: session.config.trialGuestId
    });
  } catch (error) {
    const message =
      error instanceof TrialAccessError ? error.message : "Failed to validate OpenRouter access.";
    const code =
      error instanceof TrialAccessError ? error.code : "trial_access_error";
    const status =
      error instanceof TrialAccessError ? error.status : 500;
    return NextResponse.json({ error: message, code }, { status });
  }

  void runManualSummarizer(id);
  return NextResponse.json({ ok: true });
}
