# AllPath v0.0.22 (2026-08-10)

## What's New

### User Accounts (Firebase Auth)
- Sign in with Google or email/password from the top navigation bar.
- Auth is optional and off by default: without `NEXT_PUBLIC_FIREBASE_*` env
  vars the app runs exactly as before (guest/trial only). See
  `docs/firebase_auth_setup.md` for the one-time setup.

### Cloud Session Persistence
- Sessions owned by a signed-in user are saved to Firestore after every round
  (`users/{uid}/sessions/{persistentId}` + per-message subcollection).
- The session sidebar merges account sessions (marked **Saved**) with local
  ones; they survive server restarts and follow the user across devices.
- Opening a saved session whose in-memory state is gone transparently rebuilds
  it from the stored transcript and continues under the same identity.
- If the account has no usable funding source, the transcript is restored
  read-only with a hint to redeem an invite code or add an API key.
- Deleting a saved session also removes it from the account.
- Security: provider API keys and the session global key are never persisted;
  attachment payloads (images/text files) are stripped before storage.

### Trial ↔ Account Linking
- Redeeming an invite code (or refreshing trial status) while signed in links
  the guest trial record to the account.
- On a new device, signing in recovers the linked trial and re-issues the
  guest cookie automatically.

### New API Routes
- `GET /api/sessions` — list the signed-in user's saved sessions
- `GET /api/sessions/[pid]` — fetch one saved session incl. transcript
- `DELETE /api/sessions/[pid]` — delete a saved session

### Dev
- Added `vitest` with unit tests for the persistence sanitizers
  (`npm test`).
