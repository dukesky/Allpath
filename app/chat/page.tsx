"use client";

import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CatalogModel,
  FEATURED_MODELS,
  MORE_MODELS,
  isNew,
  isPopular,
  modelPriceTag
} from "@/lib/modelCatalog";
import { ModelPicker } from "@/app/chat/ModelPicker";
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
import { getDefaultAvatarUrl } from "@/lib/avatar";

const PROFILE_STORAGE_KEY = "allpath-agent-profiles";
const STORY_STORAGE_KEY = "allpath-agent-stories";
const SESSION_LIST_STORAGE_KEY = "allpath-session-list";
const ACTIVE_SESSION_STORAGE_KEY = "allpath-active-session";
const SHARE_LINKS_STORAGE_KEY = "allpath-share-links";

interface SessionMemberMeta {
  id: string;
  label: string;
  avatarUrl?: string;
  model?: string;
  muted?: boolean;
}

interface SessionMeta {
  id: string;
  title: string;
  createdAt: string;
  members: SessionMemberMeta[];
}

interface StoryExperience {
  tagline: string;
  prompts: string[];
}

type PendingAttachment = Omit<MessageAttachment, "attachmentId"> & { localId: string };

type ApiKeyMode = "default_profile" | "unified" | "by_agent";

interface TrialStatusResponse {
  available: boolean;
  requiresInviteCode: boolean;
  trialStatus?: "active" | "exhausted" | "revoked";
  remainingBudgetUsd?: number;
  trialBudgetUsd?: number;
  trialSpentUsd?: number;
  hasPersonalOpenRouterKey: boolean;
}

