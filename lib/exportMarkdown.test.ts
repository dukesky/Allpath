import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPORT_TITLE,
  EXPORT_ATTRIBUTION_FOOTER,
  buildExportFilename,
  buildSessionExport,
  formatExportDate,
  resolveExportTitle,
  sessionToMarkdown,
  slugifyExportTitle
} from "./exportMarkdown";
import { Message, ParticipantConfig } from "./types";

// Local-time constructor so date formatting is timezone-independent in tests.
const EXPORTED_AT = new Date(2026, 8, 18, 23, 30, 0);

let messageCounter = 0;
function msg(overrides: Partial<Message>): Message {
  messageCounter += 1;
  return {
    messageId: `m${messageCounter}`,
    roundId: 1,
    sourceRole: "assistant",
    sourceLabel: "Alice",
    createdAt: `2026-09-18T10:00:${String(messageCounter).padStart(2, "0")}.000Z`,
    status: "completed",
    content: "hello",
    ...overrides
  };
}

const members = [
  { label: "Alice", roleTitle: "Philosopher", model: "openai/gpt-5-mini" },
  { label: "Bob", model: "anthropic/claude-sonnet-4" },
  { label: "Carol", roleTitle: "Critic" },
  { label: "Dan" }
];

describe("sessionToMarkdown", () => {
  it("renders title, metadata, participants and rounds in order", () => {
    const messages = [
      msg({ roundId: 1, sourceRole: "user", sourceLabel: "You", content: "What is justice?" }),
      msg({ roundId: 1, sourceLabel: "Alice", content: "Justice is fairness." }),
      msg({ roundId: 1, sourceLabel: "Bob", content: "I disagree." }),
      msg({ roundId: 2, sourceRole: "user", sourceLabel: "You", content: "Summarize please." }),
      msg({ roundId: 2, sourceRole: "summarizer", sourceLabel: "Summarizer", content: "They disagreed." })
    ];

    const markdown = sessionToMarkdown({
      title: "Justice debate",
      mode: "roundtable",
      exportedAt: EXPORTED_AT,
      members,
      messages
    });

    expect(markdown).toBe(
      [
        "# Justice debate",
        "",
        "- **Exported:** 2026-09-18",
        "- **Mode:** Round table",
        "- **Rounds:** 2",
        "",
        "## Participants",
        "",
        "- **Alice** — Philosopher · openai/gpt-5-mini",
        "- **Bob** — anthropic/claude-sonnet-4",
        "- **Carol** — Critic",
        "- **Dan**",
        "",
        "## Round 1",
        "",
        "### You",
        "",
        "What is justice?",
        "",
        "### Alice",
        "",
        "Justice is fairness.",
        "",
        "### Bob",
        "",
        "I disagree.",
        "",
        "## Round 2",
        "",
        "### You",
        "",
        "Summarize please.",
        "",
        "### Summarizer (Summary)",
        "",
        "They disagreed.",
        "",
        "---",
        "",
        "_Exported from [AllPath](https://all-path.com) — where many minds find one path._",
        ""
      ].join("\n")
    );
  });

  it("ends with the AllPath attribution footer exactly once, after a rule", () => {
    const footer = "_Exported from [AllPath](https://all-path.com) — where many minds find one path._";
    expect(EXPORT_ATTRIBUTION_FOOTER).toBe(footer);

    for (const messages of [[], [msg({ content: "hi" }), msg({ roundId: 2, content: "later" })]]) {
      const markdown = sessionToMarkdown({
        title: "T",
        mode: "roundtable",
        exportedAt: EXPORTED_AT,
        members,
        messages
      });
      expect(markdown.endsWith(`\n\n---\n\n${footer}\n`)).toBe(true);
      expect(markdown.split(footer).length - 1).toBe(1);
      expect(markdown.split("\n---\n").length - 1).toBe(1);
    }
  });

  it("labels one_to_one mode as One-to-one", () => {
    const markdown = sessionToMarkdown({
      title: "T",
      mode: "one_to_one",
      exportedAt: EXPORTED_AT,
      members: [],
      messages: []
    });
    expect(markdown).toContain("- **Mode:** One-to-one");
    expect(markdown).toContain("- **Rounds:** 0");
    expect(markdown).not.toContain("## Participants");
    expect(markdown).not.toContain("## Round");
  });

  it("sorts rounds ascending and messages by createdAt within a round", () => {
    const messages = [
      msg({ roundId: 3, sourceLabel: "Bob", content: "r3 bob", createdAt: "2026-09-18T12:00:02.000Z" }),
      msg({ roundId: 1, sourceRole: "user", sourceLabel: "You", content: "r1 user", createdAt: "2026-09-18T10:00:00.000Z" }),
      msg({ roundId: 3, sourceRole: "user", sourceLabel: "You", content: "r3 user", createdAt: "2026-09-18T12:00:00.000Z" }),
      msg({ roundId: 1, sourceLabel: "Alice", content: "r1 alice", createdAt: "2026-09-18T10:00:01.000Z" })
    ];
    const markdown = sessionToMarkdown({
      title: "T",
      mode: "roundtable",
      exportedAt: EXPORTED_AT,
      members: [],
      messages
    });

    const order = ["## Round 1", "r1 user", "r1 alice", "## Round 3", "r3 user", "r3 bob"].map((needle) =>
      markdown.indexOf(needle)
    );
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(markdown).toContain("- **Rounds:** 2");
    expect(markdown).not.toContain("## Round 2");
  });

  it("keeps message content verbatim, including markdown and code", () => {
    const content = "Line one\n\n```ts\nconst x = 1;\n```\n\n- item *a*\n- item _b_";
    const markdown = sessionToMarkdown({
      title: "T",
      mode: "roundtable",
      exportedAt: EXPORTED_AT,
      members: [],
      messages: [msg({ content })]
    });
    expect(markdown).toContain(`### Alice\n\n${content}\n`);
  });

  it("excludes streaming messages and marks failed ones", () => {
    const markdown = sessionToMarkdown({
      title: "T",
      mode: "roundtable",
      exportedAt: EXPORTED_AT,
      members: [],
      messages: [
        msg({ roundId: 1, sourceRole: "user", sourceLabel: "You", content: "Q" }),
        msg({ roundId: 1, sourceLabel: "Alice", status: "streaming", content: "half-written" }),
        msg({ roundId: 1, sourceLabel: "Bob", status: "failed", content: "partial answer" }),
        msg({ roundId: 1, sourceLabel: "Carol", status: "failed", content: "" }),
        msg({ roundId: 2, sourceLabel: "Dan", status: "streaming", content: "only streaming" })
      ]
    });
    expect(markdown).not.toContain("half-written");
    expect(markdown).not.toContain("### Alice");
    expect(markdown).not.toContain("only streaming");
    expect(markdown).not.toContain("## Round 2");
    expect(markdown).toContain("- **Rounds:** 1");
    expect(markdown).toContain("### Bob _(failed)_\n\npartial answer\n");
    expect(markdown).toContain("### Carol _(failed)_\n");
  });

  it("skips completed messages with no content and no attachments", () => {
    const markdown = sessionToMarkdown({
      title: "T",
      mode: "roundtable",
      exportedAt: EXPORTED_AT,
      members: [],
      messages: [
        msg({ sourceRole: "user", sourceLabel: "You", content: "Q" }),
        msg({ sourceLabel: "Ghost", content: "   " })
      ]
    });
    expect(markdown).not.toContain("### Ghost");
  });

  it("lists attachments by name only, never their data", () => {
    const markdown = sessionToMarkdown({
      title: "T",
      mode: "roundtable",
      exportedAt: EXPORTED_AT,
      members: [],
      messages: [
        msg({
          sourceRole: "user",
          sourceLabel: "You",
          content: "",
          attachments: [
            {
              attachmentId: "a1",
              name: "chart.png",
              mimeType: "image/png",
              kind: "image",
              dataUrl: "data:image/png;base64,SECRETPIXELS"
            },
            {
              attachmentId: "a2",
              name: "notes\nfile.txt",
              mimeType: "text/plain",
              kind: "text",
              textContent: "SECRET TEXT BODY"
            }
          ]
        })
      ]
    });
    expect(markdown).toContain("### You\n\n📎 chart.png\n\n📎 notes file.txt\n");
    expect(markdown).not.toContain("SECRETPIXELS");
    expect(markdown).not.toContain("data:image");
    expect(markdown).not.toContain("SECRET TEXT BODY");
  });

  it("puts attachments after the message content", () => {
    const markdown = sessionToMarkdown({
      title: "T",
      mode: "roundtable",
      exportedAt: EXPORTED_AT,
      members: [],
      messages: [
        msg({
          sourceRole: "user",
          sourceLabel: "You",
          content: "Look at this",
          attachments: [{ attachmentId: "a1", name: "a.png", mimeType: "image/png", kind: "image" }]
        })
      ]
    });
    expect(markdown).toContain("### You\n\nLook at this\n\n📎 a.png\n");
  });

  it("uses You for user messages regardless of sourceLabel", () => {
    const markdown = sessionToMarkdown({
      title: "T",
      mode: "roundtable",
      exportedAt: EXPORTED_AT,
      members: [],
      messages: [msg({ sourceRole: "user", sourceLabel: "someone", content: "hi" })]
    });
    expect(markdown).toContain("### You\n");
    expect(markdown).not.toContain("### someone");
  });

  it("omits missing or blank participant parts cleanly", () => {
    const markdown = sessionToMarkdown({
      title: "T",
      mode: "roundtable",
      exportedAt: EXPORTED_AT,
      members: [
        { label: "Eve", roleTitle: "  ", model: "" },
        { label: "Finn", roleTitle: "", model: "x/y" }
      ],
      messages: []
    });
    expect(markdown).toContain("- **Eve**\n");
    expect(markdown).toContain("- **Finn** — x/y\n");
    expect(markdown).not.toContain(" ·  ");
    expect(markdown).not.toContain("—  ");
  });

  it("never includes provider API keys even when members carry them", () => {
    const participant: ParticipantConfig = {
      id: "p1",
      label: "Alice",
      model: "openai/gpt-5-mini",
      provider: { type: "openrouter", apiKey: "sk-or-secret-key" },
      roleTitle: "Philosopher"
    };
    const markdown = sessionToMarkdown({
      title: "T",
      mode: "roundtable",
      exportedAt: EXPORTED_AT,
      members: [participant],
      messages: [msg({ content: "hi" })]
    });
    expect(markdown).toContain("- **Alice** — Philosopher · openai/gpt-5-mini");
    expect(markdown).not.toContain("sk-or-secret-key");
  });

  it("is deterministic for the same input", () => {
    const input = {
      title: "T",
      mode: "roundtable" as const,
      exportedAt: EXPORTED_AT,
      members,
      messages: [msg({ content: "a" }), msg({ content: "b" })]
    };
    expect(sessionToMarkdown(input)).toBe(sessionToMarkdown(input));
  });
});

