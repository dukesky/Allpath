"use client";

import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CatalogModel,
  FEATURED_MODELS,
  MORE_MODELS,
  modelPriceTag
} from "@/lib/modelCatalog";
import { Message, ProviderType } from "@/lib/types";

const PROFILE_STORAGE_KEY = "allpath-agent-profiles";
const SESSION_LIST_STORAGE_KEY = "allpath-session-list";
const ACTIVE_SESSION_STORAGE_KEY = "allpath-active-session";

interface AgentProfile {
  id: string;
  name: string;
  roleTitle: string;
  character: string;
}

interface SessionMeta {
  id: string;
  title: string;
  createdAt: string;
}

type ParticipantForm = {
  id: string;
  label: string;
  model: string;
  providerType: ProviderType;
  useSpecificApiKey: boolean;
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
    useSpecificApiKey: false,
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

function avatarLabel(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) {
    return "?";
  }
  return cleaned.slice(0, 1).toUpperCase();
}

export default function HomePage() {
  const [globalApiKey, setGlobalApiKey] = useState("");
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
  const [sessionList, setSessionList] = useState<SessionMeta[]>([]);
  const [dynamicCatalogModels, setDynamicCatalogModels] = useState<CatalogModel[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState("idle");
  const [roundNumber, setRoundNumber] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

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

    const rawSessions = localStorage.getItem(SESSION_LIST_STORAGE_KEY);
    if (rawSessions) {
      try {
        const parsed = JSON.parse(rawSessions) as SessionMeta[];
        if (Array.isArray(parsed)) {
          setSessionList(parsed);
        }
      } catch {
        // ignore invalid local data
      }
    }

    const activeSession = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (activeSession) {
      setSessionId(activeSession);
      setMessages([]);
      connectStream(activeSession);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadModels() {
      try {
        const query = globalApiKey.trim()
          ? `?providerType=openrouter&apiKey=${encodeURIComponent(globalApiKey.trim())}`
          : "?providerType=openrouter";
        const response = await fetch(`/api/models${query}`);
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
  }, [globalApiKey]);

  useEffect(() => {
    localStorage.setItem(SESSION_LIST_STORAGE_KEY, JSON.stringify(sessionList));
  }, [sessionList]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
  }, [sessionId]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages.length, status]);

  const canCreate = participants.every((participant) => {
    if (!participant.model) {
      return false;
    }

    if (participant.providerType === "custom" && (!participant.baseUrl || !participant.apiKey)) {
      return false;
    }

    if (
      participant.providerType === "openrouter" &&
      participant.useSpecificApiKey &&
      !participant.apiKey
    ) {
      return false;
    }

    if (
      participant.providerType === "openrouter" &&
      !participant.useSpecificApiKey &&
      !globalApiKey.trim()
    ) {
      return false;
    }

    return true;
  }) &&
    (!summarizerEnabled ||
      (!!summarizer.model &&
        (summarizer.providerType !== "custom" || (!!summarizer.baseUrl && !!summarizer.apiKey)) &&
        (summarizer.providerType !== "openrouter" ||
          (summarizer.useSpecificApiKey ? !!summarizer.apiKey : !!globalApiKey.trim()))));

  const groupedMessages = useMemo(() => {
    return [...messages]
      .filter((message) => {
        if (message.status === "streaming") {
          return true;
        }
        return message.content.trim().length > 0;
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messages]);

  const typingAgents = useMemo(() => {
    const labels = groupedMessages
      .filter(
        (message) =>
          (message.sourceRole === "assistant" || message.sourceRole === "summarizer") &&
          message.status === "streaming"
      )
      .map((message) => message.sourceLabel);

    return Array.from(new Set(labels));
  }, [groupedMessages]);

  const modelPickerCatalog = useMemo(() => {
    const featuredModels = FEATURED_MODELS;
    if (!dynamicCatalogModels || dynamicCatalogModels.length === 0) {
      return { featuredModels, moreModels: MORE_MODELS };
    }

    const featuredIds = new Set(featuredModels.map((model) => model.id));
    const moreModels = dynamicCatalogModels.filter((model) => !featuredIds.has(model.id));
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

    source.addEventListener("message_removed", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as { messageId: string };
      setMessages((current) => current.filter((item) => item.messageId !== payload.messageId));
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

  function openSavedSession(targetSessionId: string) {
    if (!targetSessionId) {
      return;
    }

    setError("");
    setSessionId(targetSessionId);
    setMessages([]);
    connectStream(targetSessionId);
  }

  async function createSession(event: FormEvent) {
    event.preventDefault();
    setError("");

    const payload = {
      globalApiKey: globalApiKey.trim() || undefined,
      agentInitialPrompt,
      participants: participants.map((item) => ({
        id: item.id,
        label: item.label,
        model: item.model,
        roleTitle: item.roleTitle || undefined,
        character: item.character || undefined,
        provider: {
          type: item.providerType,
          apiKey: item.useSpecificApiKey ? item.apiKey : "",
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
              apiKey: summarizer.useSpecificApiKey ? summarizer.apiKey : "",
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
    const sessionTitle = `Session ${new Date().toLocaleString()} · ${participants
      .map((participant) => participant.label)
      .join(", ")}`;

    setSessionId(json.sessionId);
    setStatus(json.status);
    setRoundNumber(json.roundNumber);
    setMessages([]);
    setSessionList((current) => [
      {
        id: json.sessionId,
        title: sessionTitle,
        createdAt: new Date().toISOString()
      },
      ...current.filter((item) => item.id !== json.sessionId)
    ]);
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
    <main className="mx-auto h-screen w-full max-w-[1600px] p-4">
      <div className="grid h-full gap-4 lg:grid-cols-[280px_380px_1fr]">
      <section className="h-full min-h-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Sessions</h2>
        <p className="mt-1 text-xs text-slate-500">Open a previous session and continue chatting.</p>
        <div className="mt-3 space-y-2 overflow-y-auto">
          {sessionList.length === 0 && (
            <div className="rounded-lg border border-slate-200 p-2 text-xs text-slate-500">
              No saved sessions yet.
            </div>
          )}

          {sessionList.map((item) => (
            <button
              key={item.id}
              className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                item.id === sessionId
                  ? "border-primary bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600"
              }`}
              onClick={() => openSavedSession(item.id)}
              type="button"
            >
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 font-mono text-[10px]">{item.id}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold">AllPath MVP</h1>
        <p className="mt-1 text-sm text-slate-600">Round Table only, 2+ agents, manual summarizer.</p>
        <Link className="mt-1 inline-block text-sm font-medium text-primary" href="/agents">
          Open Agent Personality Studio
        </Link>

        <form className="mt-4 space-y-4" onSubmit={createSession}>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold">Agent Initial Prompt (Session Rules)</p>
            <textarea
              className="h-28 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={agentInitialPrompt}
              onChange={(event) => setAgentInitialPrompt(event.target.value)}
              placeholder="Session-level rules for all agents"
            />
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">Unified OpenRouter API Key</p>
              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                type="password"
                value={globalApiKey}
                onChange={(event) => setGlobalApiKey(event.target.value)}
                placeholder="Used by all OpenRouter agents unless overridden"
              />
            </div>
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

              {participant.providerType === "openrouter" && (
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={participant.useSpecificApiKey}
                    onChange={(event) =>
                      updateParticipant(index, { useSpecificApiKey: event.target.checked })
                    }
                  />
                  Use a specific API key for this agent
                </label>
              )}

              {(participant.providerType === "custom" || participant.useSpecificApiKey) && (
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  type="password"
                  value={participant.apiKey}
                  onChange={(event) => updateParticipant(index, { apiKey: event.target.value })}
                  placeholder="API Key"
                />
              )}

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

              {summarizer.providerType === "openrouter" && (
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={summarizer.useSpecificApiKey}
                    onChange={(event) =>
                      setSummarizer((current) => ({
                        ...current,
                        useSpecificApiKey: event.target.checked
                      }))
                    }
                  />
                  Use a specific API key for summarizer
                </label>
              )}

              {(summarizer.providerType === "custom" || summarizer.useSpecificApiKey) && (
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  type="password"
                  value={summarizer.apiKey}
                  onChange={(event) =>
                    setSummarizer((current) => ({ ...current, apiKey: event.target.value }))
                  }
                  placeholder="API Key"
                />
              )}

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

      <section className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 p-3 text-sm text-slate-600">
          Session: <span className="font-mono text-xs">{sessionId ?? "not created"}</span> | Status: {status} |
          Round: {roundNumber}
        </header>

        <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {groupedMessages.map((message) => (
            <article
              key={message.messageId}
              className={`flex ${
                message.sourceRole === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] items-start gap-2 ${
                  message.sourceRole === "user" ? "flex flex-row-reverse" : "flex"
                }`}
              >
                <div
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    message.sourceRole === "user"
                      ? "bg-primary text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {avatarLabel(message.sourceRole === "user" ? "You" : message.sourceLabel)}
                </div>

                <div>
                  <p
                    className={`mb-1 text-xs ${
                      message.sourceRole === "user" ? "text-right text-slate-500" : "text-slate-500"
                    }`}
                  >
                    {message.sourceRole === "user" ? "You" : message.sourceLabel}
                    {message.sourceModel ? ` (${message.sourceModel})` : ""}
                    {message.sourceModel
                      ? ` ${dynamicPriceMap.get(message.sourceModel) ?? modelPriceTag(message.sourceModel)}`
                      : ""}
                  </p>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      message.sourceRole === "user"
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    {message.content ? renderMessageContent(message.content) : "..."}
                  </div>
                </div>
              </div>
            </article>
          ))}

          {status === "running" && typingAgents.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
              <span>
                {typingAgents.join(", ")} {typingAgents.length > 1 ? "are" : "is"} typing...
              </span>
            </div>
          )}

          {status === "running" && typingAgents.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
              <span>Agents are thinking...</span>
            </div>
          )}
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
      </div>
    </main>
  );
}
