# AllPath v0.0.18 (2026-04-04)

## Highlights

- Completed P1 onboarding improvements in `/chat` with a faster first-run flow.
- Improved Quick Start usability for model selection and story card readability.
- Updated desktop layout behavior so setup is more focused before session creation and less intrusive after creation.

## What Changed

### Chat onboarding and setup UX

- Added story-level Quick Start experience taglines and starter prompts.
- Added first-turn suggested prompt chips in chat for new sessions.
- Added mode help tooltip (`?`) next to `Round Table / One-to-One` mode selector.
- Added richer empty-state content in chat when no session exists.

### Quick Start

- Added lightweight model quick-toggle row for Quick Start.
- Removed verbose Quick Start model helper text and extra custom model controls from this section.
- Updated Quick Start story cards to fixed, narrower width with wrapped one-line experience copy.

### Layout behavior

- When no session exists (desktop), setup and chat now split roughly 50/50 for easier onboarding visibility.
- After creating/opening a session, setup auto-hides on desktop.
- Added `Show Settings` / `Hide Settings` control beside `Show Sessions`.

## Notes

- Local testing uses `/chat` and was validated with successful `next build`.
- This release continues to use the Cloud Run + Secret Manager deployment model introduced in `v0.0.17`.
