# AllPath Version 0.0.4 (2026-02-16)

## Summary
This release improves chat usability and session continuity, and fixes empty-message behavior for agent outputs.

## Changes

- Redesigned chat area to a messaging-app style layout:
  - user messages on the right
  - agent/summarizer messages on the left
  - avatar + display name on each message
- Kept composer/input always visible at the bottom of chat panel.
- Added typing indicators:
  - `X is typing...` when streaming messages exist
  - `Agents are thinking...` during running state without visible streaming tokens
- Added session sidebar for reopening previous sessions and continuing the conversation.
- Added local session continuity:
  - active session ID is persisted
  - returning from Agent Personality Studio keeps current session context
- Fixed empty output handling:
  - if a model truly returns empty output, message is removed from UI
  - `message_removed` event added for client sync
  - backend logs include empty-output debug context

## Files Updated

- `app/page.tsx`
- `lib/orchestrator.ts`
- `lib/store.ts`
- `lib/types.ts`

## Validation

- `npm run build` passed.
