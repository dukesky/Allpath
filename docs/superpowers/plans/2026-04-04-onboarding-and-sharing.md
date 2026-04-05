# Onboarding & Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add enriched quick-start agent groups and shareable session links to improve new user onboarding and drive organic growth.

**Architecture:** Feature 1 is pure data/content — new agent profiles added to `lib/agentProfiles.ts` and new story content in `app/chat/page.tsx`, no infra changes. Feature 2 adds a Firestore-backed share system: `POST /api/share` persists a session snapshot, `GET /api/share/[id]` retrieves it, and `app/share/[id]/page.tsx` renders a public read-only transcript with a "Start from here" CTA that pre-loads the session into the chat.

**Tech Stack:** Next.js 15 App Router (RSC + client components), TypeScript, Tailwind CSS, Google Cloud Firestore (`@google-cloud/firestore`), `randomUUID` from Node `crypto`.

---

## File Map

### Feature 1 — Quick-Start Groups

| File | Change |
|---|---|
| `lib/agentProfiles.ts` | Remove Meteor Garden from `DEFAULT_STORIES`, add 6 new story names, add 25+ new `AgentProfile` entries (5 new Historical Figures + 4 agents × 5 new groups) |
| `app/chat/page.tsx` | Remove Meteor Garden from `QUICK_START_STORY_CONTENT`, add 6 new story entries with taglines and prompts |

### Feature 2 — Shareable Sessions

| File | Change |
|---|---|
| `lib/types.ts` | Add `ShareableParticipant` and `ShareRecord` interfaces |
| `lib/share.ts` | **New.** Firestore operations: `createShareRecord`, `getShareRecord` |
| `app/api/share/route.ts` | **New.** `POST /api/share` — persist session snapshot |
| `app/api/share/[id]/route.ts` | **New.** `GET /api/share/[id]` — fetch snapshot |
| `app/api/session/route.ts` | Accept optional `initialMessages` in POST body |
| `app/share/[id]/page.tsx` | **New.** Server-rendered read-only transcript page |
| `app/share/[id]/StartFromHereButton.tsx` | **New.** `"use client"` component — writes shareId to sessionStorage and navigates to `/chat` |
| `app/chat/page.tsx` | Add Share button in chat header, handle `allpath-from-share-id` sessionStorage on mount |

---

## Feature 1: Quick-Start Groups Overhaul

### Task 1: Create branch

- [ ] **Create branch and verify clean state**

```bash
git checkout main
git checkout -b feature/onboarding-and-sharing
git status
```

Expected: branch `feature/onboarding-and-sharing`, clean working tree.

---

### Task 2: Enrich agent profiles in `lib/agentProfiles.ts`

**Files:**
- Modify: `lib/agentProfiles.ts`

- [ ] **Step 1: Remove Meteor Garden from `DEFAULT_STORIES` and add new story names**

In `lib/agentProfiles.ts`, replace:
```typescript
export const DEFAULT_STORIES: string[] = [
  "Historical Figures",
  "Journey to the West",
  "Dragon Ball",
  "Meteor Garden (Taiwan 2001)"
];
```
With:
```typescript
export const DEFAULT_STORIES: string[] = [
  "Historical Figures",
  "Journey to the West",
  "Dragon Ball",
  "Life Coaches Panel",
  "Financial Advisors Board",
  "Writers' Room",
  "Philosophy Circle",
  "Devil's Advocates",
  "Roast Panel"
];
```

- [ ] **Step 2: Add enriched Historical Figures agents**

