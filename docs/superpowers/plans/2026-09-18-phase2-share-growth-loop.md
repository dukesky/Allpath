# Phase 2: Share Growth Loop — Implementation Spec

**Goal:** Turn shared conversations into a working acquisition funnel: a visitor who
opens a share link can start chatting with that team, a signed-in user can export a
session, and the landing page shows real multi-agent debates.

**Process:** planner (main agent) → coding agent → evaluator agent → iterate until
every acceptance criterion passes. Tasks run sequentially: A → B → C.

## Global Constraints (apply to every task)

- **Do not commit, push, or deploy.** The main agent commits after evaluation passes.
- `npm test` (vitest) and `npm run build` must pass.
- Guest flow and the existing non-share chat flow must behave exactly as before.
- Auth is optional (Firebase env vars may be absent) — never make a feature depend on sign-in.
- Never persist or expose API keys (`provider.apiKey`, `globalApiKey`) — not in Firestore, SSE, share records, exports, or logs.
- **The landing page `/` must stay statically rendered** (`○` in `next build` output). The
  Cloud Build container has no GCP credentials; any server-side Firestore call during
  build/prerender hangs the build (see commit 06f9f6b). Anything Firestore-backed on `/`
  must be fetched client-side.
- **No new Firestore composite indexes.** Single-field equality queries only; sort in memory.
- Match existing style: Tailwind utility classes, no new UI libraries, same visual language
  as surrounding components. User-facing copy in English (the app UI is English, with a few
  existing Chinese setup-step labels — leave those as is).
- Dev server: `preview_start` with name `allpath-dev` → `http://localhost:3001`.
- **Firestore is production** (project `allpath`, database `default`) — local dev reads and
  writes the live database. Any test data must be created through real API paths and
  deleted afterwards.

### Creating a test share without LLM calls
`POST /api/session` with participants that carry a non-empty dummy `provider.apiKey`
(e.g. `"sk-test-eval"`, so no trial is needed) plus `initialMessages` with
`status: "completed"`, then `POST /api/share {sessionId}` → returns `shareId`.
Delete afterwards: Firestore doc `shared_sessions/{shareId}` (e.g. a small node script
using `@google-cloud/firestore`, which picks up ADC credentials; `GOOGLE_CLOUD_PROJECT=allpath`).

---

## Task A — Share → chat conversion

### Current behaviour (read before changing)
- `app/share/[id]/StartFromHereButton.tsx` writes `sessionStorage["allpath-from-share-id"]`
  and routes to `/chat`.
- `app/chat/page.tsx` mount effect (~line 203) reads that key, fetches `/api/share/{id}`,
  builds participants and calls `createSessionFromParticipants({... initialMessages: transcript})`.

### Defects to fix
1. **Models dropped** — every forked participant gets `quickStartModel`; each agent's
   original `model` from `agentConfig` is ignored.
2. **Trial status never fetched** on the share path — the branch `return`s before
   `fetchTrialStatus()` and before `hasPendingActiveSessionRestoreRef.current = true`.
3. **New visitors dead-end** — the share link's target audience usually has no invite
   code or key; `POST /api/session` returns 401 `trial_invite_required`, the session is not
   created, and the fork intent (and transcript) is lost.
4. **Expired/missing share fails silently** (`if (!res.ok) return;`).

### New behaviour
- **Two intents.** Share page offers:
  - Primary CTA **"Ask this team your own question"** → `intent: "fresh"`: same team, no transcript.
  - Secondary CTA **"Continue this conversation"** → `intent: "continue"`: same team + transcript.
  - Both CTAs appear in the top card and in the bottom CTA block.
- Intent is handed to `/chat` via sessionStorage as JSON `{ shareId, intent }` under a new
  key. The old key `allpath-from-share-id` must still work (treated as `continue`).
- **Pending fork.** The sessionStorage entry is removed only after the fork succeeds or the
  user dismisses it — so it survives a page reload (e.g. redirect-based Google sign-in).
- When the fork cannot start because of access (`POST /api/session` error `code` starting
  with `trial_`): preload the team into the setup `participants` state, and show a
  **shared-team banner** — team avatars + names, text telling the visitor to redeem an
  invite code, add an API key, or sign in — with a **Start** button that retries the fork
  and a dismiss control. The banner must be visible without extra navigation on both
  desktop and mobile (the setup panel is the default mobile view). After a successful
  invite redeem, the pending fork retries automatically.

