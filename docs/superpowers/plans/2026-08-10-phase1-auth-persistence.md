# Phase 1: Firebase Auth + Firestore Session Persistence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Logged-in users keep their sessions across server restarts and devices; guests keep working exactly as today.

**Architecture:** Firebase Auth (client SDK) provides identity; API routes verify the ID token via `firebase-admin` (ADC). Sessions owned by a user are persisted server-side to Firestore after each round (session doc + per-message subcollection, all secrets stripped). Resume = recreate an in-memory session from the persisted transcript via the existing `POST /api/session` + `initialMessages` path, keyed by a new stable `persistentId`.

**Tech Stack:** firebase (client), firebase-admin (server, ADC), @google-cloud/firestore (existing), vitest (new, for pure-logic tests only).

## Global Constraints

- **Never persist secrets**: `provider.apiKey`, `globalApiKey` must be stripped before any Firestore write.
- **Graceful degradation**: if `NEXT_PUBLIC_FIREBASE_*` env vars are absent, the app behaves exactly as today (no auth UI, no persistence). Production must not break before Firebase console setup is done.
- **Guests unaffected**: the trial cookie flow keeps working for anonymous users.
- **Firestore doc limit 1MB**: messages persist to a subcollection, one doc per message; attachment `dataUrl`/`textContent` are stripped (name/kind kept).
- All Firestore access stays server-side (admin credentials); the browser only talks to Firebase Auth.
- No test framework exists in repo; add vitest only for `lib/sessionPersistence.ts` pure helpers. Everything else verified via `npm run build` + browser.

## New/Modified Files

| File | Responsibility |
|---|---|
| Create `lib/firebaseClient.ts` | Client-side Firebase app/auth init from `NEXT_PUBLIC_FIREBASE_*`; returns null when unconfigured |
| Create `lib/serverAuth.ts` | `getAuthUser(request)` → `{ uid, email } \| null` via firebase-admin `verifyIdToken`; lazy singleton init with ADC |
| Create `lib/sessionPersistence.ts` | Sanitize + persist + load session records (`users/{uid}/sessions/{persistentId}` + `messages` subcollection) |
| Create `lib/sessionPersistence.test.ts` | Vitest for sanitize/serialize helpers |
| Create `app/api/sessions/route.ts` | GET: list current user's persisted sessions |
| Create `app/api/sessions/[pid]/route.ts` | GET: full session (meta + messages); DELETE: remove |
| Create `app/chat/components/AuthControls.tsx` | Sign-in button / user menu / email+Google modal |
| Create `app/chat/components/useAuth.ts` | React hook: auth state, `getIdToken()`, sign-in/out actions |
| Modify `lib/types.ts` | `SessionConfig` gains `ownerUid?`, `persistentId?`, `title?` |
| Modify `app/api/session/route.ts` | Read Authorization header → set `ownerUid`; accept `persistentId`/`title`; initial persist |
| Modify `lib/orchestrator.ts` | After round completed / manual summarizer: fire-and-forget `persistSessionState()` |
| Modify `app/chat/page.tsx` | Auth state, Authorization headers on fetches, merged session list, resume-from-Firestore flow, delete |
| Modify `app/chat/components/ChatHeader.tsx` + `MobileNav.tsx` | Mount `AuthControls` |
| Create `docs/firebase_auth_setup.md` | One-time console setup steps + env vars (local + Cloud Run) |
| Create `release_notes/version.0.0.22_<date>.md`, bump `VERSION` | Release note |
| Modify `CLAUDE.md` | Document auth + persistence architecture |

## Data Model

```
users/{uid}/sessions/{persistentId}:
  { persistentId, ownerUid, title, mode, agentInitialPrompt,
    participants: SanitizedParticipant[],   // provider: { type, baseUrl? } — NO apiKey
    summarizer?: SanitizedParticipant,
    roundNumber, createdAt, updatedAt, messageCount, liveSessionId }
users/{uid}/sessions/{persistentId}/messages/{messageId}:
  Message with attachments stripped to { attachmentId, name, mimeType, kind }
```

`SanitizedParticipant = ParticipantConfig` with `provider.apiKey` removed. On resume the client re-injects keys from its local preferences (same as the share-import path today).

## Resume Flow (client)

1. Logged-in: `GET /api/sessions` → merge into sidebar list (server entries carry `persistentId`).
2. Open server entry: if `liveSessionId` still streams (SSE opens) → attach. On 404 → `GET /api/sessions/{pid}` → `POST /api/session` with `initialMessages`, sanitized participants (+ locally stored keys), `persistentId` → `connectStream(newSessionId)`.

---

### Task 1: Dependencies + Firebase client/server auth libs

**Files:** package.json, `lib/firebaseClient.ts`, `lib/serverAuth.ts`

- [ ] `npm install firebase firebase-admin && npm install -D vitest`
- [ ] `lib/firebaseClient.ts`: read `NEXT_PUBLIC_FIREBASE_API_KEY / _AUTH_DOMAIN / _PROJECT_ID / _APP_ID`; export `isFirebaseAuthConfigured()`, `getFirebaseAuth()` (lazy `initializeApp`, null when unconfigured), `googleProvider`.
- [ ] `lib/serverAuth.ts`: lazy `firebase-admin` init (`applicationDefault()` credentials, projectId from env chain used by lib/firestore.ts); `export async function getAuthUser(request: NextRequest): Promise<{ uid: string; email?: string } | null>` parsing `Authorization: Bearer <token>`, returning null on any failure (never throwing).
- [ ] `npm run build` passes with no env vars set.
- [ ] Commit `feat(auth): firebase client + server token verification scaffolding`

### Task 2: Sanitization helpers (TDD)