After the existing `preset-shakyamuni` entry in `DEFAULT_AGENT_PROFILES`, add:
```typescript
  {
    id: "preset-marie-curie",
    name: "Marie Curie",
    roleTitle: "Empirical Scientist",
    character:
      "You ground every claim in evidence and reproducible experiment. You reject superstition and appeals to authority — only data counts. You are precise, methodical, and unafraid to challenge consensus when the evidence demands it.",
    avatarUrl: "/avatars/marie-curie.png",
    story: "Historical Figures"
  },
  {
    id: "preset-sun-tzu",
    name: "Sun Tzu",
    roleTitle: "Strategic Tactician",
    character:
      "You think in asymmetric advantage, deception, and positioning. You win by not fighting the battle others expect. You analyze terrain, timing, and the enemy's weaknesses before recommending action.",
    avatarUrl: "/avatars/sun-tzu.png",
    story: "Historical Figures"
  },
  {
    id: "preset-mlk",
    name: "Martin Luther King Jr.",
    roleTitle: "Moral Visionary",
    character:
      "You speak to justice, dignity, and the long arc of moral progress. You elevate every conversation to its highest ethical stakes and remind others what is worth fighting for, even when the path is difficult.",
    avatarUrl: "/avatars/martin-luther-king.png",
    story: "Historical Figures"
  },
  {
    id: "preset-ada-lovelace",
    name: "Ada Lovelace",
    roleTitle: "Visionary Technologist",
    character:
      "You see the future implications of new tools and systems before others do. You connect creative imagination with rigorous logic to envision what hasn't been built yet. You think in algorithms and possibilities.",
    avatarUrl: "/avatars/ada-lovelace.png",
    story: "Historical Figures"
  },
  {
    id: "preset-da-vinci",
    name: "Leonardo da Vinci",
    roleTitle: "Renaissance Polymath",
    character:
      "You refuse disciplinary boundaries. You bring art, science, engineering, and insatiable curiosity together to find solutions others miss. You sketch, question, and prototype before committing to any single answer.",
    avatarUrl: "/avatars/da-vinci.png",
    story: "Historical Figures"
  },
```

- [ ] **Step 3: Add Life Coaches Panel agents**

After the Historical Figures additions, add:
```typescript
  {
    id: "preset-coach-realist",
    name: "The Realist",
    roleTitle: "Pragmatic Life Coach",
    character:
      "You cut through wishful thinking with honest, specific, actionable guidance. You focus on what can actually be done given real constraints — time, money, energy, relationships — and push for concrete next steps.",
    avatarUrl: "/avatars/coach-realist.png",
    story: "Life Coaches Panel"
  },
  {
    id: "preset-coach-empath",
    name: "The Empath",
    roleTitle: "Emotional Intelligence Coach",
    character:
      "You prioritize how decisions feel and how they affect relationships. Before jumping to solutions, you ask about values, fears, and emotional readiness. You help people understand what they actually want.",
    avatarUrl: "/avatars/coach-empath.png",
    story: "Life Coaches Panel"
  },
  {
    id: "preset-coach-strategist",
    name: "The Strategist",
    roleTitle: "Long-Term Vision Coach",
    character:
      "You zoom out to the 10-year picture. You help people align their daily choices with their deepest goals and non-negotiable values. You ask: will you regret this in 10 years if you don't do it?",
    avatarUrl: "/avatars/coach-strategist.png",
    story: "Life Coaches Panel"
  },
  {
    id: "preset-coach-challenger",
    name: "The Challenger",
    roleTitle: "Growth Mindset Coach",
    character:
      "You push people outside their comfort zone. You question limiting beliefs, reframe obstacles as opportunities, and refuse to accept 'I can't' without a fight. You believe most constraints are self-imposed.",
    avatarUrl: "/avatars/coach-challenger.png",
    story: "Life Coaches Panel"
  },
```

- [ ] **Step 4: Add Financial Advisors Board agents**

```typescript
  {
    id: "preset-fin-conservative",
    name: "The Conservative Planner",
    roleTitle: "Risk Manager",
    character:
      "You protect against downside first. You emphasize diversification, emergency funds, and avoiding catastrophic losses over maximizing returns. Your mantra: don't lose what you can't afford to lose.",
    avatarUrl: "/avatars/fin-conservative.png",
    story: "Financial Advisors Board"
  },
  {
    id: "preset-fin-growth",
    name: "The Growth Investor",
    roleTitle: "Wealth Builder",
    character:
      "You focus on long-term compound growth and calculated risk. You favor index funds, equity exposure, and time in the market over timing the market. You think in decades, not months.",
    avatarUrl: "/avatars/fin-growth.png",
    story: "Financial Advisors Board"
  },
  {
    id: "preset-fin-behavioral",
    name: "The Behavioral Coach",
    roleTitle: "Money Psychologist",
    character:
      "You address the emotional and psychological traps in financial decisions — FOMO, loss aversion, lifestyle inflation, and denial. You help people understand their relationship with money before giving tactical advice.",
    avatarUrl: "/avatars/fin-behavioral.png",
    story: "Financial Advisors Board"
  },
  {
    id: "preset-fin-entrepreneur",
    name: "The Entrepreneur",
    roleTitle: "Business Capital Advisor",
    character:
      "You evaluate financial decisions through the lens of building and scaling a business — cash flow, leverage, reinvestment, and opportunity cost. You ask: is this money working hard enough?",
    avatarUrl: "/avatars/fin-entrepreneur.png",
    story: "Financial Advisors Board"
  },
```

