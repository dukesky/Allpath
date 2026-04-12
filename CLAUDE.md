# Allpath Project

Allpath is a multi-agent AI discussion platform at **all-path.com**, deployed on GCP Cloud Run. Users configure a panel of AI agents (each backed by any OpenRouter model or custom OpenAI-compatible endpoint) and chat with all agents simultaneously in two modes: **roundtable** (all agents see all messages) and **one_to_one** (each agent only sees user messages, not other agents' replies).

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Google Cloud Firestore, OpenRouter API

## Architecture

```
Browser (SPA in app/chat/page.tsx)
  → POST /api/session                    — creates in-memory session
  → POST /api/session/[id]/message       — enqueues user message
  → GET  /api/session/[id]/stream        — SSE stream for live updates
  → POST /api/session/[id]/summarize     — triggers manual summarizer
  → POST /api/session/[id]/mode          — switch roundtable/one_to_one
  → POST /api/session/[id]/participant   — mute/unmute participants
  → POST /api/share                      — save snapshot to Firestore
  → GET  /share/[id]                     — view shared transcript
  → GET/POST /api/trial/*                — invite code + guest trial management
```

**In-memory store** (`lib/store.ts`): Sessions live in `globalThis.__allpathSessions` (a `Map<sessionId, InternalSessionState>`). Each session holds config, messages, SSE subscribers, and a message queue. State is **ephemeral** — lost on server restart.

**Orchestrator** (`lib/orchestrator.ts`): `processSessionQueue()` runs one round at a time. Each participant gets their own LLM call via `runParticipantTurn()`. Output is sanitized by `sanitizeAgentOutput()` to strip model self-labeling artifacts.

**Providers** (`lib/providers.ts`): Two adapters — `openrouter` and `custom` (any OpenAI-compatible `baseUrl`). Both stream via SSE and yield `ProviderStreamEvent` (delta | usage | generation).

## Key Types (`lib/types.ts`)

| Type | Purpose |
|------|---------|
| `SessionConfig` | Full session state: participants, mode, messages, status |
| `ParticipantConfig` | id, label, model, provider (apiKey + type), roleTitle, character |
| `Message` | messageId, roundId, sourceRole (user/assistant/summarizer), content, status |
| `Mode` | `"roundtable"` \| `"one_to_one"` |
| `ProviderConfig` | type ("openrouter"\|"custom"), apiKey, baseUrl? |
| `StreamEvent` | SSE event types: session_state, message_created, message_delta, message_updated, message_removed, round_completed, server_error |

## Key Files

| File | Role |
|------|------|
| `app/chat/page.tsx` | Main UI — session config, agent panel, message feed, all client state |
| `app/chat/ModelPicker.tsx` | Model selector UI component |
| `lib/orchestrator.ts` | Multi-agent turn execution + prompt building |
| `lib/store.ts` | In-memory session store + pub/sub |
| `lib/providers.ts` | OpenRouter + custom LLM adapters |
| `lib/types.ts` | All shared TypeScript interfaces |
| `lib/agentProfiles.ts` | 40+ preset agent personas (Journey to the West, Historical Figures, Dragon Ball, etc.) |
| `lib/modelCatalog.ts` | Featured/more model lists, price tiers, generated OpenRouter catalog |
| `lib/trial.ts` | Guest trial system: invite codes, budget tracking, provider resolution |
| `lib/trialCrypto.ts` | Cookie signing (HMAC) + secret encryption (AES-GCM) for trial |
| `lib/firestore.ts` | Firestore singleton (used for share records + trial data only) |
| `lib/share.ts` | Share record creation/retrieval |
| `lib/userPreferences.ts` | localStorage prefs: globalApiKey, prompt presets |

## Trial System

Three funding paths resolved in `trial.ts::resolveOpenRouterProviderForSession()`:
1. **client** — participant has explicit apiKey or session has globalApiKey
2. **guest_personal** — guest saved their own OpenRouter key (AES-GCM encrypted in Firestore)
3. **owner_trial** — guest has active trial budget; server's `OPENROUTER_API_KEY` is used; cost tracked per-call via Firestore transaction

Budget default: **$2 USD** per guest. Collections: `trial_guests`, `trial_invite_codes`.

## Env Vars (`.env.local`)

```
OPENROUTER_API_KEY=           # Owner-funded trial key
TRIAL_COOKIE_SECRET=          # HMAC signing for guest cookie
TRIAL_ENCRYPTION_SECRET=      # AES-GCM for stored API keys
FIRESTORE_DATABASE_ID=        # Firestore DB (empty = default)
OPENROUTER_SITE_URL=https://all-path.com
OPENROUTER_APP_NAME=AllPath MVP
```

## Dev Commands

```bash
npm run dev            # Local dev server (port 3000)
npm run build          # Production build
npm run lint           # ESLint
npm run models:update  # Refresh lib/generated/openrouterModels.json from OpenRouter API
```

## Prompt System

`orchestrator.ts::buildPromptForParticipant()` builds each agent's call:
- **System prompt**: agent's role, model ID, full participant roster, rules (no self-labeling, no imitating other agents)
- **User messages**: session context + full conversation transcript + current user request
- `agentInitialPrompt` (custom session rules) appended to system prompt

Default rules (`lib/userPreferences.ts::DEFAULT_SESSION_RULES`): speak only for yourself, no formatting mimicry, no bracket tags.

## Session Status Flow

`idle` → `running` (processing round) → `waiting` → `running` (next round) → ...

## LocalStorage Keys

```
allpath-agent-profiles      allpath-agent-stories
allpath-session-list        allpath-active-session
allpath-share-links         allpath-user-preferences
```
