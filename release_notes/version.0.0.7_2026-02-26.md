# AllPath v0.0.7 (2026-02-26)

## What changed

- Improved empty-output reliability and visibility:
  - Fixed SSE parsing to handle multi-line `data:` chunks in one event.
  - Empty assistant/summarizer output is now marked failed with a visible message instead of being silently hidden.
- Added **User Profile** page (`/profile`) for reusable user preferences:
  - Default OpenRouter API key storage.
  - Prompt preset management (create/edit/delete/default).
  - Added a built-in “Historical Figures Roundtable” prompt preset.
  - Added API key usage description and OpenRouter key link.
- Expanded **Agent Personality Studio**:
  - Story-based library model (`Story -> Profiles`) with story management.
  - Story filter in studio.
  - Upgraded profile card layout: left avatar column, right structured fields (Story / Profile Name / Role Title / Personality).
- Added Dragon Ball default profiles (with avatars):
  - Son Goku, Vegeta, Son Gohan, Piccolo, Bulma.
- Upgraded main page selection workflow:
  - Two-level profile selection (story filter first, then profile).
  - Added API key mode switch:
    - Use Default API Key (from User Profile)
    - Use Unified API Key (entered on session page)
    - Customized by Agent (per-agent key)
- Updated model options:
  - Refreshed static featured/more model defaults.
  - OpenRouter dynamic model route now filters by created date (2025-03-01+) and prioritizes newer models.

## Notes

- Session runtime state is still in-memory for backend process lifecycle.
- User preferences, stories, and profiles are browser localStorage-based in this version.
