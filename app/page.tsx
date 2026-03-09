"use client";

import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CatalogModel,
  FEATURED_MODELS,
  MORE_MODELS,
  modelPriceTag
} from "@/lib/modelCatalog";
import { Message, MessageAttachment, Mode, ProviderType } from "@/lib/types";
import { AgentProfile, normalizeAgentLibrary } from "@/lib/agentProfiles";
import {
  CUSTOM_PROMPT_PRESET_ID,
  DEFAULT_SESSION_RULES,
  PromptPreset,
  USER_PREFERENCES_STORAGE_KEY,
  defaultUserPreferences,
  normalizeUserPreferences
} from "@/lib/userPreferences";

const PROFILE_STORAGE_KEY = "allpath-agent-profiles";
const STORY_STORAGE_KEY = "allpath-agent-stories";
const SESSION_LIST_STORAGE_KEY = "allpath-session-list";
const ACTIVE_SESSION_STORAGE_KEY = "allpath-active-session";

interface SessionMeta {
  id: string;
  title: string;
  createdAt: string;
}

type PendingAttachment = Omit<MessageAttachment, "attachmentId"> & { localId: string };

type ApiKeyMode = "default_profile" | "unified" | "by_agent";

type ParticipantForm = {
  id: string;
  label: string;
  avatarUrl: string;
  storyFilter: string;
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
    avatarUrl: "",
    storyFilter: "all",
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

function parseLocalJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isTextLikeFile(file: File): boolean {
  if (file.type.startsWith("text/")) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return [".txt", ".md", ".json", ".csv"].some((suffix) => lower.endsWith(suffix));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Failed to parse ${file.name}`));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function HomePage() {
  const [isSessionSidebarOpen, setIsSessionSidebarOpen] = useState(false);
  const [sessionMode, setSessionMode] = useState<Mode>("roundtable");
  const [apiKeyMode, setApiKeyMode] = useState<ApiKeyMode>("default_profile");
  const [defaultProfileApiKey, setDefaultProfileApiKey] = useState("");
  const [unifiedApiKey, setUnifiedApiKey] = useState("");
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>([]);
  const [selectedPromptPresetId, setSelectedPromptPresetId] = useState(CUSTOM_PROMPT_PRESET_ID);
  const [customInitialPrompt, setCustomInitialPrompt] = useState(DEFAULT_SESSION_RULES);
  const [participants, setParticipants] = useState<ParticipantForm[]>([
    defaultParticipant("p1", "Analyst A"),
    defaultParticipant("p2", "Analyst B")
  ]);
  const [summarizerEnabled, setSummarizerEnabled] = useState(true);
  const [summarizer, setSummarizer] = useState<ParticipantForm>(
    defaultParticipant("sum", "Summarizer")
  );
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [stories, setStories] = useState<string[]>([]);
  const [sessionList, setSessionList] = useState<SessionMeta[]>([]);
  const [dynamicCatalogModels, setDynamicCatalogModels] = useState<CatalogModel[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState("idle");
  const [roundNumber, setRoundNumber] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [targetParticipantIds, setTargetParticipantIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [error, setError] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const effectiveGlobalApiKey =
    apiKeyMode === "default_profile"
      ? defaultProfileApiKey
      : apiKeyMode === "unified"
        ? unifiedApiKey
        : "";

  useEffect(() => {
    const parsedProfiles = parseLocalJson<AgentProfile[]>(
      localStorage.getItem(PROFILE_STORAGE_KEY),
      []
    );
    const parsedStories = parseLocalJson<string[]>(
      localStorage.getItem(STORY_STORAGE_KEY),
      []
    );
    const normalizedLibrary = normalizeAgentLibrary(parsedProfiles, parsedStories);
    setProfiles(normalizedLibrary.profiles);
    setStories(normalizedLibrary.stories);

    const normalizedPrefs = normalizeUserPreferences(
      parseLocalJson(localStorage.getItem(USER_PREFERENCES_STORAGE_KEY), defaultUserPreferences())
    );
    setDefaultProfileApiKey(normalizedPrefs.globalApiKey);
    setUnifiedApiKey(normalizedPrefs.globalApiKey);
    setPromptPresets(normalizedPrefs.promptPresets);
    setSelectedPromptPresetId(normalizedPrefs.defaultPromptPresetId);
    const defaultPrompt =
      normalizedPrefs.promptPresets.find(
        (preset) => preset.id === normalizedPrefs.defaultPromptPresetId
      )?.prompt ?? DEFAULT_SESSION_RULES;
    setCustomInitialPrompt(defaultPrompt);

    const parsedSessions = parseLocalJson<SessionMeta[]>(
      localStorage.getItem(SESSION_LIST_STORAGE_KEY),
      []
    );
    if (Array.isArray(parsedSessions)) {
      setSessionList(parsedSessions);
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
        const query = effectiveGlobalApiKey.trim()
          ? `?providerType=openrouter&apiKey=${encodeURIComponent(effectiveGlobalApiKey.trim())}`
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
  }, [effectiveGlobalApiKey]);

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
    if (participant.providerType === "openrouter") {
      if (apiKeyMode === "by_agent" && !participant.apiKey.trim()) {
        return false;
      }
      if (apiKeyMode !== "by_agent" && !effectiveGlobalApiKey.trim()) {
        return false;
      }
    }

    return true;
  }) &&
    (!summarizerEnabled ||
      (!!summarizer.model &&
        (summarizer.providerType !== "custom" || (!!summarizer.baseUrl && !!summarizer.apiKey)) &&
        (summarizer.providerType !== "openrouter" ||
          (apiKeyMode === "by_agent"
            ? !!summarizer.apiKey.trim()
            : !!effectiveGlobalApiKey.trim()))));

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

  const mentionCandidates = useMemo(() => {
    if (sessionMode !== "one_to_one") {
      return [];
    }
    const query = mentionQuery.trim().toLowerCase();
    return participants.filter((participant) =>
      query ? participant.label.toLowerCase().includes(query) : true
    );
  }, [mentionQuery, participants, sessionMode]);

  const selectedPromptPreset = useMemo(
    () => promptPresets.find((preset) => preset.id === selectedPromptPresetId),
    [promptPresets, selectedPromptPresetId]
  );

  const resolvedAgentInitialPrompt =
    selectedPromptPresetId === CUSTOM_PROMPT_PRESET_ID
      ? customInitialPrompt
      : selectedPromptPreset?.prompt ?? customInitialPrompt;

  function filterProfilesByStory(storyFilter: string): AgentProfile[] {
    if (storyFilter === "all") {
      return profiles;
    }
    if (storyFilter === "__none__") {
      return profiles.filter((profile) => !profile.story.trim());
    }
    return profiles.filter((profile) => profile.story === storyFilter);
  }

  useEffect(() => {
    if (sessionMode !== "one_to_one") {
      setShowMentionMenu(false);
      setMentionQuery("");
      setTargetParticipantIds([]);
      return;
    }

    const match = input.match(/(?:^|\s)@([^\s@]*)$/);
    if (!match) {
      setShowMentionMenu(false);
      setMentionQuery("");
      return;
    }

    setMentionQuery(match[1] ?? "");
    setShowMentionMenu(true);
  }, [input, sessionMode]);

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
      storyFilter: profile.story ? profile.story : "__none__",
      avatarUrl: profile.avatarUrl || "",
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
      storyFilter: profile.story ? profile.story : "__none__",
      avatarUrl: profile.avatarUrl || "",
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
        mode?: Mode;
        existingMessages?: Message[];
      };

      setStatus(payload.status);
      setRoundNumber(payload.roundNumber);
      if (payload.mode) {
        setSessionMode(payload.mode);
      }

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
      if (!openedOnce) {
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        setSessionId(null);
        setMessages([]);
        setStatus("idle");
        setRoundNumber(0);
        setError("Session expired or not found. Please create a new session.");
        return;
      }

      setError("SSE reconnecting. If this persists, recreate session.");
    };

    eventSourceRef.current = source;
  }

  async function addPendingAttachments(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const maxAttachments = 6;
    const current = pendingAttachments.length;
    const remaining = Math.max(0, maxAttachments - current);
    const files = Array.from(fileList).slice(0, remaining);
    if (files.length === 0) {
      setError("Attachment limit reached (max 6 files).");
      return;
    }

    const parsed: PendingAttachment[] = [];
    for (const file of files) {
      const localId = crypto.randomUUID();
      if (file.type.startsWith("image/")) {
        const dataUrl = await readFileAsDataUrl(file);
        parsed.push({
          localId,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          kind: "image",
          dataUrl
        });
        continue;
      }

      if (isTextLikeFile(file)) {
        const textContent = await file.text();
        parsed.push({
          localId,
          name: file.name,
          mimeType: file.type || "text/plain",
          kind: "text",
          textContent: textContent.slice(0, 12000)
        });
        continue;
      }

      setError(`Unsupported file type: ${file.name}`);
    }

    if (parsed.length > 0) {
      setPendingAttachments((currentAttachments) => [...currentAttachments, ...parsed]);
    }
  }

  function removePendingAttachment(localId: string) {
    setPendingAttachments((currentAttachments) =>
      currentAttachments.filter((attachment) => attachment.localId !== localId)
    );
  }

  function selectMentionTarget(participantId: string, label: string) {
    setInput((current) => current.replace(/(?:^|\s)@([^\s@]*)$/, ` @${label} `).trimStart());
    setTargetParticipantIds((current) =>
      current.includes(participantId) ? current : [...current, participantId]
    );
    setShowMentionMenu(false);
    setMentionQuery("");
  }

  async function changeSessionMode(nextMode: Mode) {
    setSessionMode(nextMode);
    if (nextMode !== "one_to_one") {
      setTargetParticipantIds([]);
    }
    if (!sessionId) {
      return;
    }

    const response = await fetch(`/api/session/${sessionId}/mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: nextMode })
    });

    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Failed to switch mode.");
    }
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

  function deleteSavedSession(targetSessionId: string) {
    setSessionList((current) => current.filter((item) => item.id !== targetSessionId));
    if (targetSessionId !== sessionId) {
      return;
    }

    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setSessionId(null);
    setMessages([]);
    setStatus("idle");
    setRoundNumber(0);
    setError("");
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  }

  async function createSession(event: FormEvent) {
    event.preventDefault();
    setError("");

    const payload = {
      mode: sessionMode,
      globalApiKey: effectiveGlobalApiKey.trim() || undefined,
      agentInitialPrompt: resolvedAgentInitialPrompt,
      participants: participants.map((item) => ({
        id: item.id,
        label: item.label,
        avatarUrl: item.avatarUrl || undefined,
        model: item.model,
        roleTitle: item.roleTitle || undefined,
        character: item.character || undefined,
        provider: {
          type: item.providerType,
          apiKey:
            item.providerType === "openrouter" && apiKeyMode === "by_agent"
              ? item.apiKey
              : item.providerType === "custom"
                ? item.apiKey
                : "",
          baseUrl: item.baseUrl || undefined
        }
      })),
      summarizer: summarizerEnabled
        ? {
            id: summarizer.id,
            label: summarizer.label,
            avatarUrl: summarizer.avatarUrl || undefined,
            model: summarizer.model,
            roleTitle: summarizer.roleTitle || "Summarizer",
            character:
              summarizer.character ||
              "Summarize with decision, rationale, risks, and next actions.",
            provider: {
              type: summarizer.providerType,
              apiKey:
                summarizer.providerType === "openrouter" && apiKeyMode === "by_agent"
                  ? summarizer.apiKey
                  : summarizer.providerType === "custom"
                    ? summarizer.apiKey
                    : "",
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

    const json = (await response.json()) as {
      sessionId: string;
      status: string;
      roundNumber: number;
      mode?: Mode;
    };
    const sessionTitle = `Session ${new Date().toLocaleString()} · ${participants
      .map((participant) => participant.label)
      .join(", ")}`;

    setSessionId(json.sessionId);
    setStatus(json.status);
    setRoundNumber(json.roundNumber);
    if (json.mode) {
      setSessionMode(json.mode);
    }
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
    if (!sessionId || (!input.trim() && pendingAttachments.length === 0)) {
      return;
    }

    const requestPayload = JSON.stringify({
      content: input,
      mode: sessionMode,
      attachments: pendingAttachments.map((attachment) => ({
        name: attachment.name,
        mimeType: attachment.mimeType,
        kind: attachment.kind,
        dataUrl: attachment.dataUrl,
        textContent: attachment.textContent
      })),
      targetParticipantIds:
        sessionMode === "one_to_one" && targetParticipantIds.length > 0
          ? targetParticipantIds
          : undefined
    });
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
    setPendingAttachments([]);
    setShowMentionMenu(false);
    setMentionQuery("");
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
      <div className="mb-2 flex items-center justify-between">
        <button
          className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700"
          type="button"
          onClick={() => setIsSessionSidebarOpen((value) => !value)}
        >
          {isSessionSidebarOpen ? "Hide Sessions" : "Show Sessions"}
        </button>
      </div>

      <div
        className={`grid h-[calc(100%-2.5rem)] gap-4 ${
          isSessionSidebarOpen ? "lg:grid-cols-[280px_380px_1fr]" : "lg:grid-cols-[380px_1fr]"
        }`}
      >
      {isSessionSidebarOpen && (
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
            <div
              key={item.id}
              className={`rounded-lg border px-2 py-2 text-xs ${
                item.id === sessionId
                  ? "border-primary bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  className="flex-1 text-left"
                  onClick={() => openSavedSession(item.id)}
                  type="button"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 font-mono text-[10px]">{item.id}</p>
                </button>
                <button
                  className="rounded-md border border-slate-300 px-2 py-1 text-[10px] text-slate-600"
                  onClick={() => deleteSavedSession(item.id)}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      <section className="h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold">AllPath MVP</h1>
        <p className="mt-1 text-sm text-slate-600">Round Table only, 2+ agents, manual summarizer.</p>
        <div className="mt-1 flex gap-3">
          <Link className="inline-block text-sm font-medium text-primary" href="/agents">
            Open Agent Personality Studio
          </Link>
          <Link className="inline-block text-sm font-medium text-primary" href="/profile">
            Open User Profile
          </Link>
        </div>

        <form className="mt-4 space-y-4" onSubmit={createSession}>
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold">Agent Initial Prompt (Session Rules)</p>
            <select
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              value={selectedPromptPresetId}
              onChange={(event) => setSelectedPromptPresetId(event.target.value)}
            >
              {promptPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
              <option value={CUSTOM_PROMPT_PRESET_ID}>Custom</option>
            </select>
            {selectedPromptPresetId === CUSTOM_PROMPT_PRESET_ID ? (
              <textarea
                className="h-28 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={customInitialPrompt}
                onChange={(event) => setCustomInitialPrompt(event.target.value)}
                placeholder="Session-level rules for all agents"
              />
            ) : (
              <textarea
                className="h-28 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-600"
                value={selectedPromptPreset?.prompt ?? ""}
                readOnly
              />
            )}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">OpenRouter API Key Mode</p>
              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={apiKeyMode}
                onChange={(event) => setApiKeyMode(event.target.value as ApiKeyMode)}
              >
                <option value="default_profile">Use Default OpenRouter API Key (from User Profile)</option>
                <option value="unified">Use Unified API Key (set once here)</option>
                <option value="by_agent">Customized by Agent (each agent enters key)</option>
              </select>
              {apiKeyMode === "default_profile" && (
                <input
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-600"
                  type="password"
                  value={defaultProfileApiKey}
                  readOnly
                  placeholder="No default key in User Profile"
                />
              )}
              {apiKeyMode === "unified" && (
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  type="password"
                  value={unifiedApiKey}
                  onChange={(event) => setUnifiedApiKey(event.target.value)}
                  placeholder="Used by all OpenRouter agents"
                />
              )}
              {apiKeyMode === "by_agent" && (
                <p className="text-xs text-slate-500">
                  OpenRouter agents must provide API key in their own card.
                </p>
              )}
            </div>
          </div>

          {participants.map((participant, index) => {
            const selectedProfile =
              profiles.find((profile) => profile.id === participant.profileId) ?? null;
            const infoStory = selectedProfile?.story || "No story";
            const infoRole = participant.roleTitle || selectedProfile?.roleTitle || "No role title";
            const infoCharacter =
              participant.character || selectedProfile?.character || "No personality prompt";

            return (
            <div key={participant.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold">Participant {index + 1}</p>

              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={participant.storyFilter}
                onChange={(event) =>
                  updateParticipant(index, {
                    storyFilter: event.target.value,
                    profileId: ""
                  })
                }
              >
                <option value="all">All stories</option>
                <option value="__none__">No story</option>
                {stories.map((storyName) => (
                  <option key={storyName} value={storyName}>
                    {storyName}
                  </option>
                ))}
              </select>

              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                onChange={(event) => applyProfileToParticipant(index, event.target.value)}
                value={participant.profileId}
              >
                <option value="">Apply profile (optional)</option>
                {filterProfilesByStory(participant.storyFilter).map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                    {profile.story ? ` · ${profile.story}` : ""}
                  </option>
                ))}
              </select>

              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={participant.label}
                onChange={(event) => updateParticipant(index, { label: event.target.value })}
                placeholder="Agent label"
              />
              {(participant.avatarUrl || participant.profileId) && (
                <div className="flex items-stretch gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="flex w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
                    {participant.avatarUrl ? (
                      <img
                        src={participant.avatarUrl}
                        alt={`${participant.label} avatar`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">
                        {avatarLabel(participant.label)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 text-xs text-slate-700">
                    <p><span className="font-semibold text-slate-500">Group:</span> {infoStory}</p>
                    <p><span className="font-semibold text-slate-500">Profile:</span> {participant.label}</p>
                    <p><span className="font-semibold text-slate-500">Role:</span> {infoRole}</p>
                    <p className="line-clamp-2">
                      <span className="font-semibold text-slate-500">Personality:</span> {infoCharacter}
                    </p>
                  </div>
                </div>
              )}

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

              {(participant.providerType === "custom" ||
                (participant.providerType === "openrouter" && apiKeyMode === "by_agent")) && (
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  type="password"
                  value={participant.apiKey}
                  onChange={(event) => updateParticipant(index, { apiKey: event.target.value })}
                  placeholder={
                    participant.providerType === "openrouter"
                      ? "OpenRouter API Key for this agent"
                      : "API Key"
                  }
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
          )})}

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
              {(() => {
                const selectedProfile =
                  profiles.find((profile) => profile.id === summarizer.profileId) ?? null;
                const infoStory = selectedProfile?.story || "No story";
                const infoRole = summarizer.roleTitle || selectedProfile?.roleTitle || "No role title";
                const infoCharacter =
                  summarizer.character || selectedProfile?.character || "No personality prompt";
                return (
                  <>

              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={summarizer.storyFilter}
                onChange={(event) =>
                  setSummarizer((current) => ({
                    ...current,
                    storyFilter: event.target.value,
                    profileId: ""
                  }))
                }
              >
                <option value="all">All stories</option>
                <option value="__none__">No story</option>
                {stories.map((storyName) => (
                  <option key={storyName} value={storyName}>
                    {storyName}
                  </option>
                ))}
              </select>

              <select
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                onChange={(event) => applyProfileToSummarizer(event.target.value)}
                value={summarizer.profileId}
              >
                <option value="">Apply profile (optional)</option>
                {filterProfilesByStory(summarizer.storyFilter).map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                    {profile.story ? ` · ${profile.story}` : ""}
                  </option>
                ))}
              </select>

              <input
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                value={summarizer.label}
                onChange={(event) => setSummarizer((current) => ({ ...current, label: event.target.value }))}
                placeholder="Label"
              />
              {(summarizer.avatarUrl || summarizer.profileId) && (
                <div className="flex items-stretch gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="flex w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
                    {summarizer.avatarUrl ? (
                      <img
                        src={summarizer.avatarUrl}
                        alt={`${summarizer.label} avatar`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">
                        {avatarLabel(summarizer.label)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 text-xs text-slate-700">
                    <p><span className="font-semibold text-slate-500">Group:</span> {infoStory}</p>
                    <p><span className="font-semibold text-slate-500">Profile:</span> {summarizer.label}</p>
                    <p><span className="font-semibold text-slate-500">Role:</span> {infoRole}</p>
                    <p className="line-clamp-2">
                      <span className="font-semibold text-slate-500">Personality:</span> {infoCharacter}
                    </p>
                  </div>
                </div>
              )}

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

              {(summarizer.providerType === "custom" ||
                (summarizer.providerType === "openrouter" && apiKeyMode === "by_agent")) && (
                <input
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  type="password"
                  value={summarizer.apiKey}
                  onChange={(event) =>
                    setSummarizer((current) => ({ ...current, apiKey: event.target.value }))
                  }
                  placeholder={
                    summarizer.providerType === "openrouter"
                      ? "OpenRouter API Key for summarizer"
                      : "API Key"
                  }
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
                  </>
                );
              })()}
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
        <header className="border-b border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Session: <span className="font-mono text-xs">{sessionId ?? "not created"}</span> | Status: {status} |
              Round: {roundNumber}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Mode</label>
              <select
                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                value={sessionMode}
                onChange={(event) => void changeSessionMode(event.target.value as Mode)}
              >
                <option value="roundtable">Round Table</option>
                <option value="one_to_one">One to One</option>
              </select>
            </div>
          </div>
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
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {message.sourceRole !== "user" && message.sourceAvatarUrl ? (
                    <img
                      src={message.sourceAvatarUrl}
                      alt={`${message.sourceLabel} avatar`}
                      className="h-full w-full rounded-full object-contain"
                    />
                  ) : (
                    avatarLabel(message.sourceRole === "user" ? "You" : message.sourceLabel)
                  )}
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
                    {message.sourceRole === "user" &&
                      message.attachments &&
                      message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.attachmentId} className="text-xs opacity-90">
                              {attachment.kind === "image" ? "Image" : "File"}: {attachment.name}
                            </div>
                          ))}
                        </div>
                      )}
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
          {sessionMode === "one_to_one" && (
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="text-slate-500">Targets:</span>
              {targetParticipantIds.length === 0 ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">All agents</span>
              ) : (
                targetParticipantIds.map((targetId) => {
                  const target = participants.find((participant) => participant.id === targetId);
                  if (!target) {
                    return null;
                  }
                  return (
                    <button
                      key={targetId}
                      className="rounded-full border border-slate-300 px-2 py-1 text-slate-700"
                      type="button"
                      onClick={() =>
                        setTargetParticipantIds((current) => current.filter((id) => id !== targetId))
                      }
                    >
                      @{target.label} x
                    </button>
                  );
                })
              )}
              {targetParticipantIds.length > 0 && (
                <button
                  className="rounded-md border border-slate-300 px-2 py-1 text-slate-600"
                  type="button"
                  onClick={() => setTargetParticipantIds([])}
                >
                  Reply all
                </button>
              )}
            </div>
          )}
          {pendingAttachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingAttachments.map((attachment) => (
                <button
                  key={attachment.localId}
                  type="button"
                  className="rounded-full border border-slate-300 px-2 py-1 text-xs text-slate-700"
                  onClick={() => removePendingAttachment(attachment.localId)}
                >
                  {attachment.kind === "image" ? "image" : "file"}: {attachment.name} x
                </button>
              ))}
            </div>
          )}
          <form className="flex gap-2" onSubmit={sendMessage}>
            <div className="relative flex-1">
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  sessionMode === "one_to_one"
                    ? "Type message, use @ to mention a specific agent"
                    : "Type your message"
                }
              />
              {sessionMode === "one_to_one" && showMentionMenu && mentionCandidates.length > 0 && (
                <div className="absolute bottom-11 left-0 z-10 w-64 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                  {mentionCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      className="block w-full rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                      type="button"
                      onClick={() => selectMentionTarget(candidate.id, candidate.label)}
                    >
                      @{candidate.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700">
              Attach
              <input
                className="hidden"
                type="file"
                multiple
                accept="image/*,.txt,.md,.json,.csv"
                onChange={(event) => {
                  void addPendingAttachments(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            <button
              type="submit"
              disabled={!sessionId || (!input.trim() && pendingAttachments.length === 0)}
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
