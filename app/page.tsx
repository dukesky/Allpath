"use client";

import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  CatalogModel,
  FEATURED_MODELS,
  MORE_MODELS,
  modelPriceTag
} from "@/lib/modelCatalog";
import { Message, ProviderType } from "@/lib/types";

const PROFILE_STORAGE_KEY = "allpath-agent-profiles";

interface AgentProfile {
  id: string;
  name: string;
  roleTitle: string;
  character: string;
}

type ParticipantForm = {
  id: string;
  label: string;
  model: string;
  providerType: ProviderType;
  apiKey: string;
  baseUrl: string;
  roleTitle: string;
  character: string;
  profileId: string;
};

function defaultParticipant(seed: string, label: string): ParticipantForm {
  return {
    id: seed,
    label,
    model: "openai/gpt-5-mini",
    providerType: "openrouter",
    apiKey: "",
    baseUrl: "",
    roleTitle: "",
    character: "",
    profileId: ""
  };
}

function ModelPicker(props: {
  selected: string;
  onSelect: (model: string) => void;
  featuredModels: CatalogModel[];
  moreModels: CatalogModel[];
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {props.featuredModels.map((model) => {
          const active = props.selected === model.id;
          return (
            <button
              key={model.id}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
                active
                  ? "border-primary bg-primary text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
              disabled={props.disabled}
              onClick={() => props.onSelect(model.id)}
              type="button"
            >
              {model.label} {model.price}
            </button>
          );
        })}
      </div>

      <button
        className="text-xs font-medium text-primary"
        disabled={props.disabled}
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        {expanded ? "Hide more models" : "Show more models"}
      </button>

      {expanded && (
        <select
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          onChange={(event) => props.onSelect(event.target.value)}
          value={props.selected}
        >
          <option value="">Select model</option>
          {[...props.featuredModels, ...props.moreModels].map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} ({model.id}) {model.price}
            </option>
          ))}
        </select>
      )}

      <input
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
        onChange={(event) => props.onSelect(event.target.value)}
        placeholder="Custom model ID"
        value={props.selected}
      />
      <p className="text-xs text-slate-500">Price tag: $ cheap, $$ normal, $$$ expensive.</p>
    </div>
  );
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = boldPattern.exec(text);
  let key = 0;

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={`t-${key++}`}>{text.slice(lastIndex, match.index)}</Fragment>);
    }

    nodes.push(<strong key={`b-${key++}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
    match = boldPattern.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`t-${key++}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}

function renderMessageContent(text: string): ReactNode[] {
  const lines = text.split("\n");
  const result: ReactNode[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    result.push(<Fragment key={`l-${i}`}>{renderInlineMarkdown(lines[i])}</Fragment>);
    if (i < lines.length - 1) {
      result.push(<br key={`br-${i}`} />);
    }
  }

  return result;
}

export default function HomePage() {
  const [agentInitialPrompt, setAgentInitialPrompt] = useState(
    [
      "You only speak for yourself; never write what other agents would say.",
      "Treat other agents as peers and the user as the discussion owner.",
      "Do not imitate formatting of prior messages.",
      "Do not output prefixes like 'Speaker:' or 'Message:'.",
      "Do not output bracket tags like '[Name | model]'.",
      "If you want to reference another agent, summarize their idea in one short sentence.",
      "If disagreeing, explain your own reasoning only."
    ].join("\n")
  );
  const [participants, setParticipants] = useState<ParticipantForm[]>([
    defaultParticipant("p1", "Analyst A"),
    defaultParticipant("p2", "Analyst B")
  ]);
  const [summarizerEnabled, setSummarizerEnabled] = useState(true);
  const [summarizer, setSummarizer] = useState<ParticipantForm>(
    defaultParticipant("sum", "Summarizer")
  );
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [dynamicCatalogModels, setDynamicCatalogModels] = useState<CatalogModel[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState("idle");
  const [roundNumber, setRoundNumber] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AgentProfile[];
      if (Array.isArray(parsed)) {
        setProfiles(parsed);
      }
    } catch {
      // ignore invalid localStorage format
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadModels() {
      try {
        const response = await fetch("/api/models?providerType=openrouter");
        if (!response.ok) {
          return;
        }

        const json = (await response.json()) as { models?: CatalogModel[] };
        if (!active) {
          return;
        }

        if (Array.isArray(json.models) && json.models.length > 0) {
          setDynamicCatalogModels(json.models);
        }
      } catch {
        // fallback to default static model list
      }
    }

    void loadModels();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const canCreate = participants.every((participant) => {
    if (!participant.model || !participant.apiKey) {
      return false;
    }

    if (participant.providerType === "custom" && !participant.baseUrl) {
      return false;
    }

    return true;
  }) &&
    (!summarizerEnabled ||
      (!!summarizer.model &&
        !!summarizer.apiKey &&
        (summarizer.providerType !== "custom" || !!summarizer.baseUrl)));

  const groupedMessages = useMemo(() => {
    return [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messages]);

  const modelPickerCatalog = useMemo(() => {
    const defaults = [...FEATURED_MODELS, ...MORE_MODELS];
    const source = dynamicCatalogModels && dynamicCatalogModels.length > 0 ? dynamicCatalogModels : defaults;

    const featuredModels = source.slice(0, 8);
    const moreModels = source.slice(8);

    return { featuredModels, moreModels };
  }, [dynamicCatalogModels]);

  const dynamicPriceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const model of dynamicCatalogModels ?? []) {
      map.set(model.id, model.price);
    }
    return map;
  }, [dynamicCatalogModels]);

  function updateParticipant(index: number, patch: Partial<ParticipantForm>) {
    setParticipants((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function applyProfileToParticipant(index: number, profileId: string) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) {
      updateParticipant(index, { profileId: "" });
      return;
    }

    updateParticipant(index, {
      profileId,
      roleTitle: profile.roleTitle,
      character: profile.character,
      label: profile.name || participants[index].label
    });
  }

  function applyProfileToSummarizer(profileId: string) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) {
      setSummarizer((current) => ({ ...current, profileId: "" }));
      return;
    }

    setSummarizer((current) => ({
      ...current,
      profileId,
      roleTitle: profile.roleTitle,
      character: profile.character,
      label: profile.name || current.label
    }));
  }

  function connectStream(newSessionId: string) {
    eventSourceRef.current?.close();
    const source = new EventSource(`/api/session/${newSessionId}/stream`);
    let openedOnce = false;

    source.onopen = () => {
      openedOnce = true;
      setError("");
    };

    source.addEventListener("session_state", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as {
        status: string;
        roundNumber: number;
        existingMessages?: Message[];
      };

      setStatus(payload.status);
      setRoundNumber(payload.roundNumber);

      if (payload.existingMessages) {
        setMessages(payload.existingMessages);
      }
    });

    source.addEventListener("message_created", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { message: Message };
      setMessages((current) => {
        if (current.some((item) => item.messageId === payload.message.messageId)) {
          return current;
        }
        return [...current, payload.message];
      });
    });

    source.addEventListener("message_updated", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { message: Message };
      setMessages((current) =>
        current.map((item) => (item.messageId === payload.message.messageId ? payload.message : item))
      );
    });

    source.addEventListener("server_error", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { message: string };
      setError(payload.message);
    });

    source.onerror = () => {
      // EventSource auto-reconnects; avoid false alarms on initial cold-start reconnect.
      if (!openedOnce && source.readyState !== EventSource.CLOSED) {
        return;
      }

      setError("SSE reconnecting. If this persists, recreate session.");
    };

    eventSourceRef.current = source;
  }

  async function createSession(event: FormEvent) {
    event.preventDefault();
    setError("");

    const payload = {
      agentInitialPrompt,
      participants: participants.map((item) => ({
        id: item.id,
        label: item.label,
        model: item.model,
        roleTitle: item.roleTitle || undefined,
        character: item.character || undefined,
        provider: {
          type: item.providerType,
          apiKey: item.apiKey,
          baseUrl: item.baseUrl || undefined
        }
      })),
      summarizer: summarizerEnabled
        ? {
            id: summarizer.id,
            label: summarizer.label,
            model: summarizer.model,
            roleTitle: summarizer.roleTitle || "Summarizer",
            character:
              summarizer.character ||
              "Summarize with decision, rationale, risks, and next actions.",
            provider: {
              type: summarizer.providerType,
              apiKey: summarizer.apiKey,
              baseUrl: summarizer.baseUrl || undefined
            }
          }
        : undefined
    };

    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Failed to create session.");
      return;
    }

    const json = (await response.json()) as { sessionId: string; status: string; roundNumber: number };
    setSessionId(json.sessionId);
    setStatus(json.status);
    setRoundNumber(json.roundNumber);
    setMessages([]);
    connectStream(json.sessionId);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!sessionId || !input.trim()) {
      return;
    }

    const requestPayload = JSON.stringify({ content: input });
    let response = await fetch(`/api/session/${sessionId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestPayload
    });

    if (response.status === 404) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      response = await fetch(`/api/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestPayload
      });
    }

    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Failed to send message.");
      return;
    }

    setInput("");
  }

  async function runSummarizer() {
    if (!sessionId) {
      return;
    }

    const response = await fetch(`/api/session/${sessionId}/summarize`, { method: "POST" });
    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Failed to run summarizer.");
    }
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl gap-4 p-4 lg:grid-cols-[380px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold">AllPath MVP</h1>
        <p className="mt-1 text-sm text-slate-600">Round Table only, 2+ agents, manual summarizer.</p>
        <a className="mt-1 inline-block text-sm font-medium text-primary" href="/agents">
          Open Agent Personality Studio
        </a>

        <form className="mt-4 space-y-4" onSubmit={createSession}>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold">Agent Initial Prompt (Session Rules)</p>
            <textarea
              className="h-28 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={agentInitialPrompt}
              onChange={(event) => setAgentInitialPrompt(event.target.value)}
              placeholder="Session-level rules for all agents"
            />
          </div>

          {participants.map((participant, index) => (
            <div key={participant.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold">Participant {index + 1}</p>

              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                onChange={(event) => applyProfileToParticipant(index, event.target.value)}
                value={participant.profileId}
              >
                <option value="">Apply profile (optional)</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>

              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={participant.label}
                onChange={(event) => updateParticipant(index, { label: event.target.value })}
                placeholder="Agent label"
              />

              <ModelPicker
                selected={participant.model}
                onSelect={(model) => updateParticipant(index, { model })}
                featuredModels={modelPickerCatalog.featuredModels}
                moreModels={modelPickerCatalog.moreModels}
              />

              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={participant.providerType}
                onChange={(event) => updateParticipant(index, { providerType: event.target.value as ProviderType })}
              >
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Custom Provider</option>
              </select>

              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                type="password"
                value={participant.apiKey}
                onChange={(event) => updateParticipant(index, { apiKey: event.target.value })}
                placeholder="API Key"
              />

              {participant.providerType === "custom" && (
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  value={participant.baseUrl}
                  onChange={(event) => updateParticipant(index, { baseUrl: event.target.value })}
                  placeholder="Base URL, e.g. https://api.openai.com/v1"
                />
              )}

              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={participant.roleTitle}
                onChange={(event) => updateParticipant(index, { roleTitle: event.target.value })}
                placeholder="Role title (e.g. Risk Reviewer)"
              />

              <textarea
                className="h-20 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={participant.character}
                onChange={(event) => updateParticipant(index, { character: event.target.value })}
                placeholder="Personality prompt"
              />
            </div>
          ))}

          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1 text-sm"
            onClick={() =>
              setParticipants((current) => [
                ...current,
                defaultParticipant(`p${current.length + 1}`, `Analyst ${String.fromCharCode(65 + current.length)}`)
              ])
            }
          >
            Add Participant
          </button>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={summarizerEnabled}
              onChange={(event) => setSummarizerEnabled(event.target.checked)}
            />
            Enable Summarizer
          </label>

          {summarizerEnabled && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold">Summarizer</p>

              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                onChange={(event) => applyProfileToSummarizer(event.target.value)}
                value={summarizer.profileId}
              >
                <option value="">Apply profile (optional)</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>

              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={summarizer.label}
                onChange={(event) => setSummarizer((current) => ({ ...current, label: event.target.value }))}
                placeholder="Label"
              />

              <ModelPicker
                selected={summarizer.model}
                onSelect={(model) => setSummarizer((current) => ({ ...current, model }))}
                featuredModels={modelPickerCatalog.featuredModels}
                moreModels={modelPickerCatalog.moreModels}
              />

              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={summarizer.providerType}
                onChange={(event) =>
                  setSummarizer((current) => ({
                    ...current,
                    providerType: event.target.value as ProviderType
                  }))
                }
              >
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Custom Provider</option>
              </select>

              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                type="password"
                value={summarizer.apiKey}
                onChange={(event) => setSummarizer((current) => ({ ...current, apiKey: event.target.value }))}
                placeholder="API Key"
              />

              {summarizer.providerType === "custom" && (
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  value={summarizer.baseUrl}
                  onChange={(event) => setSummarizer((current) => ({ ...current, baseUrl: event.target.value }))}
                  placeholder="Base URL"
                />
              )}

              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={summarizer.roleTitle}
                onChange={(event) => setSummarizer((current) => ({ ...current, roleTitle: event.target.value }))}
                placeholder="Role title"
              />

              <textarea
                className="h-20 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={summarizer.character}
                onChange={(event) => setSummarizer((current) => ({ ...current, character: event.target.value }))}
                placeholder="Personality prompt"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!canCreate}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Create Session
          </button>
        </form>
      </section>

      <section className="flex min-h-[80vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 p-3 text-sm text-slate-600">
          Session: <span className="font-mono text-xs">{sessionId ?? "not created"}</span> | Status: {status} |
          Round: {roundNumber}
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {groupedMessages.map((message) => (
            <article key={message.messageId} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {message.sourceLabel}
                  {message.sourceModel ? ` (${message.sourceModel})` : ""}
                  {message.sourceModel
                    ? ` ${dynamicPriceMap.get(message.sourceModel) ?? modelPriceTag(message.sourceModel)}`
                    : ""}
                </span>
                <span>{message.status}</span>
              </div>
              <p className="text-sm">{message.content ? renderMessageContent(message.content) : "..."}</p>
            </article>
          ))}
        </div>

        {error && <p className="border-t border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <div className="border-t border-slate-200 p-3">
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your message"
            />
            <button
              type="submit"
              disabled={!sessionId || !input.trim()}
              className="rounded-md bg-ink px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              Send
            </button>
            <button
              type="button"
              onClick={runSummarizer}
              disabled={!sessionId || !summarizerEnabled}
              className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              Summarize
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
