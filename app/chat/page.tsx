"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CatalogModel,
  FEATURED_MODELS,
  MORE_MODELS,
} from "@/lib/modelCatalog";
import { Message, Mode, ProviderType } from "@/lib/types";
import { AgentProfile, normalizeAgentLibrary } from "@/lib/agentProfiles";
import {
  CUSTOM_PROMPT_PRESET_ID,
  DEFAULT_SESSION_RULES,
  PromptPreset,
  USER_PREFERENCES_STORAGE_KEY,
  defaultUserPreferences,
  normalizeUserPreferences
} from "@/lib/userPreferences";
import { getDefaultAvatarUrl } from "@/lib/avatar";

import {
  ApiKeyMode,
  ParticipantForm,
  PendingAttachment,
  SessionMemberMeta,
  SessionMeta,
  TrialStatusResponse,
} from "./components/types";
import {
  buildParticipantFromProfile,
  defaultParticipant,
  fetchTrialStatus,
  GENERIC_STARTER_PROMPTS,
  isTextLikeFile,
  parseLocalJson,
  participantToSessionMember,
  readFileAsDataUrl,
  storyExperience,
} from "./components/utils";
import { AuthControls } from "./components/AuthControls";
import { useAuth, buildAuthHeaders } from "./components/useAuth";
import { SessionSidebar } from "./components/SessionSidebar";
import { SetupPanel } from "./components/SetupPanel";
import { ChatHeader } from "./components/ChatHeader";
import { MessageFeed } from "./components/MessageFeed";
import { ChatInput } from "./components/ChatInput";
import { MobileNav } from "./components/MobileNav";

const PROFILE_STORAGE_KEY = "allpath-agent-profiles";
const STORY_STORAGE_KEY = "allpath-agent-stories";
const SESSION_LIST_STORAGE_KEY = "allpath-session-list";
const ACTIVE_SESSION_STORAGE_KEY = "allpath-active-session";
const SHARE_LINKS_STORAGE_KEY = "allpath-share-links";

