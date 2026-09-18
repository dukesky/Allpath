import { describe, expect, it } from "vitest";
import {
  LEGACY_SHARE_FORK_STORAGE_KEY,
  SHARE_FORK_STORAGE_KEY,
  clearShareForkRequest,
  parseShareForkRequest,
  readShareForkRequest,
  shareAgentsToParticipantFields,
  writeShareForkRequest
} from "./shareFork";

function makeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    }
  };
}

describe("parseShareForkRequest", () => {
  it("parses both intents and defaults unknown intents to continue", () => {
    expect(parseShareForkRequest(JSON.stringify({ shareId: "abc", intent: "fresh" }))).toEqual({
      shareId: "abc",
      intent: "fresh"
    });
    expect(parseShareForkRequest(JSON.stringify({ shareId: "abc", intent: "continue" }))).toEqual({
      shareId: "abc",
      intent: "continue"
    });
    expect(parseShareForkRequest(JSON.stringify({ shareId: "abc", intent: "other" }))).toEqual({
      shareId: "abc",
      intent: "continue"
    });
  });

  it("rejects malformed entries", () => {
    expect(parseShareForkRequest(null)).toBeNull();
    expect(parseShareForkRequest("not json")).toBeNull();
    expect(parseShareForkRequest(JSON.stringify({ intent: "fresh" }))).toBeNull();
    expect(parseShareForkRequest(JSON.stringify({ shareId: "   ", intent: "fresh" }))).toBeNull();
    expect(parseShareForkRequest(JSON.stringify(null))).toBeNull();
  });
});

describe("readShareForkRequest", () => {
  it("reads the current key without removing it", () => {
    const storage = makeStorage({
      [SHARE_FORK_STORAGE_KEY]: JSON.stringify({ shareId: "s1", intent: "fresh" })
    });
    expect(readShareForkRequest(storage)).toEqual({ shareId: "s1", intent: "fresh" });
    expect(storage.data.has(SHARE_FORK_STORAGE_KEY)).toBe(true);
  });

  it("treats the legacy key as continue and migrates it", () => {
    const storage = makeStorage({ [LEGACY_SHARE_FORK_STORAGE_KEY]: "legacy-id" });
    expect(readShareForkRequest(storage)).toEqual({ shareId: "legacy-id", intent: "continue" });
    expect(storage.data.has(LEGACY_SHARE_FORK_STORAGE_KEY)).toBe(false);
    expect(parseShareForkRequest(storage.getItem(SHARE_FORK_STORAGE_KEY))).toEqual({
      shareId: "legacy-id",
      intent: "continue"
    });
    // Survives a second read (e.g. a page reload).
    expect(readShareForkRequest(storage)).toEqual({ shareId: "legacy-id", intent: "continue" });
  });

  it("returns null when nothing is pending or storage throws", () => {
    expect(readShareForkRequest(makeStorage())).toBeNull();
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => undefined,
      removeItem: () => undefined
    };
    expect(readShareForkRequest(broken)).toBeNull();
  });
});

describe("write/clear", () => {
  it("writes the new key, drops the legacy one, and clear removes both", () => {
    const storage = makeStorage({ [LEGACY_SHARE_FORK_STORAGE_KEY]: "old" });
    writeShareForkRequest(storage, { shareId: "s2", intent: "continue" });
    expect(storage.data.has(LEGACY_SHARE_FORK_STORAGE_KEY)).toBe(false);
    expect(readShareForkRequest(storage)).toEqual({ shareId: "s2", intent: "continue" });

    storage.setItem(LEGACY_SHARE_FORK_STORAGE_KEY, "old");
    clearShareForkRequest(storage);
    expect(storage.data.size).toBe(0);
  });
});

describe("shareAgentsToParticipantFields", () => {
  it("keeps each agent's own model, label, avatar, role and character", () => {
    const fields = shareAgentsToParticipantFields(
      [
        {
          id: "a",
          label: "Confucius",
          avatarUrl: "/avatars/confucius.png",
          model: "anthropic/claude-sonnet-4.5",
          roleTitle: "Philosopher",
          character: "Measured"
        },
        { id: "b", label: "Socrates", model: "google/gemini-2.5-pro" }
      ],
      "openai/gpt-5-mini"
    );

    expect(fields).toEqual([
      {
        id: "share-a-0",
        label: "Confucius",
        avatarUrl: "/avatars/confucius.png",
        model: "anthropic/claude-sonnet-4.5",
        roleTitle: "Philosopher",
        character: "Measured"
      },
      {
        id: "share-b-1",
        label: "Socrates",
        avatarUrl: "",
        model: "google/gemini-2.5-pro",
        roleTitle: "",
        character: ""
      }
    ]);
  });

  it("falls back only when an agent has no model", () => {
    const fields = shareAgentsToParticipantFields(
      [{ id: "a", label: "A", model: "" }],
      "openai/gpt-5-mini"
    );
    expect(fields[0].model).toBe("openai/gpt-5-mini");
  });
});
