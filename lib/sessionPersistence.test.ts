import { describe, expect, it } from "vitest";
import {
  buildSessionDoc,
  sanitizeMessageForPersistence,
  sanitizeParticipantForPersistence
} from "./sessionPersistence";
import { Message, ParticipantConfig, SessionConfig } from "./types";

const participant: ParticipantConfig = {
  id: "p1",
  label: "Analyst A",
  avatarUrl: "/avatars/cat.png",
  model: "openai/gpt-5-mini",
  provider: { type: "openrouter", apiKey: "sk-or-secret" },
  roleTitle: "Analyst",
  character: "Calm and rigorous"
};

const baseMessage: Message = {
  messageId: "m1",
  roundId: 1,
  sourceRole: "user",
  sourceLabel: "You",
  createdAt: "2026-08-10T00:00:00.000Z",
  status: "completed",
  content: "hello"
};

function baseConfig(): SessionConfig {
  return {
    sessionId: "live-1",
    persistentId: "pid-1",
    ownerUid: "uid-1",
    mode: "roundtable",
    globalApiKey: "sk-or-global-secret",
    participants: [participant],
    summarizer: { ...participant, id: "sum", label: "Summarizer" },
    roundNumber: 3,
    status: "waiting",
    messages: [baseMessage]
  };
}

describe("sanitizeParticipantForPersistence", () => {
  it("strips the provider apiKey but keeps provider type and baseUrl", () => {
    const custom: ParticipantConfig = {
      ...participant,
      provider: { type: "custom", apiKey: "secret", baseUrl: "https://llm.example.com/v1" }
    };
    const result = sanitizeParticipantForPersistence(custom);
    expect(result.provider).toEqual({ type: "custom", baseUrl: "https://llm.example.com/v1" });
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("omits undefined optional fields entirely", () => {
    const minimal: ParticipantConfig = {
      id: "p2",
      label: "B",
      model: "m",
      provider: { type: "openrouter", apiKey: "" }
    };
    const result = sanitizeParticipantForPersistence(minimal);
    expect(Object.keys(result).sort()).toEqual(["id", "label", "model", "provider"]);
    expect(Object.keys(result.provider)).toEqual(["type"]);
  });
});

describe("sanitizeMessageForPersistence", () => {
  it("strips attachment payloads but keeps attachment metadata", () => {
    const message: Message = {
      ...baseMessage,
      attachments: [
        {
          attachmentId: "a1",
          name: "diagram.png",
          mimeType: "image/png",
          kind: "image",
          dataUrl: "data:image/png;base64,AAAA"
        },
        {
          attachmentId: "a2",
          name: "notes.txt",
          mimeType: "text/plain",
          kind: "text",
          textContent: "very long text"
        }
      ]
    };
    const result = sanitizeMessageForPersistence(message);
    expect(result.attachments).toEqual([
      { attachmentId: "a1", name: "diagram.png", mimeType: "image/png", kind: "image" },
      { attachmentId: "a2", name: "notes.txt", mimeType: "text/plain", kind: "text" }
    ]);
  });

  it("omits undefined optional fields", () => {
    const result = sanitizeMessageForPersistence(baseMessage);
    expect("parentId" in result).toBe(false);
    expect("attachments" in result).toBe(false);
    expect("sourceModel" in result).toBe(false);
  });
});

describe("buildSessionDoc", () => {
  it("never contains api keys", () => {
    const doc = buildSessionDoc(baseConfig(), "2026-08-10T01:00:00.000Z");
    const json = JSON.stringify(doc);
    expect(json).not.toContain("sk-or-secret");
    expect(json).not.toContain("sk-or-global-secret");
    expect(json).not.toContain("apiKey");
  });

  it("captures identity, config and counters", () => {
    const doc = buildSessionDoc(baseConfig(), "2026-08-10T01:00:00.000Z");
    expect(doc).toMatchObject({
      persistentId: "pid-1",
      ownerUid: "uid-1",
      liveSessionId: "live-1",
      mode: "roundtable",
      roundNumber: 3,
      messageCount: 1,
      updatedAt: "2026-08-10T01:00:00.000Z"
    });
    expect(doc.participants).toHaveLength(1);
    expect(doc.summarizer?.label).toBe("Summarizer");
  });

  it("derives the title from the first user message when no title is set", () => {
    const doc = buildSessionDoc(baseConfig(), "2026-08-10T01:00:00.000Z");
    expect(doc.title).toBe("hello");
  });

  it("prefers an explicit session title and truncates long derived titles", () => {
    const titled = { ...baseConfig(), title: "My debate" };
    expect(buildSessionDoc(titled, "t").title).toBe("My debate");

    const longContent = { ...baseConfig(), messages: [{ ...baseMessage, content: "x".repeat(200) }] };
    expect(buildSessionDoc(longContent, "t").title).toHaveLength(80);
  });

  it("falls back to a default title when there are no user messages", () => {
    const empty = { ...baseConfig(), messages: [] };
    expect(buildSessionDoc(empty, "t").title).toBe("New session");
  });
});