### Acceptance criteria
- **A1** Share page shows both CTAs (top card and bottom block); fresh is visually primary.
- **A2** Fresh intent creates a session whose participants keep each agent's original
  `model`, `label`, `avatarUrl`, `roleTitle`, `character`; mode preserved; no initial messages.
- **A3** Continue intent does the same and imports the transcript.
- **A4** The legacy `allpath-from-share-id` key still works as `continue`.
- **A5** `/api/trial/status` is requested on mount even when arriving from a share.
- **A6** Without access: team preloaded into setup, banner visible, intent + transcript kept;
  **Start** retries; successful redeem auto-retries; dismiss clears the pending fork.
- **A7** Pending fork survives a full page reload until it succeeds or is dismissed.
- **A8** Expired or unknown share id → visible error, no crash; the pending entry is cleared.
- **A9** Non-share chat flow unchanged (quick start still works, active-session restore still works).

---

## Task B — Export session as Markdown

- **B1** Pure function `sessionToMarkdown(input)` in `lib/exportMarkdown.ts`, covered by
  vitest tests in `lib/exportMarkdown.test.ts`. Input: `{ title, mode, exportedAt, members,
  messages }` (members: label, roleTitle?, model?).
- **B2** Output shape:
  - `# {title}`
  - metadata lines: exported date, mode (`Round table` / `One-to-one`), number of rounds
  - participants list: `- **{label}** — {roleTitle} · {model}` (omit missing parts cleanly)
  - `## Round {n}` per round (ascending), then per message a `### You` or `### {label}`
    heading; summarizer messages as `### {label} (Summary)`
  - message content verbatim
  - attachments listed as `📎 {name}` lines — never their data
  - `streaming` messages excluded; `failed` messages included with a `_(failed)_` marker
- **B3** **Export** button in `ChatHeader` next to **Share**, shown under the same condition
  (session has ≥1 completed non-user message); downloads
  `allpath-{slug}-{YYYY-MM-DD}.md` client-side (Blob + object URL). Slug derives from the
  title, ASCII-safe, falls back to `session`.
- **B4** Title: the current session's sidebar title, else the first user message (truncated),
  else `AllPath session`.
- **B5** No server round-trip; no API keys in output.
- **B6** *(added by planner after round 1)* The export ends with a `---` rule followed by
  exactly `_Exported from [AllPath](https://all-path.com) — where many minds find one path._`,
  appearing once, as the last line. There must be a blank line before `---` so it is not read
  as a setext heading underline.
- *Accepted scope change:* `lib/store.ts` `toClientParticipant` now includes `roleTitle` in
  client-facing participant payloads (needed so exported participant lines show roles). It
  must still never include `provider`/`apiKey`.

---

## Task C — Featured conversations on the landing page

- **C1** `lib/share.ts`: `getFeaturedShares(limit = 3)` — query `shared_sessions` with
  `where("featured", "==", true).limit(20)`, sort in memory by `featuredAt` desc, return
  summaries. `getShareRecord` must not treat featured records as expired.
- **C2** `GET /api/share/featured` → `{ shares: FeaturedShareSummary[] }` where a summary is
  `{ shareId, title, mode, messageCount, agents: [{ label, avatarUrl?, roleTitle? }], excerpt }`
  (excerpt ≈ 160 chars from the first completed non-user message). No full transcript.
  `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. On Firestore error:
  log it and return `200 { shares: [] }`.
- **C3** Landing page section rendered by a client component that fetches
  `/api/share/featured` after mount; up to 3 cards linking to `/share/{shareId}` (title,
  agent avatars, message count, excerpt). Renders **nothing** when the list is empty or the
  fetch fails. `/` stays `○` (static) in the build output.
- **C4** `scripts/feature-share.mjs` + npm script `share:feature`:
  `SHARE_ID=<id> npm run share:feature` sets `featured: true, featuredAt: <now>`;
  `UNFEATURE=true` removes both fields. Fails clearly if the doc does not exist. Follows the
  pattern of `scripts/init-trial-invite-code.mjs`.
- **C5** `CLAUDE.md` documents the featured flag, API route and script.
- **C6** *(added by planner)* The landing page is the highest-traffic page and share docs
  hold full transcripts (potentially hundreds of KB each), so `/api/share/featured` must not
  hit Firestore on every request: keep the computed summaries in a module-level in-memory
  cache with a 5-minute TTL (per server instance; a failed fetch must not be cached as an
  empty success for the full TTL). The route declares `export const dynamic = "force-dynamic"`
  so the build never tries to prerender it (build container has no GCP credentials).
