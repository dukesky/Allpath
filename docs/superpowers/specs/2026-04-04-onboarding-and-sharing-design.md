# Allpath: Quick-Start Groups Overhaul + Shareable Sessions

**Date:** 2026-04-04  
**Status:** Approved  
**Branch:** feature/onboarding-and-sharing

---

## Overview

Two features that work together: richer quick-start agent groups lower the barrier for new users to find something worth discussing, and shareable session links give those users a reason to spread Allpath virally. Neither requires user auth.

---

## Feature 1: Quick-Start Groups Overhaul

### What changes

**Remove:** Meteor Garden (too niche, low appeal to broad audience)

**Enrich: Historical Figures**
Expand from current set to include more diverse, globally recognizable figures:
- Cleopatra, Isaac Newton, Marie Curie, Albert Einstein, Confucius, Martin Luther King Jr., Leonardo da Vinci, Sun Tzu, Ada Lovelace, Nikola Tesla
- Each gets a distinct roleTitle and character that reflects their known worldview and communication style

**Add 4 new story categories**, each with 2–3 preset agent groups:

| Category | Groups (examples) |
|---|---|
| Life & Decisions | "Life Coaches Panel", "Financial Advisors Board" |
| Creative & Storytelling | "Writers' Room", "Dungeon Masters Guild" |
| Academic / Debate | "Philosophy Circle", "Science Roundtable" |
| Fun & Chaos | "Devil's Advocates", "Roast Panel" |

### Suggested starter prompts

Each group gets 2–3 starter prompt chips shown in the chat empty state. Example for "Financial Advisors Board": "Should I invest in index funds or real estate?", "Help me evaluate this business plan", "What should I do with my first $10k?"

### Implementation

All changes live in `lib/agentProfiles.ts` following the existing `AgentStory` pattern. No schema changes needed. The chat page already reads stories and renders the quick-start grid — new categories will appear automatically.

Suggested prompts require a new optional `suggestedPrompts: string[]` field on each story/group, and the chat UI needs to render them as clickable chips that populate the message input.

---

## Feature 2: Shareable Session Links

### User flow

1. User has an active chat session they want to share
2. They click a **"Share"** button in the chat header
3. Client calls `POST /api/share` → server strips API keys, persists transcript + agent config to Firestore → returns a `shareId` (UUID v4)
4. Share URL (`https://all-path.com/share/{shareId}`) is copied to clipboard
5. Share ID is saved in localStorage under the session so the sharer can revisit

**Viewer experience:**
1. Opens `https://all-path.com/share/{shareId}`
2. Sees a server-rendered read-only transcript page with agent avatars, names, and full conversation
3. Sees a prominent **"Start from here"** CTA button
4. Clicks → navigates to `/chat` with the share config encoded (same agents + transcript as starting context)

### Data model

New Firestore collection: `shared_sessions`

```
shareId: string (UUID v4, document ID)
createdAt: ISO timestamp
expiresAt: ISO timestamp (createdAt + 30 days) — used for Firestore TTL
mode: "roundtable" | "one_to_one"
title: string (first user message, truncated to 80 chars, or "Untitled Session")
transcript: Message[] (full messages array)
agentConfig: ParticipantConfig[] (API keys stripped — apiKey field omitted)
```

Firestore TTL policy set on the `expiresAt` field for automatic 30-day cleanup.

### API routes

- `POST /api/share` — validates active session exists, strips API keys, writes to Firestore, returns `{ shareId, url }`
- `GET /api/share/[id]` — fetches share document, returns 404 if expired/missing

### Share page

`app/share/[id]/page.tsx` — server component (Next.js RSC)
- Fetches share data server-side for SEO and Open Graph meta tags
- OG title: session title; OG description: agent names + round count
- Read-only transcript rendered with agent avatars and round markers
- "Start from here" button passes share config to `/chat` via URL param or sessionStorage

### Security

- Share IDs are UUID v4 (unguessable 122-bit entropy) — no auth needed
- API keys are never written to Firestore (stripped in `POST /api/share`)
- No PII stored beyond what the user typed in their session
- Share links are public (anyone with the link can view) — no access controls in v1

### localStorage

New key: `allpath-share-links` — map of `sessionId → { shareId, url, createdAt }`
Shown in the chat sidebar or session list so the sharer can copy the link again later.

---

## Out of scope

- User auth / account system (future milestone)
- Share management UI (delete/revoke links) — no auth means no ownership model yet
- Live/collaborative sessions (viewers interact in real time)
- Session persistence beyond sharing (full history browsing)

---

## Success criteria

- New users landing on a share page can start their own session in ≤ 2 clicks
- Quick-start grid has at least 6 categories with compelling group names and starter prompts
- Share link generation works in < 2 seconds
- Shared sessions are not accessible after 30 days