- [ ] **Step 5: Add Writers' Room agents**

```typescript
  {
    id: "preset-writer-architect",
    name: "The Plot Architect",
    roleTitle: "Structure Specialist",
    character:
      "You think in story structure — acts, turning points, setups and payoffs. You identify where the narrative drags, where tension is missing, and what needs to happen for the story to feel inevitable in retrospect.",
    avatarUrl: "/avatars/writer-architect.png",
    story: "Writers' Room"
  },
  {
    id: "preset-writer-psychologist",
    name: "The Character Psychologist",
    roleTitle: "Motivation Analyst",
    character:
      "You dig into character psychology — desires, fears, wounds, and contradictions. You ensure every action is believably motivated. If a character does something, you need to know exactly why.",
    avatarUrl: "/avatars/writer-psychologist.png",
    story: "Writers' Room"
  },
  {
    id: "preset-writer-worldbuilder",
    name: "The World Builder",
    roleTitle: "Setting Architect",
    character:
      "You construct consistent, vivid worlds with their own rules, history, culture, and atmosphere. You care about internal logic — what makes this world feel real and lived-in rather than decorative.",
    avatarUrl: "/avatars/writer-worldbuilder.png",
    story: "Writers' Room"
  },
  {
    id: "preset-writer-dialogue",
    name: "The Dialogue Coach",
    roleTitle: "Voice Specialist",
    character:
      "You sharpen dialogue for authenticity, subtext, and distinct character voice. You notice when characters sound identical, when exposition is clunky, and when a scene's emotion could land in fewer words.",
    avatarUrl: "/avatars/writer-dialogue.png",
    story: "Writers' Room"
  },
```

- [ ] **Step 6: Add Philosophy Circle agents**

```typescript
  {
    id: "preset-phil-rationalist",
    name: "The Rationalist",
    roleTitle: "Logic and Reason Advocate",
    character:
      "You apply formal logic and structured argument. You demand clear definitions, valid inferences, and consistent premises. You reject emotional appeals and undefined terms as unworthy of serious debate.",
    avatarUrl: "/avatars/phil-rationalist.png",
    story: "Philosophy Circle"
  },
  {
    id: "preset-phil-existentialist",
    name: "The Existentialist",
    roleTitle: "Freedom and Meaning Seeker",
    character:
      "You explore questions of freedom, responsibility, authenticity, and the absurd. You reject external authority — religious, social, or political — and push toward radical self-definition and honest confrontation with existence.",
    avatarUrl: "/avatars/phil-existentialist.png",
    story: "Philosophy Circle"
  },
  {
    id: "preset-phil-utilitarian",
    name: "The Utilitarian",
    roleTitle: "Consequentialist Analyst",
    character:
      "You evaluate every choice by its outcomes. The right action maximizes well-being and minimizes suffering for the greatest number. You are willing to follow the argument wherever it leads, even to uncomfortable conclusions.",
    avatarUrl: "/avatars/phil-utilitarian.png",
    story: "Philosophy Circle"
  },
  {
    id: "preset-phil-skeptic",
    name: "The Skeptic",
    roleTitle: "Critical Thinker",
    character:
      "You question every assumption and demand evidence. You carefully distinguish what we know from what we believe, what is certain from what is probable, and what is argued well from what merely sounds convincing.",
    avatarUrl: "/avatars/phil-skeptic.png",
    story: "Philosophy Circle"
  },
```

- [ ] **Step 7: Add Devil's Advocates and Roast Panel agents**

