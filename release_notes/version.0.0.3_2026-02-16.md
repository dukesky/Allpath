# AllPath Version 0.0.3 (2026-02-16)

## Summary
This release improves session prompt behavior transparency, API key management, and model selection reliability.

## Changes

- Added session-level `globalApiKey` with per-agent/per-summarizer override.
- Added UI controls for unified OpenRouter key and per-agent specific key toggle.
- Added backend provider resolution order for OpenRouter calls:
  1. agent-specific key
  2. session global key
  3. environment fallback
- Updated model loading:
  - quick chips remain curated defaults
  - "Show more models" now uses full OpenRouter catalog
  - automatic fallback to bundled defaults when remote fetch fails
- Kept Round Table orchestration behavior as sequential per agent turn.
- Confirmed `agentInitialPrompt` is included in every model call (each turn) through system prompt construction.
- Added stronger anti-cross-agent output constraints in prompt handling.

## Files Updated

- `app/page.tsx`
- `app/api/session/route.ts`
- `app/api/models/route.ts`
- `lib/orchestrator.ts`
- `lib/types.ts`

## Validation

- `npm run build` passed.