describe("resolveExportTitle", () => {
  it("prefers the sidebar session title", () => {
    expect(
      resolveExportTitle({
        sessionTitle: "  My debate  ",
        messages: [msg({ sourceRole: "user", content: "first question" })]
      })
    ).toBe("My debate");
  });

  it("falls back to the first user message, whitespace-collapsed and truncated", () => {
    const long = "Why   is the sky\nblue? ".repeat(10);
    const title = resolveExportTitle({
      sessionTitle: "",
      messages: [
        msg({ roundId: 2, sourceRole: "user", content: "second", createdAt: "2026-09-18T11:00:00.000Z" }),
        msg({ roundId: 1, sourceLabel: "Alice", content: "agent first", createdAt: "2026-09-18T09:00:00.000Z" }),
        msg({ roundId: 1, sourceRole: "user", content: long, createdAt: "2026-09-18T10:00:00.000Z" })
      ]
    });
    expect(title.startsWith("Why is the sky blue?")).toBe(true);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.endsWith("…")).toBe(true);
    expect(title).not.toContain("\n");
  });

  it("does not truncate a short first user message", () => {
    expect(
      resolveExportTitle({ sessionTitle: undefined, messages: [msg({ sourceRole: "user", content: " Short q " })] })
    ).toBe("Short q");
  });

  it("falls back to AllPath session", () => {
    expect(DEFAULT_EXPORT_TITLE).toBe("AllPath session");
    expect(resolveExportTitle({ sessionTitle: null, messages: [] })).toBe("AllPath session");
    expect(
      resolveExportTitle({ sessionTitle: "   ", messages: [msg({ sourceRole: "user", content: "  " })] })
    ).toBe("AllPath session");
  });
});

