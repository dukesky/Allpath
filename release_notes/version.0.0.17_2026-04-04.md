# AllPath v0.0.17 - 2026-04-04

## Highlights

- Fixed promo-code redemption logic so invite codes are normalized case-insensitively
- Allowed exhausted guest browsers to redeem a new invite code and resume access
- Updated guest trial UI to show remaining usage as a percentage instead of a dollar amount
- Added and confirmed Firestore invite codes:
  - `myfriends` with a `$5` trial budget
  - `hi` with a `$3` trial budget
- Updated Cloud Run deployment automation so repository-driven Cloud Build deploys can restore required environment variables and Secret Manager bindings automatically

## Validation

- Local redemption now works against Firestore with ADC configured
- Production trigger still needs to be pointed at repository `cloudbuild.yaml` instead of the current inline configuration so the new env/secret automation is actually used during auto-deploy
