import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/store";
import { ParticipantConfig, SessionConfig } from "@/lib/types";

const DEFAULT_AGENT_INITIAL_PROMPT = [
  "You only speak for yourself; never write what other agents would say.",
  "Treat other agents as peers and the user as the discussion owner.",
  "Do not imitate formatting of prior messages.",
  "Do not output prefixes like 'Speaker:' or 'Message:'.",
  "Do not output bracket tags like '[Name | model]'.",
  "If you want to reference another agent, summarize their idea in one short sentence.",
  "If disagreeing, explain your own reasoning only."
].join("\n");

function validateParticipant(raw: unknown): raw is ParticipantConfig {
  if (!raw || typeof raw !== "object") {
    return false;
  }

  const value = raw as Record<string, unknown>;
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.model === "string" &&
    !!value.provider &&
    typeof (value.provider as Record<string, unknown>).type === "string" &&
    typeof (value.provider as Record<string, unknown>).apiKey === "string"
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    participants?: unknown[];
    summarizer?: unknown;
    agentInitialPrompt?: unknown;
    globalApiKey?: unknown;
  };

  const participants = (body.participants ?? []).filter(validateParticipant);

  if (participants.length < 2) {
    return NextResponse.json({ error: "At least two participants are required." }, { status: 400 });
  }

  const summarizer = validateParticipant(body.summarizer) ? body.summarizer : undefined;

  const session: SessionConfig = {
    sessionId: randomUUID(),
    mode: "roundtable",
    agentInitialPrompt:
      typeof body.agentInitialPrompt === "string" && body.agentInitialPrompt.trim().length > 0
        ? body.agentInitialPrompt.trim()
        : DEFAULT_AGENT_INITIAL_PROMPT,
    globalApiKey:
      typeof body.globalApiKey === "string" && body.globalApiKey.trim().length > 0
        ? body.globalApiKey.trim()
        : undefined,
    participants,
    summarizer,
    roundNumber: 0,
    status: "idle",
    messages: []
  };

  createSession(session);

  return NextResponse.json({
    sessionId: session.sessionId,
    mode: session.mode,
    status: session.status,
    roundNumber: session.roundNumber
  });
}
