# AllPath v0.0.6 (2026-02-19)

## What changed

- Added agent avatar support end-to-end:
  - Upload avatar in Agent Personality Studio and session setup.
  - Persist avatar URL in profile/session config.
  - Show avatar in chat bubbles for each agent/summarizer.
- Added built-in default profiles with defaults:
  - Tang Seng
  - Sun Wukong
  - Shakespeare
- Replaced default preset avatars with user-provided PNG portraits:
  - `public/avatars/tang-seng.png`
  - `public/avatars/sun-wukong.png`
  - `public/avatars/shakespeare.png`
- Improved profile migration behavior:
  - Existing default profiles that still use old `.svg` avatars auto-upgrade to new PNG defaults.
  - Custom user avatars are preserved.
- Reduced response cross-contamination in agent outputs:
  - Improved sanitizer to parse multiple `Speaker/Message` blocks and keep only the current agent block.
  - Added stronger prompt rules and structured history message format to reduce model echo of speaker tags.
- Updated UI:
  - Avatar previews use `object-contain` so faces are not cut.
  - Added delete action for saved sessions in the left sidebar.

## Notes

- Current storage is still local/in-memory for sessions plus browser localStorage for profile/session meta.
- Cloud SQL-backed persistence remains a next step.
