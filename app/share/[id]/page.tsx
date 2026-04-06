import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getShareRecord } from "@/lib/share";
import { Message, ShareableParticipant } from "@/lib/types";
import { StartFromHereButton } from "./StartFromHereButton";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getShareRecord(id).catch(() => null);
  if (!record) {
    return { title: "Session not found — Allpath" };
  }
  const agentNames = record.agentConfig.map((a) => a.label).join(", ");
  return {
    title: `${record.title} — Allpath`,
    description: `A multi-agent discussion with ${agentNames}. ${record.transcript.length} messages.`,
    openGraph: {
      title: record.title,
      description: `Multi-agent discussion on Allpath with ${agentNames}`,
      siteName: "Allpath"
    }
  };
}

function initialsForLabel(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function AgentAvatar({ agent }: { agent: ShareableParticipant }) {
  return (
    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
      {agent.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={agent.label} className="h-full w-full object-cover" src={agent.avatarUrl} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600">
          {initialsForLabel(agent.label)}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  agentConfig
}: {
  message: Message;
  agentConfig: ShareableParticipant[];
}) {
  const isUser = message.sourceRole === "user";
  const agent = agentConfig.find((a) => a.label === message.sourceLabel);

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && agent && <AgentAvatar agent={agent} />}
      {!isUser && !agent && (
        <div className="h-8 w-8 shrink-0 rounded-full bg-slate-200" />
      )}
      <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && (
          <p className="text-xs font-semibold text-slate-500">
            {message.sourceLabel}
            {message.sourceRole === "summarizer" && (
              <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700">
                Summary
              </span>
            )}
          </p>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-indigo-600 text-white"
              : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;

  let record;
  try {
    record = await getShareRecord(id);
  } catch {
    notFound();
  }

  if (!record) {
    notFound();
  }

  const roundIds = [...new Set(record.transcript.map((m) => m.roundId))].sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            Allpath
          </Link>
          <span className="text-xs text-slate-500">Shared conversation</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Session title and agents */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">{record.title}</h1>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {record.mode.replace("_", " ")} · {record.transcript.length} messages
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {record.agentConfig.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"
              >
                <AgentAvatar agent={agent} />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{agent.label}</p>
                  {agent.roleTitle && (
                    <p className="text-[10px] text-slate-500">{agent.roleTitle}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <StartFromHereButton shareId={record.shareId} />
            <p className="mt-2 text-xs text-slate-400">
              Opens a new conversation with this team, starting from this point in the discussion.
            </p>
          </div>
        </div>

        {/* Transcript */}
        <div className="space-y-6">
          {roundIds.map((roundId) => {
            const roundMessages = record.transcript.filter((m) => m.roundId === roundId);
            return (
              <div key={roundId}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Round {roundId}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="space-y-3">
                  {roundMessages.map((message) => (
                    <MessageBubble
                      key={message.messageId}
                      message={message}
                      agentConfig={record.agentConfig}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center">
          <p className="text-sm font-semibold text-slate-800">Want to continue this conversation?</p>
          <p className="mt-1 text-sm text-slate-500">
            Start your own session with the same team, picking up where this left off.
          </p>
          <div className="mt-4 flex justify-center">
            <StartFromHereButton shareId={record.shareId} />
          </div>
        </div>
      </main>
    </div>
  );
}