export default function HomePage() {
  const auth = useAuth();
  const [isSessionSidebarOpen, setIsSessionSidebarOpen] = useState(false);
  const [isSetupPanelOpen, setIsSetupPanelOpen] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileActivePanel, setMobileActivePanel] = useState<"chat" | "sessions" | "setup">("setup");
  const [isChatMembersOpen, setIsChatMembersOpen] = useState(false);
  const [setupSections, setSetupSections] = useState({
    quickStart: true,
    sessionRules: true,
    participants: false,
    summarizer: false
  });
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [selectedStory, setSelectedStory] = useState<string>("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
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
  const [expandedSessionMembers, setExpandedSessionMembers] = useState<Record<string, boolean>>({});
  const [activeSessionMembers, setActiveSessionMembers] = useState<SessionMemberMeta[]>([]);
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
  const [lightboxImage, setLightboxImage] = useState<{ src: string; name: string } | null>(null);
  const [trialStatus, setTrialStatus] = useState<TrialStatusResponse | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [isRedeemingInvite, setIsRedeemingInvite] = useState(false);
  const [quickStartModel, setQuickStartModel] = useState("openai/gpt-5-mini");
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const hasPendingActiveSessionRestoreRef = useRef(false);
  const effectiveGlobalApiKey =
    apiKeyMode === "default_profile"
      ? defaultProfileApiKey
      : apiKeyMode === "unified"
        ? unifiedApiKey
        : "";
  const hasServerOpenRouterAccess =
    !!trialStatus?.hasPersonalOpenRouterKey ||
    (trialStatus?.available === true &&
      trialStatus.requiresInviteCode === false &&
      trialStatus.trialStatus === "active" &&
      Number(trialStatus.remainingBudgetUsd ?? 0) > 0);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const syncViewport = () => {
      const mobile = media.matches;
      setIsMobileView(mobile);
      if (!mobile) {
        setIsSetupPanelOpen(true);
      } else if (!sessionId) {
        setMobileActivePanel("setup");
      }
    };
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, [sessionId]);

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
      setSessionList(
        parsedSessions.map((session) => ({
          id: typeof session.id === "string" ? session.id : crypto.randomUUID(),
          title: typeof session.title === "string" ? session.title : "Saved session",
          createdAt:
            typeof session.createdAt === "string" ? session.createdAt : new Date().toISOString(),
          persistentId: typeof session.persistentId === "string" ? session.persistentId : undefined,
          updatedAt: typeof session.updatedAt === "string" ? session.updatedAt : undefined,
          source: session.source === "cloud" ? ("cloud" as const) : ("local" as const),
          members: Array.isArray(session.members)
            ? session.members.map((member, index) => ({
                id:
                  typeof member?.id === "string" && member.id.trim()
                    ? member.id
                    : `member-${index}`,
                label:
                  typeof member?.label === "string" && member.label.trim()
                    ? member.label
                    : `Agent ${index + 1}`,
                avatarUrl: typeof member?.avatarUrl === "string" ? member.avatarUrl : "",
                model: typeof member?.model === "string" ? member.model : "",
                muted: member?.muted === true
              }))
            : []
        }))
      );
    }

    const fromShareId = sessionStorage.getItem("allpath-from-share-id");
    if (fromShareId) {
      sessionStorage.removeItem("allpath-from-share-id");
      void (async () => {
        try {
          const res = await fetch(`/api/share/${fromShareId}`);
          if (!res.ok) return;
          const record = (await res.json()) as {
            mode: string;
            agentConfig: Array<{
              id: string;
              label: string;
              avatarUrl?: string;
              model: string;
              roleTitle?: string;
              character?: string;
            }>;
            transcript: Message[];
          };
          const preloadedParticipants: ParticipantForm[] = record.agentConfig.map(
            (agent, index) => ({
              ...defaultParticipant(`share-${agent.id}-${index}`, agent.label),
              avatarUrl: agent.avatarUrl ?? "",
              roleTitle: agent.roleTitle ?? "",
              character: agent.character ?? "",
              model: quickStartModel || "openai/gpt-5-mini"
            })
          );
          setParticipants(preloadedParticipants);
          await createSessionFromParticipants({
            sessionParticipants: preloadedParticipants,
            sessionModeOverride: record.mode === "one_to_one" ? "one_to_one" : "roundtable",
            agentInitialPromptOverride: DEFAULT_SESSION_RULES,
            globalApiKeyOverride: quickStartApiKey || undefined,
            summarizerOverride: undefined,
            sessionTitle: `Continued · ${new Date().toLocaleString()}`,
            initialMessages: record.transcript
          });
        } catch {
          // Failed to restore from share — continue normally
        }
      })();
      return;
    }

    hasPendingActiveSessionRestoreRef.current = true;

    void fetchTrialStatus().then((value) => {
      if (value) {
        setTrialStatus(value);
      }
    });
  }, []);

  // Restore the last active session once auth state has settled, so a
  // signed-in user can fall back to a cloud resume when the in-memory
  // session no longer exists (e.g. after a server restart).
  useEffect(() => {
    if (auth.isLoading || !hasPendingActiveSessionRestoreRef.current) {
      return;
    }
    hasPendingActiveSessionRestoreRef.current = false;

    const activeSession = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!activeSession) {
      return;
    }

    const meta = sessionList.find((item) => item.id === activeSession);
    setSessionId(activeSession);
    setMessages([]);
    setMobileActivePanel("chat");
    connectStream(activeSession, meta?.persistentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isLoading, sessionList]);

  // Load the signed-in user's persisted sessions and merge them into the
  // sidebar list; drop cloud entries again after sign-out.
  useEffect(() => {
    if (!auth.user) {
      if (!auth.isLoading) {
        setSessionList((current) => current.filter((item) => item.source !== "cloud"));
      }
      return;
    }

    let active = true;
    // Signed in: refresh trial status with the token so the guest trial gets
    // linked to the account (or the cookie recovered on a new device).
    void refreshTrialStatus();
    void (async () => {
      const headers = await buildAuthHeaders(auth.getIdToken);
      if (!headers.Authorization) {
        return;
      }
      try {
        const response = await fetch("/api/sessions", { headers });
        if (!response.ok || !active) {
          return;
        }
        const json = (await response.json()) as {
          sessions?: Array<{
            persistentId: string;
            liveSessionId: string;
            title: string;
            updatedAt: string;
            participants?: Array<{
              id: string;
              label: string;
              avatarUrl?: string;
              model?: string;
              muted?: boolean;
              roleTitle?: string;
              character?: string;
            }>;
          }>;
        };
        const cloudMetas: SessionMeta[] = (json.sessions ?? []).map((session) => ({
          id: session.liveSessionId,
          title: session.title || "Saved session",
          createdAt: session.updatedAt,
          updatedAt: session.updatedAt,
          persistentId: session.persistentId,
          source: "cloud" as const,
          members: (session.participants ?? []).map((participant) => ({
            id: participant.id,
            label: participant.label,
            avatarUrl: participant.avatarUrl ?? "",
            model: participant.model ?? "",
            muted: participant.muted === true,
            roleTitle: participant.roleTitle,
            character: participant.character
          }))
        }));
        if (!active) {
          return;
        }
        setSessionList((current) => {
          const cloudPids = new Set(cloudMetas.map((item) => item.persistentId));
          const cloudLiveIds = new Set(cloudMetas.map((item) => item.id));
          const rest = current.filter(
            (item) =>
              !(item.persistentId && cloudPids.has(item.persistentId)) && !cloudLiveIds.has(item.id)
          );
          return [...cloudMetas, ...rest];
        });
      } catch {
        // Cloud session list is best-effort; local list still works.
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, auth.isLoading]);

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
      if (apiKeyMode !== "by_agent" && !effectiveGlobalApiKey.trim() && !hasServerOpenRouterAccess) {
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
            : !!effectiveGlobalApiKey.trim() || hasServerOpenRouterAccess))));

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

  const quickStartStories = useMemo(
    () =>
      stories
        .map((story) => ({
          story,
          members: profiles.filter((profile) => profile.story === story)
        }))
        .filter((entry) => entry.members.length >= 2),
    [profiles, stories]
  );

  const quickStartApiKey = useMemo(() => {
    if (defaultProfileApiKey.trim()) {
      return defaultProfileApiKey.trim();
    }
    if (unifiedApiKey.trim()) {
      return unifiedApiKey.trim();
    }
    return "";
  }, [defaultProfileApiKey, unifiedApiKey]);

  const activeStory = useMemo(() => {
    if (activeSessionMembers.length === 0) {
      return "";
    }

    const memberLabels = new Set(
      activeSessionMembers
        .filter((member) => !member.muted)
        .map((member) => member.label.trim().toLowerCase())
    );

    const matchingStory = stories.find((story) => {
      const storyMembers = profiles.filter((profile) => profile.story === story);
      if (storyMembers.length === 0) {
        return false;
      }

      const overlap = storyMembers.filter((profile) =>
        memberLabels.has(profile.name.trim().toLowerCase())
      ).length;

      return overlap >= Math.min(2, storyMembers.length);
    });

    return matchingStory ?? "";
  }, [activeSessionMembers, profiles, stories]);

  const starterPrompts = useMemo(() => {
    if (!sessionId) {
      return GENERIC_STARTER_PROMPTS;
    }
    return storyExperience(activeStory).prompts;
  }, [activeStory, sessionId]);

  const showStarterPrompts = useMemo(
    () => !!sessionId && !groupedMessages.some((message) => message.sourceRole === "user"),
    [groupedMessages, sessionId]
  );

  const mentionCandidates = useMemo(() => {
    if (sessionMode !== "one_to_one") {
      return [];
    }
    const query = mentionQuery.trim().toLowerCase();
    return activeSessionMembers
      .filter((participant) => !participant.muted)
      .filter((participant) =>
      query ? participant.label.toLowerCase().includes(query) : true
    );
  }, [activeSessionMembers, mentionQuery, sessionMode]);

  const selectedPromptPreset = useMemo(
    () => promptPresets.find((preset) => preset.id === selectedPromptPresetId),
    [promptPresets, selectedPromptPresetId]
  );

  const resolvedAgentInitialPrompt =
    selectedPromptPresetId === CUSTOM_PROMPT_PRESET_ID
      ? customInitialPrompt
      : selectedPromptPreset?.prompt ?? customInitialPrompt;

  async function createSessionFromParticipants(input: {
    sessionParticipants: ParticipantForm[];
    sessionModeOverride?: Mode;
    agentInitialPromptOverride?: string;
    globalApiKeyOverride?: string;
    summarizerOverride?:
      | {
          id: string;
          label: string;
          avatarUrl?: string;
          model: string;
          roleTitle?: string;
          character?: string;
          provider: {
            type: ProviderType;
            apiKey: string;
            baseUrl?: string;
          };
        }
      | undefined;
    sessionTitle: string;
    initialMessages?: Message[];
    resumePersistentId?: string;
  }) {
    const payload = {
      mode: input.sessionModeOverride ?? sessionMode,
      globalApiKey: input.globalApiKeyOverride ?? (effectiveGlobalApiKey.trim() || undefined),
      agentInitialPrompt: input.agentInitialPromptOverride ?? resolvedAgentInitialPrompt,
      participants: input.sessionParticipants.map((item, index) => ({
        id: item.id,
        label: item.label,
        avatarUrl: item.avatarUrl || getDefaultAvatarUrl(index),
        model: item.model,
        muted: false,
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
      summarizer: input.summarizerOverride,
      initialMessages: input.initialMessages,
      persistentId: input.resumePersistentId,
      title: input.sessionTitle
    };

    const authHeaders = await buildAuthHeaders(auth.getIdToken);
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
      setError(json.error ?? "Failed to create session.");
      if (json.code?.startsWith("trial_")) {
        await refreshTrialStatus();
      }
      return false;
    }

    const json = (await response.json()) as {
      sessionId: string;
      status: string;
      roundNumber: number;
      mode?: Mode;
      persistentId?: string;
    };
    const members = input.sessionParticipants.map((participant, index) =>
      participantToSessionMember({
        id: participant.id,
        label: participant.label,
        avatarUrl: participant.avatarUrl || getDefaultAvatarUrl(index),
        model: participant.model,
        muted: false,
        roleTitle: participant.roleTitle || undefined,
        character: participant.character || undefined,
      })
    );

    setSessionId(json.sessionId);
    setStatus(json.status);
    setRoundNumber(json.roundNumber);
    if (json.mode) {
      setSessionMode(json.mode);
    }
    setMessages([]);
    setActiveSessionMembers(members);
    setIsChatMembersOpen(false);
    setSessionList((current) => [
      {
        id: json.sessionId,
        title: input.sessionTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        persistentId: json.persistentId,
        source: json.persistentId ? ("cloud" as const) : ("local" as const),
        members
      },
      ...current.filter(
        (item) =>
          item.id !== json.sessionId &&
          !(json.persistentId && item.persistentId === json.persistentId)
      )
    ]);
    if (isMobileView) {
      setMobileActivePanel("chat");
    } else {
      setIsSetupPanelOpen(false);
    }
    connectStream(json.sessionId, json.persistentId);
    return true;
  }

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

  function resetDeadSession() {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    setSessionId(null);
    setMessages([]);
    setActiveSessionMembers([]);
    setStatus("idle");
    setRoundNumber(0);
    setError("Session expired or not found. Please create a new session.");
  }

  // Rebuilds a dead in-memory session from its Firestore record: fetches the
  // stored transcript, recreates the live session under the same persistentId
  // and reconnects. Falls back to a read-only restore when the session can't
  // go live (e.g. no trial budget / API key).
  async function resumeCloudSession(persistentId: string): Promise<boolean> {
    try {
      const headers = await buildAuthHeaders(auth.getIdToken);
      if (!headers.Authorization) {
        return false;
      }

      const response = await fetch(`/api/sessions/${persistentId}`, { headers });
      if (!response.ok) {
        return false;
      }

      const json = (await response.json()) as {
        session: {
          title?: string;
          mode?: Mode;
          agentInitialPrompt?: string;
          roundNumber?: number;
          participants?: Array<{
            id: string;
            label: string;
            avatarUrl?: string;
            model: string;
            muted?: boolean;
            roleTitle?: string;
            character?: string;
            provider?: { type?: ProviderType; baseUrl?: string };
          }>;
          summarizer?: {
            id: string;
            label: string;
            avatarUrl?: string;
            model: string;
            roleTitle?: string;
            character?: string;
            provider?: { type?: ProviderType; baseUrl?: string };
          };
        };
        messages: Message[];
      };

      const toParticipantPayload = (participant: NonNullable<typeof json.session.participants>[number]) => ({
        id: participant.id,
        label: participant.label,
        avatarUrl: participant.avatarUrl,
        model: participant.model,
        muted: participant.muted === true,
        roleTitle: participant.roleTitle,
        character: participant.character,
        provider: {
          type: participant.provider?.type ?? "openrouter",
          apiKey: "",
          baseUrl: participant.provider?.baseUrl
        }
      });

      const participantsPayload = (json.session.participants ?? []).map(toParticipantPayload);
      const members = participantsPayload.map(participantToSessionMember);

      const createResponse = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          mode: json.session.mode,
          agentInitialPrompt: json.session.agentInitialPrompt,
          globalApiKey: effectiveGlobalApiKey.trim() || undefined,
          participants: participantsPayload,
          summarizer: json.session.summarizer
            ? toParticipantPayload(json.session.summarizer)
            : undefined,
          initialMessages: json.messages,
          persistentId,
          title: json.session.title
        })
      });

      if (!createResponse.ok) {
        const errorJson = (await createResponse.json().catch(() => ({}))) as { error?: string };
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        setSessionId(null);
        setMessages(json.messages);
        setActiveSessionMembers(members);
        setStatus("idle");
        setRoundNumber(json.session.roundNumber ?? 0);
        setError(
          errorJson.error
            ? `Session restored read-only. To continue chatting: ${errorJson.error}`
            : "Session restored read-only."
        );
        return true;
      }

      const created = (await createResponse.json()) as {
        sessionId: string;
        status: string;
        roundNumber: number;
      };
      setSessionList((current) =>
        current.map((item) =>
          item.persistentId === persistentId ? { ...item, id: created.sessionId } : item
        )
      );
      setSessionId(created.sessionId);
      setStatus(created.status);
      setRoundNumber(created.roundNumber);
      setMessages([]);
      setActiveSessionMembers(members);
      setError("");
      connectStream(created.sessionId, persistentId);
      return true;
    } catch {
      return false;
    }
  }

  function connectStream(newSessionId: string, resumePersistentId?: string) {
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
        participants?: Array<{
          id: string;
          label: string;
          avatarUrl?: string;
          model?: string;
          muted?: boolean;
        }>;
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
      if (payload.participants) {
        const members = payload.participants.map(participantToSessionMember);
        setActiveSessionMembers(members);
        setSessionList((current) =>
          current.map((item) => (item.id === newSessionId ? { ...item, members } : item))
        );
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
        if (resumePersistentId) {
          void resumeCloudSession(resumePersistentId).then((resumed) => {
            if (!resumed) {
              resetDeadSession();
            }
          });
          return;
        }
        resetDeadSession();
        return;
      }

      setError("SSE reconnecting. If this persists, recreate session.");
    };

    eventSourceRef.current = source;
  }

  async function refreshTrialStatus() {
    const nextStatus = await fetchTrialStatus(await buildAuthHeaders(auth.getIdToken));
    if (nextStatus) {
      setTrialStatus(nextStatus);
    }
  }

  async function redeemTrialInvite(event: FormEvent) {
    event.preventDefault();
    if (!inviteCode.trim()) {
      setError("Invite code is required.");
      return;
    }

    setIsRedeemingInvite(true);
    setError("");
    try {
      const response = await fetch("/api/trial/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await buildAuthHeaders(auth.getIdToken)) },
        body: JSON.stringify({ code: inviteCode })
      });
      const json = (await response.json().catch(() => ({}))) as
        | TrialStatusResponse
        | { error?: string };
      if (!response.ok) {
        setError((json as { error?: string }).error ?? "Failed to redeem invite code.");
        return;
      }

      setTrialStatus(json as TrialStatusResponse);
      setInviteCode("");
    } finally {
      setIsRedeemingInvite(false);
    }
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

    const meta = sessionList.find((item) => item.id === targetSessionId);
    setError("");
    setSessionId(targetSessionId);
    setMessages([]);
    setActiveSessionMembers(meta?.members ?? []);
    if (isMobileView) {
      setMobileActivePanel("chat");
    } else {
      setIsSetupPanelOpen(false);
    }
    connectStream(targetSessionId, meta?.persistentId);
  }

  function deleteSavedSession(targetSessionId: string) {
    const meta = sessionList.find((item) => item.id === targetSessionId);
    if (meta?.persistentId && auth.user) {
      void (async () => {
        const headers = await buildAuthHeaders(auth.getIdToken);
        if (!headers.Authorization) {
          return;
        }
        await fetch(`/api/sessions/${meta.persistentId}`, { method: "DELETE", headers }).catch(
          () => undefined
        );
      })();
    }
    setSessionList((current) => current.filter((item) => item.id !== targetSessionId));
    if (targetSessionId !== sessionId) {
      return;
    }

    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setSessionId(null);
    setMessages([]);
    setActiveSessionMembers([]);
    setStatus("idle");
    setRoundNumber(0);
    setError("");
    setMobileActivePanel("setup");
    setIsSetupPanelOpen(true);
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  }

  function toggleSessionMemberExpansion(targetSessionId: string) {
    setExpandedSessionMembers((current) => ({
      ...current,
      [targetSessionId]: !current[targetSessionId]
    }));
  }

  async function toggleParticipantMute(targetSessionId: string, participantId: string, muted: boolean) {
    const response = await fetch(`/api/session/${targetSessionId}/participant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, muted })
    });

    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Failed to update participant mute state.");
      return;
    }

    const json = (await response.json()) as {
      participants: Array<{ id: string; label: string; avatarUrl?: string; model?: string; muted?: boolean }>;
    };
    const members = json.participants.map(participantToSessionMember);

    setSessionList((current) =>
      current.map((item) => (item.id === targetSessionId ? { ...item, members } : item))
    );

    if (targetSessionId === sessionId) {
      setActiveSessionMembers(members);
      setTargetParticipantIds((current) =>
        current.filter((id) => members.some((member) => member.id === id && !member.muted))
      );
    }
  }

  async function createSession(event: FormEvent) {
    event.preventDefault();
    setError("");
    const sessionTitle = `Session ${new Date().toLocaleString()} · ${participants
      .map((participant) => participant.label)
      .join(", ")}`;
    await createSessionFromParticipants({
      sessionParticipants: participants,
      summarizerOverride: summarizerEnabled
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
        : undefined,
      sessionTitle
    });
  }

  async function quickStartStorySession(story: string) {
    setError("");
    if (!quickStartModel.trim()) {
      setError("Choose a model for Quick Start before creating a session.");
      return;
    }
    const storyProfiles = profiles.filter((profile) => profile.story === story);
    if (storyProfiles.length < 2) {
      setError("Quick Start requires at least 2 characters in the selected story.");
      return;
    }

    if (!quickStartApiKey && !hasServerOpenRouterAccess) {
      setError("Quick Start needs an OpenRouter API key. Set a default key in User Profile or use guest access first.");
      if (isMobileView) {
        setMobileActivePanel("setup");
      }
      return;
    }

    const sessionParticipants = storyProfiles.map((profile, index) =>
      buildParticipantFromProfile(profile, index, quickStartModel || "openai/gpt-5-mini")
    );

    setParticipants(sessionParticipants);
    setSessionMode("roundtable");

    await createSessionFromParticipants({
      sessionParticipants,
      sessionModeOverride: "roundtable",
      agentInitialPromptOverride: DEFAULT_SESSION_RULES,
      globalApiKeyOverride: quickStartApiKey || undefined,
      summarizerOverride: undefined,
      sessionTitle: `Quick Start · ${story} · ${new Date().toLocaleString()}`
    });
  }

  async function handleShare() {
    if (!sessionId || isSharing) return;
    setIsSharing(true);
    setShareUrl(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to create share link.");
        return;
      }
      const data = (await res.json()) as { shareId: string; url: string };
      setShareUrl(data.url);
      try {
        const stored = JSON.parse(
          localStorage.getItem(SHARE_LINKS_STORAGE_KEY) ?? "{}"
        ) as Record<string, { shareId: string; url: string; createdAt: string }>;
        stored[sessionId] = {
          shareId: data.shareId,
          url: data.url,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem(SHARE_LINKS_STORAGE_KEY, JSON.stringify(stored));
      } catch {
        // localStorage unavailable — ignore
      }
      await navigator.clipboard.writeText(data.url).catch(() => undefined);
    } catch {
      setError("Failed to create share link.");
    } finally {
      setIsSharing(false);
    }
  }

  async function submitMessageRequest(content: string, attachments: PendingAttachment[] = []) {
    if (!sessionId || (!content.trim() && attachments.length === 0)) {
      return;
    }

    const requestPayload = JSON.stringify({
      content,
      mode: sessionMode,
      attachments: attachments.map((attachment) => ({
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
      const json = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
      setError(json.error ?? "Failed to send message.");
      if (json.code?.startsWith("trial_")) {
        await refreshTrialStatus();
      }
      return;
    }

    setInput("");
    setPendingAttachments([]);
    setShowMentionMenu(false);
    setMentionQuery("");
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    await submitMessageRequest(input, pendingAttachments);
  }

  async function runSummarizer() {
    if (!sessionId) {
      return;
    }

    const response = await fetch(`/api/session/${sessionId}/summarize`, { method: "POST" });
    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
      setError(json.error ?? "Failed to run summarizer.");
      if (json.code?.startsWith("trial_")) {
        await refreshTrialStatus();
      }
    }
  }

  return (
    <main className="mx-auto h-screen w-full max-w-[1600px] p-4 pb-24 lg:pb-4">
      <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <Link className="flex items-center gap-3" href="/">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <Image
              alt="AllPath logo"
              className="object-contain"
              fill
              priority
              sizes="48px"
              src="/allpath-logo-mark.png"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">AllPath</h1>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Beta
              </span>
            </div>
            <p className="text-sm text-slate-600">Where many minds find one path.</p>
          </div>
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link className="transition hover:text-primary" href="/about">
            What is AllPath
          </Link>
          <Link className="transition hover:text-primary" href="/contact">
            Contact
          </Link>
          <AuthControls auth={auth} />
        </div>
      </div>
      <div className="mb-2 hidden items-center gap-2 lg:flex">
        <button
          className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700"
          type="button"
          onClick={() => setIsSessionSidebarOpen((value) => !value)}
        >
          {isSessionSidebarOpen ? "Hide Sessions" : "Show Sessions"}
        </button>
        <button
          className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700"
          type="button"
          onClick={() => setIsSetupPanelOpen((value) => !value)}
        >
          {isSetupPanelOpen ? "Hide Settings" : "Show Settings"}
        </button>
      </div>

      <div
        className={`grid h-[calc(100%-2.5rem)] gap-4 ${
          isSessionSidebarOpen
            ? !sessionId
              ? "lg:grid-cols-[280px_1fr_1fr]"
              : "lg:grid-cols-[280px_380px_1fr]"
            : !sessionId
              ? "lg:grid-cols-[1fr_1fr]"
              : "lg:grid-cols-[380px_1fr]"
        }`}
      >
      {((isMobileView && mobileActivePanel === "sessions") || (!isMobileView && isSessionSidebarOpen)) && (
        <SessionSidebar
          sessionList={sessionList}
          sessionId={sessionId}
          expandedSessionMembers={expandedSessionMembers}
          onOpenSession={openSavedSession}
          onDeleteSession={deleteSavedSession}
          onToggleMemberExpansion={toggleSessionMemberExpansion}
          onToggleMute={toggleParticipantMute}
        />
      )}

      <div
        className={`${(!isMobileView && isSetupPanelOpen) || (isMobileView && mobileActivePanel === "setup") ? "block" : "hidden"} h-full min-h-0`}
      >
        <SetupPanel
          trialStatus={trialStatus}
          inviteCode={inviteCode}
          isRedeemingInvite={isRedeemingInvite}
          onInviteCodeChange={setInviteCode}
          onRedeemInvite={redeemTrialInvite}
          setupStep={setupStep}
          selectedStory={selectedStory}
          isAdvancedOpen={isAdvancedOpen}
          onSetupStepChange={setSetupStep}
          onSelectedStoryChange={setSelectedStory}
          onAdvancedToggle={() => setIsAdvancedOpen((v) => !v)}
          quickStartModel={quickStartModel}
          quickStartStories={quickStartStories}
          modelPickerCatalog={modelPickerCatalog}
          onQuickStartModelChange={setQuickStartModel}
          onQuickStartStory={(story) => void quickStartStorySession(story)}
          apiKeyMode={apiKeyMode}
          defaultProfileApiKey={defaultProfileApiKey}
          unifiedApiKey={unifiedApiKey}
          promptPresets={promptPresets}
          selectedPromptPresetId={selectedPromptPresetId}
          customInitialPrompt={customInitialPrompt}
          hasServerOpenRouterAccess={hasServerOpenRouterAccess}
          onApiKeyModeChange={setApiKeyMode}
          onUnifiedApiKeyChange={setUnifiedApiKey}
          onPromptPresetChange={setSelectedPromptPresetId}
          onCustomInitialPromptChange={setCustomInitialPrompt}
          participants={participants}
          profiles={profiles}
          stories={stories}
          onUpdateParticipant={updateParticipant}
          onApplyProfileToParticipant={applyProfileToParticipant}
          onAddParticipant={() =>
            setParticipants((current) => [
              ...current,
              defaultParticipant(`p${current.length + 1}`, `Analyst ${String.fromCharCode(65 + current.length)}`)
            ])
          }
          summarizerEnabled={summarizerEnabled}
          summarizer={summarizer}
          onSummarizerEnabledChange={setSummarizerEnabled}
          onSummarizerChange={setSummarizer}
          onApplyProfileToSummarizer={applyProfileToSummarizer}
          canCreate={canCreate}
          onCreateSession={createSession}
        />
      </div>

      <section
        className={`${isMobileView && mobileActivePanel !== "chat" ? "hidden" : "flex"} order-first h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm lg:order-none`}
      >
        <ChatHeader
          sessionId={sessionId}
          status={status}
          roundNumber={roundNumber}
          activeSessionMembers={activeSessionMembers}
          isChatMembersOpen={isChatMembersOpen}
          isSharing={isSharing}
          shareUrl={shareUrl}
          groupedMessages={groupedMessages}
          onToggleChatMembers={() => setIsChatMembersOpen((value) => !value)}
          onToggleMute={toggleParticipantMute}
          onShare={() => void handleShare()}
          onDismissShare={() => setShareUrl(null)}
          onCopyShare={() => void navigator.clipboard.writeText(shareUrl ?? "")}
        />

        <MessageFeed
          sessionId={sessionId}
          status={status}
          groupedMessages={groupedMessages}
          typingAgents={typingAgents}
          activeSessionMembers={activeSessionMembers}
          sessionMode={sessionMode}
          activeStory={activeStory}
          starterPrompts={starterPrompts}
          showStarterPrompts={showStarterPrompts}
          quickStartStories={quickStartStories}
          dynamicPriceMap={dynamicPriceMap}
          lightboxImage={lightboxImage}
          chatScrollRef={chatScrollRef}
          isMobileView={isMobileView}
          onSetInput={setInput}
          onSubmitPrompt={(prompt) => void submitMessageRequest(prompt)}
          onSetMobilePanel={setMobileActivePanel}
          onSetLightbox={setLightboxImage}
          onToggleSetupSection={(section) =>
            setSetupSections((current) => ({ ...current, [section]: true }))
          }
        />

        {error && <p className="border-t border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <ChatInput
          sessionId={sessionId}
          sessionMode={sessionMode}
          summarizerEnabled={summarizerEnabled}
          input={input}
          pendingAttachments={pendingAttachments}
          targetParticipantIds={targetParticipantIds}
          mentionCandidates={mentionCandidates}
          showMentionMenu={showMentionMenu}
          activeSessionMembers={activeSessionMembers}
          isMobileView={isMobileView}
          onInputChange={setInput}
          onSendMessage={sendMessage}
          onSubmitMessageRequest={submitMessageRequest}
          onAddAttachments={addPendingAttachments}
          onRemoveAttachment={removePendingAttachment}
          onSelectMentionTarget={selectMentionTarget}
          onSetTargetParticipantIds={setTargetParticipantIds}
          onRunSummarizer={runSummarizer}
          onSetLightbox={setLightboxImage}
          onChangeMode={changeSessionMode}
        />
      </section>
      </div>
      {isMobileView && (
        <MobileNav
          mobileActivePanel={mobileActivePanel}
          sessionId={sessionId}
          onSetPanel={setMobileActivePanel}
        />
      )}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-sm text-slate-900"
              onClick={() => setLightboxImage(null)}
            >
              Close
            </button>
            <img
              src={lightboxImage.src}
              alt={lightboxImage.name}
              className="max-h-[85vh] max-w-full rounded-2xl object-contain"
            />
            <p className="mt-2 text-center text-sm text-white">{lightboxImage.name}</p>
          </div>
        </div>
      )}
    </main>
  );
}