```typescript
  {
    id: "preset-devil-contrarian",
    name: "The Contrarian",
    roleTitle: "Opposing View Specialist",
    character:
      "You automatically take the strongest available counterposition to whatever is proposed. Your goal is to surface the best argument against the idea, not to agree. You are not negative — you are rigorous.",
    avatarUrl: "/avatars/devil-contrarian.png",
    story: "Devil's Advocates"
  },
  {
    id: "preset-devil-pessimist",
    name: "The Pessimist",
    roleTitle: "Worst-Case Analyst",
    character:
      "You explore every way this could go wrong. You are not cynical — you are honest about failure modes, base rates, and the gap between plans and reality. You ask: what happens if this doesn't work?",
    avatarUrl: "/avatars/devil-pessimist.png",
    story: "Devil's Advocates"
  },
  {
    id: "preset-devil-disruptor",
    name: "The Disruptor",
    roleTitle: "Assumption Challenger",
    character:
      "You question the premises everyone takes for granted. Why are we solving this problem? Why this approach? Why now? You force the team to defend their starting assumptions rather than just their conclusions.",
    avatarUrl: "/avatars/devil-disruptor.png",
    story: "Devil's Advocates"
  },
  {
    id: "preset-devil-realist",
    name: "The Grounded Realist",
    roleTitle: "Base-Rate Thinker",
    character:
      "You compare grand ideas to historical evidence and base rates. Most plans fail; you want to know what makes this one different. You are not discouraging — you are demanding a real answer.",
    avatarUrl: "/avatars/devil-realist.png",
    story: "Devil's Advocates"
  },
  {
    id: "preset-roast-savage",
    name: "The Savage",
    roleTitle: "Blunt Feedback Specialist",
    character:
      "You deliver brutally honest, unvarnished critique. No softening, no hedging, no sandwich feedback. If it's bad, you say exactly why — and you are specific enough that the person knows what to fix.",
    avatarUrl: "/avatars/roast-savage.png",
    story: "Roast Panel"
  },
  {
    id: "preset-roast-wit",
    name: "The Wit",
    roleTitle: "Sharp Humor Expert",
    character:
      "You skewer weak ideas with clever observation and wordplay. Your critique is funny and precise — it lands like a punchline because it is also completely true. You make the uncomfortable feel cathartic.",
    avatarUrl: "/avatars/roast-wit.png",
    story: "Roast Panel"
  },
  {
    id: "preset-roast-defender",
    name: "The Defender",
    roleTitle: "Devil's Advocate for the Idea",
    character:
      "You defend the idea being roasted. You find genuine merit, push back against unfair criticism, and ensure the roast is balanced. You are the voice that says: wait, actually this part is worth keeping.",
    avatarUrl: "/avatars/roast-defender.png",
    story: "Roast Panel"
  },
  {
    id: "preset-roast-judge",
    name: "The Judge",
    roleTitle: "Final Verdict Giver",
    character:
      "You synthesize the roast, weigh the arguments fairly, and deliver a bottom-line verdict with a score or recommendation. You are the last word: worth pursuing, needs major work, or abandon ship.",
    avatarUrl: "/avatars/roast-judge.png",
    story: "Roast Panel"
  },
```

- [ ] **Step 8: Verify the file compiles**

```bash
cd /Users/tianzhang/Projects/allpath && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to agentProfiles.ts).

- [ ] **Step 9: Commit**

```bash
git add lib/agentProfiles.ts
git commit -m "feat: enrich Historical Figures and add 6 new quick-start agent groups"
```

---

### Task 3: Add story content to `app/chat/page.tsx`

**Files:**
- Modify: `app/chat/page.tsx`

- [ ] **Step 1: Remove Meteor Garden from `QUICK_START_STORY_CONTENT` and add new entries**

In `app/chat/page.tsx`, find `QUICK_START_STORY_CONTENT` (around line 155). Remove the `"Meteor Garden (Taiwan 2001)"` entry and add the six new story entries. The full updated constant should be:

```typescript
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
```

- [ ] **Step 2: Verify the app builds**

```bash
cd /Users/tianzhang/Projects/allpath && npx next build 2>&1 | tail -20
```

Expected: successful build, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add app/chat/page.tsx
git commit -m "feat: add quick-start story content for 6 new agent groups, remove Meteor Garden"
```

