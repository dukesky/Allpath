# AllPath v0.0.23 (2026-08-14)

## What's New

### Sessions Started Before Sign-In Are No Longer Lost
- Signing in now **claims** the sessions you started as a guest: they are
  attached to your account and saved to the cloud immediately, and every
  later round persists as usual.
- Claimed sessions show the **Saved** badge in the sidebar alongside sessions
  created while signed in.
- New route: `POST /api/session/[id]/claim` (auth required; idempotent;
  rejects sessions owned by another account with 403).
- Limitation: only sessions still live on the server can be claimed. A guest
  session whose server state is already gone (e.g. after a restart) cannot be
  recovered, because guest transcripts are never stored server-side.

### Fixes
- Sign-in failures now show the underlying error code (e.g.
  `auth/popup-blocked`, `auth/network-request-failed`) instead of a generic
  message, and popup-blocked / network errors get actionable text.