describe("slugifyExportTitle", () => {
  it("produces an ASCII-safe lowercase slug", () => {
    expect(slugifyExportTitle("Session 9/18/2026, 10:00:00 AM · Alice, Bob")).toBe(
      "session-9-18-2026-10-00-00-am-alice-bob"
    );
    expect(slugifyExportTitle("Café débat: Ürdün!")).toBe("cafe-debat-urdun");
    expect(slugifyExportTitle("  --Hello__World--  ")).toBe("hello-world");
  });

  it("falls back to session when nothing ASCII-safe remains", () => {
    expect(slugifyExportTitle("西游记 圆桌")).toBe("session");
    expect(slugifyExportTitle("")).toBe("session");
    expect(slugifyExportTitle("!!! ???")).toBe("session");
  });

  it("caps the slug length without a trailing dash", () => {
    const slug = slugifyExportTitle("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
    expect(/^[a-z0-9-]+$/.test(slug)).toBe(true);
  });
});

describe("buildExportFilename", () => {
  it("formats allpath-{slug}-{YYYY-MM-DD}.md using the local date", () => {
    expect(formatExportDate(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
    expect(buildExportFilename("Justice debate", EXPORTED_AT)).toBe("allpath-justice-debate-2026-09-18.md");
    expect(buildExportFilename("西游记", EXPORTED_AT)).toBe("allpath-session-2026-09-18.md");
  });
});

describe("buildSessionExport", () => {
  it("resolves the title and returns matching filename and markdown", () => {
    const result = buildSessionExport({
      sessionTitle: undefined,
      mode: "one_to_one",
      exportedAt: EXPORTED_AT,
      members: [{ label: "Alice" }],
      messages: [
        msg({ sourceRole: "user", sourceLabel: "You", content: "Plan my trip" }),
        msg({ sourceLabel: "Alice", content: "Sure." })
      ]
    });
    expect(result.title).toBe("Plan my trip");
    expect(result.filename).toBe("allpath-plan-my-trip-2026-09-18.md");
    expect(result.markdown.startsWith("# Plan my trip\n")).toBe(true);
    expect(result.markdown).toContain("- **Mode:** One-to-one");
  });
});
