# AllPath v0.0.25 (2026-09-18)

Phase 2 — the share growth loop. Built with a planner → coding agent →
evaluator agent loop; each task was verified independently against numbered
acceptance criteria (spec: `docs/superpowers/plans/2026-09-18-phase2-share-growth-loop.md`).

## What's New

### Start chatting from any shared conversation
- Share pages now offer two ways in:
  - **Ask this team your own question** — a fresh session with the same team.
  - **Continue this conversation** — the same team, picking up the transcript.
- Forks keep each agent's own model, avatar, role and personality, and the
  original mode (previously every agent was switched to the quick-start model).
- New visitors without an invite code or key no longer hit a dead end: the team
  is loaded into setup with a banner offering **Start**, and redeeming an invite
  code starts the conversation automatically. The pending fork survives page
  reloads, including a redirect-based Google sign-in.
- Expired or unknown shares now show a clear notice instead of failing silently.

### Export a session as Markdown
- New **Export** button next to **Share** downloads the conversation as
  `allpath-{title}-{date}.md`: participants with role and model, messages grouped
  by round, summaries and failed replies marked, attachments named (never their
  contents), and an AllPath attribution line. Generated in the browser — nothing
  is sent to the server.

### Featured conversations on the landing page
- Hand-picked shares appear as cards right after the hero. Feature one with
  `SHARE_ID=<id> GOOGLE_CLOUD_PROJECT=allpath FIRESTORE_DATABASE_ID=default npm run share:feature`
  (`UNFEATURE=true` to remove). Featured shares never expire.
- The landing page stays statically rendered; cards load client-side and the
  list is cached per server instance for five minutes.

## Fixes
- Reloading the chat page now reconnects to the active session again when
  Firebase sign-in is configured (regression from v0.0.22).
- A forked session now uses the visitor's saved API key on the first try
  (previously read from a stale value and rejected).
- Participant roles now reach the client over the live session stream
  (provider and API key remain excluded).
