# AllPath MVP

AllPath is a multi-agent chat prototype where one user coordinates multiple LLM agents in a shared Round Table discussion.

Current release version: `0.0.15`

Production URL: `https://all-path.com`

## MVP Scope

This version focuses on a practical first release:

- Round Table orchestration (sequential multi-agent turns)
- OpenRouter + custom OpenAI-compatible provider support
- Real-time token streaming to UI via SSE
- Optional manual Summarizer role
- Model picker with quick chips + expanded list + price tags (`$`, `$$`, `$$$`)
- On startup, model options auto-fetch from OpenRouter (filtered to 2025-03+); fallback to bundled defaults if fetch fails
- Agent Personality Studio (`/agents`) for reusable role/personality profiles
- Guest trial mode with invite-code redemption and server-funded starter budget
- In-memory session state for chats; Firestore-backed guest trial persistence

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
- `app/api/trial/*`: guest trial redemption/status/personal-key endpoints
- `lib/orchestrator.ts`: multi-agent round execution + summarizer execution
- `lib/providers.ts`: provider adapter layer (OpenRouter/custom)
- `lib/store.ts`: in-memory session/message store
- `lib/modelCatalog.ts`: featured model presets + price tiers
- `lib/trial.ts`: guest trial, Firestore persistence, and server-side OpenRouter access resolution
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

Production: `https://all-path.com`

## Environment Variables

```bash
OPENROUTER_API_KEY=
TRIAL_COOKIE_SECRET=
TRIAL_ENCRYPTION_SECRET=
FIRESTORE_DATABASE_ID=
OPENROUTER_SITE_URL=https://all-path.com
OPENROUTER_APP_NAME=AllPath MVP
```

Notes:

- Participant-level API keys entered in UI are used for live calls.
- Global `OPENROUTER_API_KEY` is an optional fallback for model listing or default routing.
- Guest-trial mode uses server-side OpenRouter access plus Firestore persistence.
- Cloud Run should have default Google credentials to access Firestore.

## Guest Trial Setup

Production guest-trial flow depends on Firestore plus three server secrets:

- `OPENROUTER_API_KEY`
- `TRIAL_COOKIE_SECRET`
- `TRIAL_ENCRYPTION_SECRET`
- `FIRESTORE_DATABASE_ID` when your Firestore database is not `(default)`

### 1. Enable Firestore

In GCP:

1. Open Firestore in your `allpath` project.
2. Create the database in Native mode.
3. Use the same region as Cloud Run if possible.
4. Ensure the Cloud Run runtime service account has Firestore access.

Suggested IAM role for the runtime service account:

- `Cloud Datastore User`

### 2. Configure Cloud Run env vars

Set these on the deployed service:

```bash
OPENROUTER_API_KEY=...
TRIAL_COOKIE_SECRET=...long-random-secret...
TRIAL_ENCRYPTION_SECRET=...long-random-secret...
FIRESTORE_DATABASE_ID=default
OPENROUTER_SITE_URL=https://all-path.com
OPENROUTER_APP_NAME=AllPath
```

### 3. Initialize invite codes

The app reads invite codes from Firestore collection `trial_invite_codes`.

You can upsert one with:

```bash
INVITE_CODE=myfriends \
INVITE_LABEL="Friends Trial" \
TRIAL_BUDGET_USD=2 \
FIRESTORE_DATABASE_ID=default \
npm run trial:invite:init
```

Optional env vars for the script:

- `GOOGLE_CLOUD_PROJECT`
- `GCLOUD_PROJECT`
- `FIRESTORE_DATABASE_ID`
- `INVITE_ENABLED=false` to disable a code

The script requires Google credentials locally. The simplest local setup is:

```bash
gcloud auth application-default login
gcloud config set project allpath
export GOOGLE_CLOUD_PROJECT=allpath
```

If you want to rotate or disable a code later, rerun the same command with the same `INVITE_CODE`.

### 4. Firestore collections used by the app

- `trial_invite_codes`
- `trial_guests`

Invite code documents use the invite code itself as the document ID and store:

- `code`
- `enabled`
- `label`
- `trialBudgetUsd`
- `redeemedCount`
- `createdAt`
- `updatedAt`

Guest documents are created automatically on successful redemption.

## Model Catalog Updates

- The app fetches live models from OpenRouter at runtime via `/api/models`.
- Static fallback list is now generated from `lib/generated/openrouterModels.json`.
- Manual refresh command:

```bash
npm run models:update
```

- Automatic refresh:
  - GitHub Actions workflow: `.github/workflows/update-model-catalog.yml`
  - Runs on every push to `main`, on manual trigger, and every 12 hours.
  - Commits updates automatically when OpenRouter model list changes.
  - Recommended repo secret: `OPENROUTER_API_KEY`

## Current Limitations

- Only Round Table mode is implemented.
- No persistence across server restarts.
- No auth/account system.
- No full cost/rate dashboard yet.

## Deploy to GCP (Cloud Run)

Project defaults used in this repo:

- Project: `allpath`
- Region: `us-central1`
- Service: `allpath-web`

Quick deploy:

```bash
export GCLOUD_BIN=/opt/homebrew/share/google-cloud-sdk/bin/gcloud
export CLOUDSDK_CONFIG=$PWD/.gcloud
export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3

$GCLOUD_BIN auth login --no-launch-browser
$GCLOUD_BIN auth application-default login --no-launch-browser

./deploy.sh
```

Deployment artifacts:

- `Dockerfile`
- `cloudbuild.yaml`
- `deploy.sh`

## Next Milestones

- Budget controls and retry policy UI
- Additional modes (Casual Chat / One-to-One Adviser)
- Session persistence and export
- Usage telemetry dashboard

## Version Logs

- Release notes are stored in `release_notes/`.
- Naming format: `version.x.x.x_YYYY-MM-DD.md`
