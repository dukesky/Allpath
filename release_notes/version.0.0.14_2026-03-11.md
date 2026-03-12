# AllPath v0.0.14 (2026-03-11)

## What changed

- Refactored agent prompting to use transcript-style conversation context instead of injecting prior multi-agent history as assistant-role messages.
- Strengthened output sanitization so leaked internal transcript fields and markup are stripped from agent responses.
- Added session member clusters to the left session bar and the right chat header, with expandable member details.
- Added per-session member mute/unmute controls; muted members no longer reply until unmuted.
- Improved mobile UX:
  - chat-first layout after creating or reopening a session
  - collapsible setup panel on mobile
  - larger message composer with better mobile button layout
- Improved attachment UX for images:
  - thumbnail preview before send
  - thumbnail rendering inside sent user chat bubbles
  - click-to-enlarge lightbox preview

## Notes

- Mute/unmute takes effect on the next queued turn; it does not interrupt a participant that is already streaming.
- The prompt refactor reduces transcript leakage issues, but provider-specific streaming compatibility can still affect some models and may need additional parser work later.
