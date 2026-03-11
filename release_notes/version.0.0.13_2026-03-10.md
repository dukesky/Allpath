# AllPath v0.0.13 (2026-03-10)

## What changed

- Added Firestore custom database ID support for guest-trial storage:
  - `FIRESTORE_DATABASE_ID`
  - used by both runtime Firestore access and invite-code bootstrap script
- Updated guest-trial setup docs and `.env.example` to include `FIRESTORE_DATABASE_ID`
- Improved orchestrator prompt construction:
  - history is now passed as transcript-style context
  - sanitizer removes transcript/internal metadata markers more aggressively
  - reduces leakage of internal prompt/history scaffolding into model output

## Notes

- This release is required when the Firestore database ID is `default` instead of Firestore SDK default `(default)`.