**Files:** `lib/sessionPersistence.ts`, `lib/sessionPersistence.test.ts`, package.json (`"test": "vitest run"`)

**Produces:** `sanitizeParticipantForPersistence(p: ParticipantConfig): PersistedParticipant`, `sanitizeMessageForPersistence(m: Message): Message`, `buildSessionDoc(config: SessionConfig, title: string): PersistedSessionDoc`

- [ ] Write failing tests: apiKey stripped (participant + summarizer + globalApiKey absent from doc), attachment dataUrl/textContent stripped, doc fields complete, undefined optional fields omitted (Firestore rejects `undefined`).
- [ ] Implement pure helpers (no Firestore imports in the pure section).
- [ ] `npx vitest run` green; commit `feat(persistence): sanitize helpers for session persistence`

### Task 3: Persist path (write)

**Files:** `lib/types.ts`, `lib/sessionPersistence.ts`, `app/api/session/route.ts`, `lib/orchestrator.ts`

- [ ] `SessionConfig` += `ownerUid?: string; persistentId?: string; title?: string`.
- [ ] `persistSessionState(config: SessionConfig): Promise<void>` — no-op unless `ownerUid && persistentId`; `set(doc, {merge:true})` + batched writes for messages with status completed/failed not yet persisted (track a `persistedMessageIds` watermark per message doc id — idempotent set() is fine, write all messages of the two most recent rounds to cap batch size).
- [ ] `POST /api/session`: `const user = await getAuthUser(request)`; when user: `ownerUid = user.uid`, `persistentId = body.persistentId (uuid-validated) ?? randomUUID()`, `title = body.title?.slice(0,120)`; call `persistSessionState` fire-and-forget; return `persistentId` in response.
- [ ] `lib/orchestrator.ts`: after `round_completed` emit and at end of `runManualSummarizer`: `void persistSessionState(state.config).catch(console.error)`.
- [ ] Build green; commit `feat(persistence): write sessions to Firestore after each round`

### Task 4: Read/list/delete APIs

**Files:** `app/api/sessions/route.ts`, `app/api/sessions/[pid]/route.ts`

- [ ] GET `/api/sessions`: auth required (401 otherwise); list docs ordered by `updatedAt desc` limit 50; return metas (no messages).
- [ ] GET `/api/sessions/[pid]`: auth + ownership; return doc + messages ordered by `createdAt`; 404 when missing.
- [ ] DELETE `/api/sessions/[pid]`: delete messages subcollection in batches then doc.
- [ ] Build green; commit `feat(persistence): session list/get/delete APIs`

### Task 5: Client auth UI

**Files:** `app/chat/components/useAuth.ts`, `app/chat/components/AuthControls.tsx`, `ChatHeader.tsx`, `MobileNav.tsx`, `page.tsx`

- [ ] `useAuth()`: `{ user, isConfigured, signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser, getIdToken }` via `onAuthStateChanged`; everything null/no-op when unconfigured.
- [ ] `AuthControls`: unconfigured → render nothing; signed out → "Sign in" button opening modal (Google button + email/password form with sign-in/sign-up toggle, error display); signed in → avatar initial + menu (email, Sign out).
- [ ] Mount in ChatHeader (desktop right side) and MobileNav.
- [ ] Build green + manual check (with env unset, UI absent); commit `feat(auth): sign-in UI and auth state hook`

### Task 6: Client persistence integration

**Files:** `app/chat/page.tsx`, `app/chat/components/SessionSidebar.tsx`, `app/chat/components/types.ts`

- [ ] `SessionMeta` += `persistentId?: string; updatedAt?: string; source?: "local" | "cloud"`.
- [ ] On login: fetch `/api/sessions` with bearer token, merge into `sessionList` (dedupe by persistentId; cloud wins), show cloud badge in sidebar.
- [ ] `createSessionFromParticipants`: include bearer token header when logged in; store returned `persistentId` on the SessionMeta; carry title (first user message or story name).
- [ ] Open cloud session: try live stream; on failure fetch `/api/sessions/{pid}`, rebuild participants (re-attach local keys per current apiKeyMode), `POST /api/session` with `initialMessages` + same `persistentId`, connect stream, update SessionMeta id mapping.
- [ ] Delete session (sidebar): when persistentId present and logged in, also `DELETE /api/sessions/{pid}`.
- [ ] Build green; manual E2E: create → chat a round → restart dev server → reopen session → history present, can continue.
- [ ] Commit `feat(persistence): cloud session list, resume and delete in chat UI`

### Task 7: Trial ↔ account linking (light)

**Files:** `lib/trial.ts`, `app/api/trial/status/route.ts`, `app/api/trial/redeem/route.ts`

- [ ] On redeem/status with a logged-in user (bearer token): store `linkedUid` on guest record (merge).
- [ ] `getTrialStatusForRequest`: if no cookie but authenticated, look up guest by `linkedUid` (indexed query, limit 1) and re-issue cookie.
- [ ] Build green; commit `feat(trial): link guest trial records to signed-in accounts`

### Task 8: Docs + release note

**Files:** `docs/firebase_auth_setup.md`, `release_notes/version.0.0.22_*.md`, `VERSION`, `CLAUDE.md`

- [ ] Setup guide: enable Firebase on the existing GCP project, add providers (Google, Email/Password), register Web app, copy the 4 `NEXT_PUBLIC_FIREBASE_*` values into `.env.local` and Cloud Run env; note Cloud Run SA needs no extra roles for verifyIdToken; authorized domains must include all-path.com.
- [ ] Release note v0.0.22 (login + cloud session history), bump VERSION to 0.0.22.
- [ ] CLAUDE.md: new lib files, new API routes, data model, env vars.
- [ ] Commit `docs: firebase auth setup guide + v0.0.22 release note`
