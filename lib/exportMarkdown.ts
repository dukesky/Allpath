import { Message, MessageAttachment, Mode } from "@/lib/types";

// Client-side Markdown export of a chat session. Everything here is pure and
// deterministic (the export time is an input); the Blob download lives in the
// chat UI. Only names, labels, models and message text are ever emitted —
// never provider keys or attachment payloads (dataUrl / textContent).

export const DEFAULT_EXPORT_TITLE = "AllPath session";
export const EXPORT_ATTRIBUTION_FOOTER =
  "_Exported from [AllPath](https://all-path.com) — where many minds find one path._";

const MAX_TITLE_FROM_MESSAGE_LENGTH = 60;
const MAX_SLUG_LENGTH = 60;

export interface ExportMember {
  label: string;
  roleTitle?: string;
  model?: string;
}

export type ExportMessage = Pick<
  Message,
  "roundId" | "sourceRole" | "sourceLabel" | "status" | "content" | "createdAt"
> & {
  attachments?: Array<Pick<MessageAttachment, "name">>;
};

export interface SessionMarkdownInput {
  title: string;
  mode: Mode;
  exportedAt: Date;
  members: ExportMember[];
  messages: ExportMessage[];
}

const MODE_LABELS: Record<Mode, string> = {
  roundtable: "Round table",
  one_to_one: "One-to-one"
};

function singleLine(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

// YYYY-MM-DD in the exporter's local time zone.
export function formatExportDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// Stable chronological order: round ascending, then createdAt, then input order.
function sortChronologically<T extends Pick<Message, "roundId" | "createdAt">>(messages: T[]): T[] {
  return messages
    .map((message, index) => ({ message, index }))
    .sort(
      (a, b) =>
        a.message.roundId - b.message.roundId ||
        (a.message.createdAt ?? "").localeCompare(b.message.createdAt ?? "") ||
        a.index - b.index
    )
    .map(({ message }) => message);
}

function isExportable(message: ExportMessage): boolean {
  if (message.status === "streaming") {
    return false;
  }
  if (message.status === "failed") {
    return true;
  }
  return message.content.trim().length > 0 || (message.attachments?.length ?? 0) > 0;
}

function formatMember(member: ExportMember): string {
  const label = singleLine(member.label) || "Agent";
  const details = [singleLine(member.roleTitle), singleLine(member.model)].filter(Boolean);
  return details.length > 0 ? `- **${label}** — ${details.join(" · ")}` : `- **${label}**`;
}

function messageHeading(message: ExportMessage): string {
  let heading: string;
  if (message.sourceRole === "user") {
    heading = "You";
  } else if (message.sourceRole === "summarizer") {
    heading = `${singleLine(message.sourceLabel) || "Summarizer"} (Summary)`;
  } else {
    heading = singleLine(message.sourceLabel) || "Agent";
  }
  return message.status === "failed" ? `### ${heading} _(failed)_` : `### ${heading}`;
}

function messageBlocks(message: ExportMessage): string[] {
  const blocks = [messageHeading(message)];
  if (message.content.trim().length > 0) {
    blocks.push(message.content);
  }
  for (const attachment of message.attachments ?? []) {
    blocks.push(`📎 ${singleLine(attachment.name) || "attachment"}`);
  }
  return blocks;
}

export function sessionToMarkdown(input: SessionMarkdownInput): string {
  const messages = sortChronologically(input.messages.filter(isExportable));
  const roundIds = [...new Set(messages.map((message) => message.roundId))];

  const blocks: string[] = [
    `# ${singleLine(input.title) || DEFAULT_EXPORT_TITLE}`,
    [
      `- **Exported:** ${formatExportDate(input.exportedAt)}`,
      `- **Mode:** ${MODE_LABELS[input.mode] ?? input.mode}`,
      `- **Rounds:** ${roundIds.length}`
    ].join("\n")
  ];

  if (input.members.length > 0) {
    blocks.push("## Participants", input.members.map(formatMember).join("\n"));
  }

  for (const roundId of roundIds) {
    blocks.push(`## Round ${roundId}`);
    for (const message of messages) {
      if (message.roundId === roundId) {
        blocks.push(...messageBlocks(message));
      }
    }
  }

  blocks.push("---", EXPORT_ATTRIBUTION_FOOTER);

  return `${blocks.join("\n\n")}\n`;
}

// Sidebar title → first user message (truncated) → "AllPath session".
export function resolveExportTitle(input: {
  sessionTitle?: string | null;
  messages: ExportMessage[];
}): string {
  const sessionTitle = singleLine(input.sessionTitle);
  if (sessionTitle) {
    return sessionTitle;
  }

  const firstUserMessage = sortChronologically(
    input.messages.filter((message) => message.sourceRole === "user" && message.content.trim().length > 0)
  )[0];
  const text = singleLine(firstUserMessage?.content);
  if (!text) {
    return DEFAULT_EXPORT_TITLE;
  }
  if (text.length <= MAX_TITLE_FROM_MESSAGE_LENGTH) {
    return text;
  }
  return `${text.slice(0, MAX_TITLE_FROM_MESSAGE_LENGTH - 1).trimEnd()}…`;
}

// ASCII-only, lowercase, dash-separated; "session" when nothing usable remains.
export function slugifyExportTitle(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return slug || "session";
}

export function buildExportFilename(title: string, exportedAt: Date): string {
  return `allpath-${slugifyExportTitle(title)}-${formatExportDate(exportedAt)}.md`;
}

export function buildSessionExport(input: {
  sessionTitle?: string | null;
  mode: Mode;
  exportedAt: Date;
  members: ExportMember[];
  messages: ExportMessage[];
}): { title: string; filename: string; markdown: string } {
  const title = resolveExportTitle({ sessionTitle: input.sessionTitle, messages: input.messages });
  return {
    title,
    filename: buildExportFilename(title, input.exportedAt),
    markdown: sessionToMarkdown({
      title,
      mode: input.mode,
      exportedAt: input.exportedAt,
      members: input.members,
      messages: input.messages
    })
  };
}