function remainingTrialPercent(status: TrialStatusResponse | null): number {
  const total = Number(status?.trialBudgetUsd ?? 0);
  const remaining = Number(status?.remainingBudgetUsd ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
}

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

function participantToSessionMember(participant: {
  id: string;
  label: string;
  avatarUrl?: string;
  model?: string;
  muted?: boolean;
}): SessionMemberMeta {
  return {
    id: participant.id,
    label: participant.label,
    avatarUrl: participant.avatarUrl || "",
    model: participant.model,
    muted: participant.muted ?? false
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

function isImageAttachment(
  attachment: Pick<MessageAttachment, "kind" | "dataUrl"> | Pick<PendingAttachment, "kind" | "dataUrl">
): boolean {
  return attachment.kind === "image" && typeof attachment.dataUrl === "string" && attachment.dataUrl.length > 0;
}

function buildParticipantFromProfile(
  profile: AgentProfile,
  index: number,
  model = "openai/gpt-5-mini"
): ParticipantForm {
  return {
    id: `quick-${profile.id}-${index}`,
    label: profile.name,
    avatarUrl: profile.avatarUrl || "",
    storyFilter: profile.story ? profile.story : "__none__",
    model,
    providerType: "openrouter",
    useSpecificApiKey: false,
    apiKey: "",
    baseUrl: "",
    roleTitle: profile.roleTitle,
    character: profile.character,
    profileId: profile.id
  };
}

const QUICK_START_STORY_CONTENT: Record<string, StoryExperience> = {
  "Historical Figures": {
    tagline: "Debate values, meaning, ethics, and hard decisions from timeless perspectives.",
    prompts: [
      "Who are you, and how does each of you think?",
      "What can this team help me reason through?",
      "What makes a life meaningful in modern society?",
      "How should freedom and responsibility be balanced today?"
    ]
  },
  "Journey to the West": {
    tagline: "A lively mix of discipline, provocation, tactics, and mythic personalities.",
    prompts: [
      "Who are you, and how would each of you introduce yourselves?",
      "What kinds of conflicts or dilemmas can this team help me solve?",
      "Who is more effective under pressure: Tang Seng or Sun Wukong?",
      "How would this team solve a startup conflict?"
    ]
  },
  "Dragon Ball": {
    tagline: "High-energy strategy, rivalry, execution, and inventive problem-solving.",
    prompts: [
      "Who are you, and what does each of you bring to the team?",
      "What can this team help me do better than a single assistant?",
      "How would this team prepare for a high-stakes launch?",
      "Who should lead when speed matters more than consensus?"
    ]
  },
  "Life Coaches Panel": {
    tagline: "Get real, balanced life advice — practical, emotional, strategic, and challenging.",
    prompts: [
      "Should I quit my job to pursue my passion?",
      "I'm stuck in a major life decision — help me think through it.",
      "How do I know if I'm playing it too safe or taking too much risk?",
      "What would each of you say to someone who feels lost at 30?"
    ]
  },
  "Financial Advisors Board": {
    tagline: "Investment, risk, psychology, and entrepreneurship — four angles on your money.",
    prompts: [
      "Should I invest my savings in index funds, real estate, or my own business?",
      "Help me evaluate this financial decision from all angles.",
      "What should I do with my first $10,000?",
      "Is it smart to take on debt to invest right now?"
    ]
  },
  "Writers' Room": {
    tagline: "Structure, character, world-building, and voice — everything your story needs.",
    prompts: [
      "Help me develop the main character in my story.",
      "My story feels flat — what's missing?",
      "I have a world and characters but no plot. Where do I start?",
      "How do I write dialogue that sounds natural and reveals character?"
    ]
  },
  "Philosophy Circle": {
    tagline: "Logic, meaning, consequences, and doubt — four philosophical traditions in dialogue.",
    prompts: [
      "Is it ever morally justified to lie?",
      "What is the meaning of life, and how would each of you answer?",
      "Do humans have free will, or is everything determined?",
      "What does it mean to live a good life?"
    ]
  },
  "Devil's Advocates": {
    tagline: "The best counterargument, the worst-case scenario, and every assumption challenged.",
    prompts: [
      "Here's my plan — tear it apart.",
      "Why might my business idea fail?",
      "Challenge the assumptions behind my decision.",
      "What's the strongest argument against my position?"
    ]
  },
  "Roast Panel": {
    tagline: "Brutal honesty, sharp wit, a defender, and a final verdict. Bring your best ideas.",
    prompts: [
      "Roast my business idea.",
      "Here's my plan — give me your most honest feedback.",
      "What's wrong with my approach? Don't hold back.",
      "Rate this idea out of 10 and explain why."
    ]
  }
};

const GENERIC_STARTER_PROMPTS = [
  "Who are you?",
  "What can you do?",
  "How should I use this team well?",
  "Show me how your viewpoints differ."
];

function storyExperience(story: string): StoryExperience {
  return (
    QUICK_START_STORY_CONTENT[story] ?? {
      tagline: "A reusable agent team with contrasting personalities and viewpoints.",
      prompts: GENERIC_STARTER_PROMPTS
    }
  );
}

function SetupSection(props: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={props.onToggle}
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{props.title}</h2>
          {props.summary ? <p className="mt-1 text-xs text-slate-600">{props.summary}</p> : null}
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-500">
          {props.open ? "Hide" : "Show"}
        </span>
      </button>
      {props.open ? <div className="mt-3">{props.children}</div> : null}
    </section>
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

async function fetchTrialStatus(): Promise<TrialStatusResponse | null> {
  const response = await fetch("/api/trial/status");
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as TrialStatusResponse;
}

export default function HomePage() {
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
  const [isModeHelpOpen, setIsModeHelpOpen] = useState(false);
  const [quickStartModel, setQuickStartModel] = useState("openai/gpt-5-mini");
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
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

    const activeSession = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (activeSession) {
      setSessionId(activeSession);
      setMessages([]);
      setMobileActivePanel("chat");
      connectStream(activeSession);
    }

    void fetchTrialStatus().then((value) => {
      if (value) {
        setTrialStatus(value);
      }
    });
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
      initialMessages: input.initialMessages
    };

    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    };
    const members = input.sessionParticipants.map((participant, index) =>
      participantToSessionMember({
        id: participant.id,
        label: participant.label,
        avatarUrl: participant.avatarUrl || getDefaultAvatarUrl(index),
        model: participant.model,
        muted: false
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
        members
      },
      ...current.filter((item) => item.id !== json.sessionId)
    ]);
    if (isMobileView) {
      setMobileActivePanel("chat");
    } else {
      setIsSetupPanelOpen(false);
    }
    connectStream(json.sessionId);
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
        localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        setSessionId(null);
        setMessages([]);
        setActiveSessionMembers([]);
        setStatus("idle");
        setRoundNumber(0);
        setError("Session expired or not found. Please create a new session.");
        return;
      }

      setError("SSE reconnecting. If this persists, recreate session.");
    };

    eventSourceRef.current = source;
  }

  async function refreshTrialStatus() {
    const nextStatus = await fetchTrialStatus();
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
        headers: { "Content-Type": "application/json" },
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

    setError("");
    setSessionId(targetSessionId);
    setMessages([]);
    setActiveSessionMembers(
      sessionList.find((item) => item.id === targetSessionId)?.members ?? []
    );
    if (isMobileView) {
      setMobileActivePanel("chat");
    } else {
      setIsSetupPanelOpen(false);
    }
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
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {item.members.slice(0, 4).map((member, memberIndex) => (
                        <div
                          key={member.id}
                          className={`relative h-8 w-8 overflow-hidden rounded-full border-2 border-white ${
                            member.muted ? "opacity-50" : ""
                          }`}
                        >
                          <img
                            alt={member.label}
                            className="h-full w-full object-cover"
                            src={member.avatarUrl || getDefaultAvatarUrl(memberIndex)}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500">{item.members.length} members</p>
                  </div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 font-mono text-[10px]">{item.id}</p>
                </button>
                <div className="flex flex-col gap-1">
                  <button
                    className="rounded-md border border-slate-300 px-2 py-1 text-[10px] text-slate-600"
                    onClick={() => toggleSessionMemberExpansion(item.id)}
                    type="button"
                  >
                    {expandedSessionMembers[item.id] ? "Hide" : "Members"}
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
              {expandedSessionMembers[item.id] && (
                <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white/70 p-2">
                  {item.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 rounded-md border border-slate-200 p-2">
                      <div className={`relative h-10 w-10 overflow-hidden rounded-full bg-slate-100 ${member.muted ? "opacity-50" : ""}`}>
                        {member.avatarUrl ? (
                          <img
                            alt={member.label}
                            className="h-full w-full object-cover"
                            src={member.avatarUrl}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-700">
                            {initialsForLabel(member.label)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">{member.label}</p>
                        <p className="truncate text-[10px] text-slate-500">{member.model ?? "model not set"}</p>
                      </div>
                      <button
                        className={`rounded-md px-2 py-1 text-[10px] ${
                          member.muted
                            ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border border-amber-300 bg-amber-50 text-amber-700"
                        }`}
                        onClick={() => toggleParticipantMute(item.id, member.id, !member.muted)}
                        type="button"
                      >
                        {member.muted ? "Unmute" : "Mute"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      )}

      <section
        className={`${(!isMobileView && isSetupPanelOpen) || (isMobileView && mobileActivePanel === "setup") ? "block" : "hidden"} h-full min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}
      >
        <div className="mt-1 flex gap-3">
          <Link className="inline-block text-sm font-medium text-primary" href="/agents">
            Open Agent Personality Studio
          </Link>
          <Link className="inline-block text-sm font-medium text-primary" href="/profile">
            Open User Profile
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {trialStatus?.available === true && trialStatus.requiresInviteCode && (
            <form
              className="rounded-xl border border-amber-300 bg-amber-50 p-3"
              onSubmit={redeemTrialInvite}
            >
              <p className="text-sm font-semibold text-amber-900">Friend Trial Access</p>
              <p className="mt-1 text-xs text-amber-800">
                Enter an invite code to unlock trial access. Active browsers cannot redeem again. Exhausted browsers can redeem a new code to refresh access.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-md border border-amber-300 px-3 py-2 text-sm"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="Invite code"
                />
                <button
                  type="submit"
                  disabled={isRedeemingInvite}
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  {isRedeemingInvite ? "Checking..." : "Redeem"}
                </button>
              </div>
            </form>
          )}

          {trialStatus?.available === true && !trialStatus.requiresInviteCode && (
            <div
              className={`rounded-xl border p-3 text-sm ${
                trialStatus.trialStatus === "active"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-rose-300 bg-rose-50 text-rose-900"
              }`}
            >
              <p className="font-semibold">
                {trialStatus.hasPersonalOpenRouterKey
                  ? "Personal OpenRouter key saved for this browser"
                  : trialStatus.trialStatus === "active"
                    ? "Free trial is active"
                    : "Free trial budget is exhausted"}
              </p>
              <p className="mt-1 text-xs">
                Trial remaining: {remainingTrialPercent(trialStatus)}%
                {!trialStatus.hasPersonalOpenRouterKey && trialStatus.trialStatus !== "active"
                  ? " . Add your own OpenRouter key in User Profile to continue."
                  : ""}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <SetupSection
            title="Quick Start"
            summary="Pick a story and create a round-table session instantly. If no OpenRouter key is available, you will be prompted to set one."
            open={setupSections.quickStart}
            onToggle={() =>
              setSetupSections((current) => ({ ...current, quickStart: !current.quickStart }))
            }
          >
            <div className="space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {modelPickerCatalog.featuredModels.map((model) => {
                  const active = quickStartModel === model.id;
                  return (
                    <button
                      key={`quick-start-${model.id}`}
                      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                      onClick={() => setQuickStartModel(model.id)}
                      type="button"
                    >
                      <span className="flex items-center gap-1">
                        {model.label}
                        {isNew(model) && (
                          <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                            New
                          </span>
                        )}
                        {isPopular(model) && (
                          <span className="text-[11px]" title="Popular">
                            🔥
                          </span>
                        )}
                        <span className="opacity-60">{model.price}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {quickStartStories.map(({ story, members }) => (
                <div
                  key={story}
                  className="w-[240px] min-w-[240px] max-w-[240px] shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex -space-x-2">
                    {members.slice(0, 4).map((member, memberIndex) => (
                      <div key={member.id} className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-slate-100">
                        <img
                          alt={member.name}
                          className="h-full w-full object-cover"
                          src={member.avatarUrl || getDefaultAvatarUrl(memberIndex)}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{story}</p>
                  <p className="mt-1 text-xs text-slate-500">{members.length} characters ready</p>
                  <p className="mt-2 min-h-[52px] whitespace-normal break-words text-xs leading-5 text-slate-600">
                    {storyExperience(story).tagline}
                  </p>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white"
                    onClick={() => void quickStartStorySession(story)}
                  >
                    Start Chat
                  </button>
                </div>
              ))}
            </div>
            </div>
          </SetupSection>
        </div>

        <form className="mt-4 space-y-4" onSubmit={createSession}>
          <SetupSection
            title="Session Rules"
            summary="Prompt preset and API key mode used when you create a manual session."
            open={setupSections.sessionRules}
            onToggle={() =>
              setSetupSections((current) => ({ ...current, sessionRules: !current.sessionRules }))
            }
          >
          <div className="space-y-2">
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
                <div className="space-y-2">
                  <input
                    className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-600"
                    type="password"
                    value={defaultProfileApiKey}
                    readOnly
                    placeholder="No local default key in User Profile"
                  />
                  {!defaultProfileApiKey.trim() && hasServerOpenRouterAccess && (
                    <p className="text-xs text-emerald-700">
                      Server-backed guest access is available, so OpenRouter sessions can still run without a local key.
                    </p>
                  )}
                </div>
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
          </SetupSection>

          <SetupSection
            title="Participants"
            summary={`${participants.length} configured participants.`}
            open={setupSections.participants}
            onToggle={() =>
              setSetupSections((current) => ({ ...current, participants: !current.participants }))
            }
          >
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
          </SetupSection>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={summarizerEnabled}
              onChange={(event) => setSummarizerEnabled(event.target.checked)}
            />
            Enable Summarizer
          </label>

          {summarizerEnabled && (
            <SetupSection
              title="Summarizer"
              summary="Optional final synthesis agent."
              open={setupSections.summarizer}
              onToggle={() =>
                setSetupSections((current) => ({ ...current, summarizer: !current.summarizer }))
              }
            >
            <div className="space-y-2">
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
            </SetupSection>
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

      <section
        className={`${isMobileView && mobileActivePanel !== "chat" ? "hidden" : "flex"} order-first h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm lg:order-none`}
      >
        <header className="border-b border-slate-200 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-600">
                Session: <span className="font-mono text-xs">{sessionId ?? "not created"}</span> | Status: {status} |
                Round: {roundNumber}
              </p>
              {sessionId && activeSessionMembers.length > 0 && (
                <div className="mt-3">
                  <button
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left"
                    type="button"
                    onClick={() => setIsChatMembersOpen((value) => !value)}
                  >
                    <div className="flex -space-x-2">
                      {activeSessionMembers.slice(0, 5).map((member, memberIndex) => (
                        <div
                          key={member.id}
                          className={`relative h-9 w-9 overflow-hidden rounded-full border-2 border-white ${
                            member.muted ? "opacity-50" : ""
                          }`}
                        >
                          <img
                            alt={member.label}
                            className="h-full w-full object-cover"
                            src={member.avatarUrl || getDefaultAvatarUrl(memberIndex)}
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        {activeSessionMembers.filter((member) => !member.muted).length} active / {activeSessionMembers.length} members
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isChatMembersOpen ? "Hide members" : "Show members"}
                      </p>
                    </div>
                  </button>
                  {isChatMembersOpen && (
                    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-2">
                      {activeSessionMembers.map((member, memberIndex) => (
                        <div key={member.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
                          <div className={`relative h-10 w-10 overflow-hidden rounded-full bg-slate-100 ${member.muted ? "opacity-50" : ""}`}>
                            <img
                              alt={member.label}
                              className="h-full w-full object-cover"
                              src={member.avatarUrl || getDefaultAvatarUrl(memberIndex)}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">{member.label}</p>
                            <p className="truncate text-[11px] text-slate-500">{member.model ?? "model not set"}</p>
                          </div>
                          <button
                            className={`rounded-md px-2 py-1 text-[11px] ${
                              member.muted
                                ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border border-amber-300 bg-amber-50 text-amber-700"
                            }`}
                            disabled={!sessionId}
                            onClick={() => {
                              if (!sessionId) {
                                return;
                              }
                              void toggleParticipantMute(sessionId, member.id, !member.muted);
                            }}
                            type="button"
                          >
                            {member.muted ? "Unmute" : "Mute"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
              {sessionId && groupedMessages.some((m) => m.sourceRole !== "user" && m.status === "completed") && (
                <div className="relative self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={() => void handleShare()}
                    disabled={isSharing}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isSharing ? "Sharing…" : "Share"}
                  </button>
                  {shareUrl && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                      <p className="text-xs font-semibold text-slate-700">Link copied to clipboard</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{shareUrl}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="button"
                          className="text-xs text-indigo-600 hover:underline"
                          onClick={() => void navigator.clipboard.writeText(shareUrl)}
                        >
                          Copy again
                        </button>
                        <button
                          type="button"
                          className="text-xs text-slate-400 hover:underline"
                          onClick={() => setShareUrl(null)}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            <div className="relative flex items-center gap-2 self-start lg:self-auto">
              <label className="text-xs text-slate-500">Mode</label>
              <select
                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                value={sessionMode}
                onChange={(event) => void changeSessionMode(event.target.value as Mode)}
              >
                <option value="roundtable">Round Table</option>
                <option value="one_to_one">One to One</option>
              </select>
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-500"
                onClick={() => setIsModeHelpOpen((value) => !value)}
                aria-label="Explain chat modes"
              >
                ?
              </button>
              {isModeHelpOpen && (
                <div className="absolute right-0 top-9 z-10 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-lg">
                  <p>
                    <span className="font-semibold text-slate-800">Round Table:</span> every agent sees the shared conversation and answers in context.
                  </p>
                  <p className="mt-2">
                    <span className="font-semibold text-slate-800">One-to-One:</span> agents only see you, unless you target them with <span className="font-mono">@</span>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>

        <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {!sessionId && (
            <section className="mx-auto flex max-w-3xl flex-col items-center rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white px-6 py-10 text-center shadow-sm">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-amber-200 bg-white p-3 shadow-sm">
                <Image alt="AllPath logo" className="object-contain" fill sizes="64px" src="/allpath-logo-mark.png" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-slate-900">Start fast</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Pick a story, choose a model, and open a conversation in one tap. Use Quick Start for the fastest demo, or open Setup to build your own team.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {quickStartStories.slice(0, 3).map(({ story, members }) => (
                  <button
                    key={story}
                    type="button"
                    className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
                    onClick={() => {
                      setMobileActivePanel("setup");
                      setSetupSections((current) => ({ ...current, quickStart: true }));
                    }}
                  >
                    {story} · {members.length} characters
                  </button>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {GENERIC_STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
                    onClick={() => {
                      setInput(prompt);
                      if (isMobileView) {
                        setMobileActivePanel("setup");
                      }
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          )}
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
                  {message.sourceRole !== "user" ? (
                    <img
                      src={message.sourceAvatarUrl ?? (() => {
                        const idx = activeSessionMembers.findIndex(m => m.label === message.sourceLabel);
                        return getDefaultAvatarUrl(idx >= 0 ? idx : 0);
                      })()}
                      alt={`${message.sourceLabel} avatar`}
                      className="h-full w-full rounded-full object-contain"
                    />
                  ) : (
                    avatarLabel("You")
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
                        <div className="mt-3 space-y-2">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.attachmentId}>
                              {isImageAttachment(attachment) ? (
                                <button
                                  type="button"
                                  className="block overflow-hidden rounded-xl border border-white/20 bg-white/10 text-left"
                                  onClick={() =>
                                    setLightboxImage({
                                      src: attachment.dataUrl!,
                                      name: attachment.name
                                    })
                                  }
                                >
                                  <img
                                    src={attachment.dataUrl}
                                    alt={attachment.name}
                                    className="max-h-44 w-full object-cover"
                                  />
                                  <div className="px-2 py-1 text-xs opacity-90">{attachment.name}</div>
                                </button>
                              ) : (
                                <div className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs opacity-90">
                                  File: {attachment.name}
                                </div>
                              )}
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
          {showStarterPrompts && (
            <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {activeStory ? `${activeStory} starter prompts` : "Starter prompts"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {activeStory
                  ? storyExperience(activeStory).tagline
                  : "Ask one of these to get the conversation moving."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {starterPrompts.slice(0, 4).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
                    onClick={() => void submitMessageRequest(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {sessionMode === "one_to_one" && (
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="text-slate-500">Targets:</span>
              {targetParticipantIds.length === 0 ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">All agents</span>
              ) : (
                targetParticipantIds.map((targetId) => {
                  const target = activeSessionMembers.find((participant) => participant.id === targetId);
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
                <div
                  key={attachment.localId}
                  className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50"
                >
                  {isImageAttachment(attachment) ? (
                    <button
                      type="button"
                      className="block text-left"
                      onClick={() =>
                        setLightboxImage({
                          src: attachment.dataUrl!,
                          name: attachment.name
                        })
                      }
                    >
                      <img
                        src={attachment.dataUrl}
                        alt={attachment.name}
                        className="h-24 w-24 object-cover"
                      />
                    </button>
                  ) : null}
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="max-w-[120px] truncate text-xs text-slate-700">
                      {attachment.kind === "image" ? attachment.name : `file: ${attachment.name}`}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-rose-600"
                      onClick={() => removePendingAttachment(attachment.localId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={sendMessage}>
            <div className="relative flex-1">
              <textarea
                className="min-h-[96px] w-full rounded-xl border border-slate-300 px-3 py-3 text-sm sm:min-h-[44px] sm:py-2"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                    return;
                  }
                  event.preventDefault();
                  void submitMessageRequest(input, pendingAttachments);
                }}
                rows={isMobileView ? 4 : 2}
                placeholder={
                  sessionMode === "one_to_one"
                    ? "Type message, use @ to mention a specific agent"
                    : "Type your message"
                }
              />
              {sessionMode === "one_to_one" && showMentionMenu && mentionCandidates.length > 0 && (
                <div className="absolute bottom-[104px] left-0 z-10 w-64 rounded-md border border-slate-200 bg-white p-1 shadow-lg sm:bottom-14">
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-center text-xs text-slate-700">
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
            </div>
          </form>
        </div>
      </section>
      </div>
      {isMobileView && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center justify-around gap-2">
            <button
              type="button"
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
                mobileActivePanel === "chat" ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => setMobileActivePanel(sessionId ? "chat" : "setup")}
            >
              Chat
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
                mobileActivePanel === "sessions" ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => setMobileActivePanel("sessions")}
            >
              Sessions
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
                mobileActivePanel === "setup" ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
              }`}
              onClick={() => setMobileActivePanel("setup")}
            >
              Setup
            </button>
          </div>
        </nav>
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