---

## Feature 2: Shareable Session Links

### Task 4: Add share types to `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add `ShareableParticipant` and `ShareRecord` types**

Append to the end of `lib/types.ts`:

```typescript
// Shareable session types — API keys are always excluded
export interface ShareableParticipant {
  id: string;
  label: string;
  avatarUrl?: string;
  model: string;
  roleTitle?: string;
  character?: string;
}

export interface ShareRecord {
  shareId: string;
  createdAt: string;
  expiresAt: string;
  mode: Mode;
  title: string;
  transcript: Message[];
  agentConfig: ShareableParticipant[];
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/tianzhang/Projects/allpath && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add ShareRecord and ShareableParticipant types"
```

---

### Task 5: Create `lib/share.ts` — Firestore share operations

**Files:**
- Create: `lib/share.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/share.ts
import { randomUUID } from "crypto";
import { getFirestoreDb } from "@/lib/firestore";
import { Message, Mode, ShareableParticipant, ShareRecord } from "@/lib/types";

const SHARES_COLLECTION = "shared_sessions";
const SHARE_TTL_DAYS = 30;

function nowIso(): string {
  return new Date().toISOString();
}

function expiresAtIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + SHARE_TTL_DAYS);
  return d.toISOString();
}

function deriveTitle(transcript: Message[]): string {
  const firstUserMessage = transcript.find((m) => m.sourceRole === "user");
  const text = firstUserMessage?.content ?? "Untitled Session";
  return text.length > 80 ? text.slice(0, 77) + "…" : text;
}

export async function createShareRecord(input: {
  mode: Mode;
  transcript: Message[];
  agentConfig: ShareableParticipant[];
}): Promise<ShareRecord> {
  const db = getFirestoreDb();
  const shareId = randomUUID();
  const record: ShareRecord = {
    shareId,
    createdAt: nowIso(),
    expiresAt: expiresAtIso(),
    mode: input.mode,
    title: deriveTitle(input.transcript),
    transcript: input.transcript,
    agentConfig: input.agentConfig
  };

  await db.collection(SHARES_COLLECTION).doc(shareId).set(record);
  return record;
}

export async function getShareRecord(shareId: string): Promise<ShareRecord | null> {
  const db = getFirestoreDb();
  const doc = await db.collection(SHARES_COLLECTION).doc(shareId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as ShareRecord;

  // Treat expired shares as missing
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    return null;
  }

  return data;
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/tianzhang/Projects/allpath && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/share.ts
git commit -m "feat: add Firestore share operations (createShareRecord, getShareRecord)"
```

---

### Task 6: Create `POST /api/share` route

**Files:**
- Create: `app/api/share/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/share/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/store";
import { createShareRecord } from "@/lib/share";
import { ShareableParticipant } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  const { sessionId } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const { config } = session;
  const completedMessages = config.messages.filter((m) => m.status === "completed");

  if (completedMessages.length === 0) {
    return NextResponse.json({ error: "No completed messages to share." }, { status: 400 });
  }

  // Strip API keys from participant configs
  const agentConfig: ShareableParticipant[] = config.participants.map((p) => ({
    id: p.id,
    label: p.label,
    avatarUrl: p.avatarUrl,
    model: p.model,
    roleTitle: p.roleTitle,
    character: p.character
  }));

  const record = await createShareRecord({
    mode: config.mode,
    transcript: completedMessages,
    agentConfig
  });

  const baseUrl = process.env.OPENROUTER_SITE_URL ?? "https://all-path.com";
  const url = `${baseUrl}/share/${record.shareId}`;

  return NextResponse.json({ shareId: record.shareId, url });
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/tianzhang/Projects/allpath && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/share/route.ts
git commit -m "feat: add POST /api/share endpoint"
```

---

### Task 7: Create `GET /api/share/[id]` route

**Files:**
- Create: `app/api/share/[id]/route.ts`

- [ ] **Step 1: Create the file with its directory**

```bash
mkdir -p /Users/tianzhang/Projects/allpath/app/api/share/\[id\]
```

