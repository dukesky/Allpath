# AllPath v0.0.12 (2026-03-10)

## What changed

- Added guest-trial access with shared invite-code flow.
- Added server-side trial persistence in Firestore for:
  - anonymous guest identities
  - redeemed invite codes
  - remaining free trial budget
  - server-backed personal OpenRouter keys
- Added new trial APIs:
  - `POST /api/trial/redeem`
  - `GET /api/trial/status`
  - `POST /api/trial/personal-key`
- Added invite-code bootstrap tooling:
  - `scripts/init-trial-invite-code.mjs`
  - `npm run trial:invite:init`
- Refactored OpenRouter access resolution:
  - owner-funded free trial uses server-side `OPENROUTER_API_KEY`
  - guest-saved personal keys are resolved server-side
  - client-supplied OpenRouter keys still work as explicit overrides
- Added trial-aware UI on main page and profile page:
  - invite-code redemption
  - remaining free budget display
  - exhausted-state guidance
  - server-backed personal key save flow
- Added OpenRouter streaming usage parsing to support trial budget accounting.
- Added app icon/logo assets used by the updated app shell.

## Notes

- Trial budget defaults to `$1.00` per guest browser.
- Required environment variables for production:
  - `TRIAL_COOKIE_SECRET`
  - `TRIAL_ENCRYPTION_SECRET`
