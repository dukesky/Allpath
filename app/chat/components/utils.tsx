"use client";

import { Fragment, ReactNode } from "react";
import { AgentProfile } from "@/lib/agentProfiles";
import {
  PendingAttachment,
  SessionMemberMeta,
  StoryExperience,
  TrialStatusResponse,
  ParticipantForm,
} from "./types";

export function remainingTrialPercent(status: TrialStatusResponse | null): number {
  const total = Number(status?.trialBudgetUsd ?? 0);
  const remaining = Number(status?.remainingBudgetUsd ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
}

export function participantToSessionMember(participant: {
  id: string;
  label: string;
  avatarUrl?: string;
  model?: string;
  muted?: boolean;
  roleTitle?: string;
  character?: string;
}): SessionMemberMeta {
  return {
    id: participant.id,
    label: participant.label,
    avatarUrl: participant.avatarUrl || "",
    model: participant.model,
    muted: participant.muted ?? false,
    roleTitle: participant.roleTitle,
    character: participant.character,
  };
}

export function initialsForLabel(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function defaultParticipant(seed: string, label: string): ParticipantForm {
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

export function isImageAttachment(
  attachment: Pick<PendingAttachment, "kind" | "dataUrl">
): boolean {
  return attachment.kind === "image" && typeof attachment.dataUrl === "string" && attachment.dataUrl.length > 0;
}

export function buildParticipantFromProfile(
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

export const QUICK_START_STORY_CONTENT: Record<string, StoryExperience> = {
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
      "What can this team do better than a single assistant?",
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

export const GENERIC_STARTER_PROMPTS = [
  "Who are you?",
  "What can you do?",
  "How should I use this team well?",
  "Show me how your viewpoints differ."
];

export function storyExperience(story: string): StoryExperience {
  return (
    QUICK_START_STORY_CONTENT[story] ?? {
      tagline: "A reusable agent team with contrasting personalities and viewpoints.",
      prompts: GENERIC_STARTER_PROMPTS
    }
  );
}

export function renderInlineMarkdown(text: string): ReactNode[] {
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

export function renderMessageContent(text: string): ReactNode[] {
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

export function avatarLabel(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) {
    return "?";
  }
  return cleaned.slice(0, 1).toUpperCase();
}

export function parseLocalJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function isTextLikeFile(file: File): boolean {
  if (file.type.startsWith("text/")) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return [".txt", ".md", ".json", ".csv"].some((suffix) => lower.endsWith(suffix));
}

export function readFileAsDataUrl(file: File): Promise<string> {
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

export async function fetchTrialStatus(): Promise<TrialStatusResponse | null> {
  const response = await fetch("/api/trial/status");
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as TrialStatusResponse;
}

export function SetupSection(props: {
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