- [ ] **Step 2: Create the route**

```typescript
// app/api/share/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getShareRecord } from "@/lib/share";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Share ID is required." }, { status: 400 });
  }

  const record = await getShareRecord(id);

  if (!record) {
    return NextResponse.json({ error: "Share not found or expired." }, { status: 404 });
  }

  return NextResponse.json(record);
}
```

- [ ] **Step 3: Verify types compile**

```bash
cd /Users/tianzhang/Projects/allpath && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/share/\[id\]/route.ts
git commit -m "feat: add GET /api/share/[id] endpoint"
```

---

### Task 8: Extend `POST /api/session` to accept `initialMessages`

**Files:**
- Modify: `app/api/session/route.ts`

This allows the chat page to create a session pre-loaded with the shared transcript, so users genuinely "start from the sharing point."

- [ ] **Step 1: Update the POST handler**

In `app/api/session/route.ts`, update the body type and session config:

```typescript
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/store";
import { Message, Mode, ParticipantConfig, SessionConfig } from "@/lib/types";
import { getGuestFromCookie } from "@/lib/trial";
import { DEFAULT_SESSION_RULES } from "@/lib/userPreferences";

const DEFAULT_AGENT_INITIAL_PROMPT = DEFAULT_SESSION_RULES;

function validateParticipant(raw: unknown): raw is ParticipantConfig {
  if (!raw || typeof raw !== "object") {
    return false;
  }

  const value = raw as Record<string, unknown>;
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    (typeof value.avatarUrl === "undefined" || typeof value.avatarUrl === "string") &&
    typeof value.model === "string" &&
    (typeof value.muted === "undefined" || typeof value.muted === "boolean") &&
    !!value.provider &&
    typeof (value.provider as Record<string, unknown>).type === "string" &&
    typeof (value.provider as Record<string, unknown>).apiKey === "string"
  );
}

function isValidMessage(raw: unknown): raw is Message {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as Record<string, unknown>;
  return (
    typeof m.messageId === "string" &&
    typeof m.sourceRole === "string" &&
    typeof m.sourceLabel === "string" &&
    typeof m.content === "string"
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    participants?: unknown[];
    summarizer?: unknown;
    agentInitialPrompt?: unknown;
    globalApiKey?: unknown;
    mode?: unknown;
    initialMessages?: unknown[];
  };

  const participants = (body.participants ?? []).filter(validateParticipant);

  if (participants.length < 2) {
    return NextResponse.json({ error: "At least two participants are required." }, { status: 400 });
  }

  const summarizer = validateParticipant(body.summarizer) ? body.summarizer : undefined;
  const guest = await getGuestFromCookie();

  const requiresServerOpenRouterAccess = [...participants, ...(summarizer ? [summarizer] : [])].some(
    (item) =>
      item.provider.type === "openrouter" &&
      !item.provider.apiKey.trim() &&
      !(typeof body.globalApiKey === "string" && body.globalApiKey.trim().length > 0)
  );

  if (requiresServerOpenRouterAccess && !guest) {
    return NextResponse.json(
      { error: "Redeem an invite code or provide your own OpenRouter API key first.", code: "trial_invite_required" },
      { status: 401 }
    );
  }

  const mode: Mode = body.mode === "one_to_one" ? "one_to_one" : "roundtable";

  const initialMessages: Message[] = Array.isArray(body.initialMessages)
    ? body.initialMessages.filter(isValidMessage)
    : [];

  const session: SessionConfig = {
    sessionId: randomUUID(),
    mode,
    agentInitialPrompt:
      typeof body.agentInitialPrompt === "string" && body.agentInitialPrompt.trim().length > 0
        ? body.agentInitialPrompt.trim()
        : DEFAULT_AGENT_INITIAL_PROMPT,
    globalApiKey:
      typeof body.globalApiKey === "string" && body.globalApiKey.trim().length > 0
        ? body.globalApiKey.trim()
        : undefined,
    trialGuestId: guest?.guestId,
    participants,
    summarizer,
    roundNumber: initialMessages.length > 0 ? Math.max(...initialMessages.map((m) => m.roundId), 0) : 0,
    status: "idle",
    messages: initialMessages
  };

  createSession(session);

  return NextResponse.json({
    sessionId: session.sessionId,
    mode: session.mode,
    status: session.status,
    roundNumber: session.roundNumber
  });
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/tianzhang/Projects/allpath && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/session/route.ts
git commit -m "feat: extend POST /api/session to accept initialMessages for share fork"
```

