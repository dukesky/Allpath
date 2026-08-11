import { beforeEach, describe, expect, it } from "vitest";
import { createSession, setParticipantMuted, subscribe, toClientParticipant } from "./store";
import { ParticipantConfig, SessionConfig, StreamEvent } from "./types";

function makeParticipant(id: string): ParticipantConfig {
  return {
    id,
    label: `Agent ${id}`,
    avatarUrl: "/avatars/cat.png",
    model: "openai/gpt-5-mini",
    provider: { type: "custom", apiKey: "sk-secret", baseUrl: "https://llm.internal/v1" },
    roleTitle: "Analyst",
    character: "Calm and rigorous"
  };
}

function makeConfig(sessionId: string): SessionConfig {
  return {
    sessionId,
    mode: "roundtable",
    globalApiKey: "sk-or-global-secret",
    participants: [makeParticipant("p1"), makeParticipant("p2")],
    roundNumber: 0,
    status: "idle",
    messages: []
  };
}

beforeEach(() => {
  globalThis.__allpathSessions?.clear();
});

describe("toClientParticipant", () => {
  it("keeps only client-facing fields and never the provider config", () => {
    const result = toClientParticipant({ ...makeParticipant("p1"), muted: true });

    expect(result).toEqual({
      id: "p1",
      label: "Agent p1",
      avatarUrl: "/avatars/cat.png",
      model: "openai/gpt-5-mini",
      muted: true
    });
    expect(JSON.stringify(result)).not.toContain("sk-secret");
  });
});

describe("setParticipantMuted", () => {
  it("emits and returns sanitized participants without provider secrets", () => {
    const config = makeConfig("s1");
    createSession(config);

    const events: StreamEvent[] = [];
    subscribe("s1", (event) => events.push(event));

    const returned = setParticipantMuted("s1", "p1", true);

    expect(returned).not.toBeNull();
    expect(returned![0]).toMatchObject({ id: "p1", muted: true });
    expect(JSON.stringify(returned)).not.toContain("sk-secret");

    expect(events).toHaveLength(1);
    const payload = events[0].payload as { participants: unknown };
    expect(JSON.stringify(payload.participants)).not.toContain("sk-secret");
    expect(JSON.stringify(payload)).not.toContain("baseUrl");
  });
});
