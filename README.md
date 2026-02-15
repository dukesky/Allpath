# AllPath MVP

AllPath is a multi-agent chat prototype where one user coordinates multiple LLM agents in a shared Round Table discussion.

## MVP Scope

This version focuses on a practical first release:

- Round Table orchestration (sequential multi-agent turns)
- OpenRouter + custom OpenAI-compatible provider support
- Real-time token streaming to UI via SSE
- Optional manual Summarizer role
- Model picker with quick chips + expanded list + price tags (`$`, `$$`, `$$$`)
- On startup, model options auto-fetch from OpenRouter (filtered to 2025-03+); fallback to bundled defaults if fetch fails
- Agent Personality Studio (`/agents`) for reusable role/personality profiles
- In-memory session state (no auth, no database yet)

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- React 19
- Tailwind CSS

## Project Structure

- `app/page.tsx`: main chat + session setup UI
- `app/agents/page.tsx`: personality/role profile editor
- `app/api/session/route.ts`: create session
- `app/api/session/[id]/message/route.ts`: post user message and trigger orchestration
- `app/api/session/[id]/stream/route.ts`: SSE stream endpoint
- `app/api/session/[id]/summarize/route.ts`: manual summarizer trigger
- `app/api/models/route.ts`: provider model list helper
- `lib/orchestrator.ts`: multi-agent round execution + summarizer execution
- `lib/providers.ts`: provider adapter layer (OpenRouter/custom)
- `lib/store.ts`: in-memory session/message store
- `lib/modelCatalog.ts`: featured model presets + price tiers
- `lib/types.ts`: shared types

## How It Works

1. Create a session with at least 2 participants.
2. Each participant has its own model, provider, API key, role title, and personality prompt.
3. User sends a message.
4. Orchestrator runs participant turns sequentially (Round Table).
5. Tokens stream to frontend as SSE events.
6. Optional Summarizer can be triggered manually.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open: `http://localhost:3000`

## Environment Variables

```bash
OPENROUTER_API_KEY=
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=AllPath MVP
```

Notes:

- Participant-level API keys entered in UI are used for live calls.
- Global `OPENROUTER_API_KEY` is an optional fallback for model listing or default routing.

## Current Limitations

- Only Round Table mode is implemented.
- No persistence across server restarts.
- No auth/account system.
- No full cost/rate dashboard yet.

## Next Milestones

- Budget controls and retry policy UI
- Additional modes (Casual Chat / One-to-One Adviser)
- Session persistence and export
- Usage telemetry dashboard
