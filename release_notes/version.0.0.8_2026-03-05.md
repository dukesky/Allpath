# AllPath v0.0.8 (2026-03-05)

## What changed

- Added session mode switching with runtime updates:
  - `roundtable` and `one_to_one` supported in the same session.
  - Mode can be switched from the chat header and is synced to backend session state.
- Added collapsible session sidebar:
  - Left session panel can now be hidden/shown from the main page.
- Added one-to-one targeting UX:
  - `@` mention dropdown in input.
  - Optional targeted replies to selected agents.
  - If no target is selected in one-to-one mode, message goes to all agents.
- Added backend queue metadata for per-message execution mode/targets:
  - Queue now stores `mode` + optional `targetParticipantIds`.
  - Added session mode API route.
- Added attachment support for user messages:
  - Upload images and text-like files (`.txt`, `.md`, `.json`, `.csv`) from chat input.
  - Attachments are displayed in user message bubble and included in model input.
  - Image attachments sent as multimodal `image_url`; text files sent as prompt text chunks.
- Stream/session payload updates:
  - SSE `session_state` now includes `mode`.
- Message schema updates:
  - Added attachment type definitions and attachment payloads on user messages.

## Notes

- Attachment handling currently supports image + text-like files only.
- Binary docs (e.g., PDF/DOCX/XLSX) are not parsed in this release.