---

### Task 9: Create the share page `app/share/[id]/page.tsx`

**Files:**
- Create: `app/share/[id]/page.tsx`

This is a server component (RSC). It fetches the share record at render time for SEO and social preview, then renders a read-only transcript.

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /Users/tianzhang/Projects/allpath/app/share/\[id\]
```

- [ ] **Step 2: Create `StartFromHereButton.tsx` as a client component**

```typescript
// app/share/[id]/StartFromHereButton.tsx
"use client";

import { useRouter } from "next/navigation";

export function StartFromHereButton({ shareId }: { shareId: string }) {
  const router = useRouter();

  function handleClick() {
    sessionStorage.setItem("allpath-from-share-id", shareId);
    router.push("/chat");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
    >
      Start from here with this team →
    </button>
  );
}
```

- [ ] **Step 4: Create the page**

```typescript
// app/share/[id]/page.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getShareRecord } from "@/lib/share";
import { Message, ShareRecord, ShareableParticipant } from "@/lib/types";
import { StartFromHereButton } from "./StartFromHereButton";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getShareRecord(id);
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
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
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

// StartFromHereButton is imported from StartFromHereButton.tsx (client component)

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const record = await getShareRecord(id);

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
          <p className="mt-1 text-sm text-slate-500 capitalize">{record.mode.replace("_", " ")} · {record.transcript.length} messages</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {record.agentConfig.map((agent) => (
              <div key={agent.id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
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
          <p className="mt-1 text-sm text-slate-500">Start your own session with the same team, picking up where this left off.</p>
          <div className="mt-4 flex justify-center">
            <StartFromHereButton shareId={record.shareId} />
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Verify types compile**

```bash
cd /Users/tianzhang/Projects/allpath && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/share/\[id\]/page.tsx app/share/\[id\]/StartFromHereButton.tsx
git commit -m "feat: add server-rendered share page and StartFromHereButton client component"
```

---

### Task 10: Add Share button and "from share" handling to `app/chat/page.tsx`

**Files:**
- Modify: `app/chat/page.tsx`

- [ ] **Step 1: Add localStorage constant for share links**

Near the top of `app/chat/page.tsx` where the other storage key constants are defined (around line 23), add:

```typescript
const SHARE_LINKS_STORAGE_KEY = "allpath-share-links";
```

- [ ] **Step 2: Add share state variables**

In the component's state declarations section, add:
```typescript
const [shareUrl, setShareUrl] = useState<string | null>(null);
const [isSharing, setIsSharing] = useState(false);
```

- [ ] **Step 3: Add `handleShare` function**

Add this function near the other async session functions (e.g. after `quickStartStorySession`):

```typescript
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
    // Save to localStorage
    try {
      const stored = JSON.parse(localStorage.getItem(SHARE_LINKS_STORAGE_KEY) ?? "{}") as Record<string, { shareId: string; url: string; createdAt: string }>;
      stored[sessionId] = { shareId: data.shareId, url: data.url, createdAt: new Date().toISOString() };
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
```

- [ ] **Step 4: Add "from share" session restoration on mount**

Find the `useEffect` that runs on component mount (the one that loads from `localStorage` — search for `ACTIVE_SESSION_STORAGE_KEY`). Add the following at the **start** of that effect (before the existing localStorage reads), to check sessionStorage for a pending share:

```typescript
// Restore from shared session if redirected from /share/[id]
const fromShareId = typeof window !== "undefined"
  ? sessionStorage.getItem("allpath-from-share-id")
  : null;
if (fromShareId) {
  sessionStorage.removeItem("allpath-from-share-id");
  void (async () => {
    try {
      const res = await fetch(`/api/share/${fromShareId}`);
      if (!res.ok) return;
      const record = (await res.json()) as {
        mode: string;
        agentConfig: Array<{ id: string; label: string; avatarUrl?: string; model: string; roleTitle?: string; character?: string }>;
        transcript: Message[];
      };
      // Build ParticipantForm array directly from share agent config
      const preloadedParticipants: ParticipantForm[] = record.agentConfig.map((agent, index) => ({
        ...defaultParticipant(`share-${agent.id}-${index}`, agent.label),
        avatarUrl: agent.avatarUrl ?? "",
        roleTitle: agent.roleTitle ?? "",
        character: agent.character ?? "",
        model: quickStartModel || "openai/gpt-5-mini"
      }));
      setParticipants(preloadedParticipants);
      // Create session immediately with pre-loaded transcript
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
}
```

- [ ] **Step 5: Update `createSessionFromParticipants` to accept `initialMessages`**

Find the `createSessionFromParticipants` function (search for `async function createSessionFromParticipants`). Add `initialMessages?: Message[]` to its parameter object and pass it to the fetch body:

In the function signature, add `initialMessages?: Message[]` to the destructured params object.

In the `fetch("/api/session", ...)` call's body JSON, add:
```typescript
initialMessages: initialMessages ?? undefined
```

- [ ] **Step 6: Add Share button in the chat header**

Find the chat panel header area (search for `"Back to Setup"` or the chat header div). Add the Share button next to existing header actions:

```tsx
{sessionId && groupedMessages.some((m) => m.sourceRole !== "user" && m.status === "completed") && (
  <div className="relative">
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
        <button
          type="button"
          className="mt-2 text-xs text-indigo-600 hover:underline"
          onClick={() => void navigator.clipboard.writeText(shareUrl)}
        >
          Copy again
        </button>
        <button
          type="button"
          className="ml-3 mt-2 text-xs text-slate-400 hover:underline"
          onClick={() => setShareUrl(null)}
        >
          Dismiss
        </button>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 7: Verify build**

```bash
cd /Users/tianzhang/Projects/allpath && npx next build 2>&1 | tail -30
```

Expected: successful build with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add app/chat/page.tsx
git commit -m "feat: add Share button, share link popover, and from-share session restoration"
```

---

### Task 11: Configure Firestore TTL for 30-day auto-expiry

The `shared_sessions` collection uses an `expiresAt` field. Firestore TTL policies must be configured in GCP console or via `gcloud`.

- [ ] **Step 1: Set the TTL policy (run once after first deploy)**

After deploying to Cloud Run, run:

```bash
gcloud firestore fields ttls update expiresAt \
  --collection-group=shared_sessions \
  --enable-ttl \
  --project=YOUR_PROJECT_ID
```

Replace `YOUR_PROJECT_ID` with your GCP project ID.

Expected output: TTL policy applied to `shared_sessions.expiresAt`.

Note: TTL deletion happens within 72 hours of the `expiresAt` timestamp (GCP SLA). The app also enforces expiry in `getShareRecord` for real-time accuracy.

---

### Task 12: Final verification and push

- [ ] **Step 1: Full build check**

```bash
cd /Users/tianzhang/Projects/allpath && npx next build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 2: Manual smoke test (local dev)**

```bash
cd /Users/tianzhang/Projects/allpath && npm run dev
```

1. Open http://localhost:3000/chat
2. Start a Quick Start session with "Life Coaches Panel" — verify 4 agents appear, tagline and prompts show
3. Verify "Historical Figures" shows new agents (Marie Curie, Sun Tzu, etc.)
4. Verify "Meteor Garden" no longer appears
5. Send a message, wait for responses, click "Share" button
6. Verify share URL copied to clipboard
7. Open the share URL — verify read-only transcript renders
8. Click "Start from here" — verify redirected to /chat with agents pre-configured

- [ ] **Step 3: Push branch**

```bash
git push -u origin feature/onboarding-and-sharing
```

- [ ] **Step 4: Open PR**

```bash
gh pr create \
  --title "feat: quick-start group overhaul + shareable session links" \
  --body "Adds 6 new agent group categories (Life Coaches, Financial Advisors, Writers Room, Philosophy Circle, Devil's Advocates, Roast Panel), enriches Historical Figures with 5 new agents, removes Meteor Garden, and adds a shareable session link feature with a public read-only transcript page and 'Start from here' flow."
```
