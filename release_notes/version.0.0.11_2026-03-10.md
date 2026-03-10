# AllPath v0.0.11 (2026-03-10)

## What changed

- Refreshed OpenRouter fallback model catalog from latest available models.
  - Generated file: `lib/generated/openrouterModels.json`
  - Current snapshot size: 244 models
- Added model catalog refresh script:
  - `scripts/update-openrouter-models.mjs`
  - npm command: `npm run models:update`
- Updated catalog loading logic:
  - `lib/modelCatalog.ts` now prefers generated OpenRouter models for `MORE_MODELS`
  - Keeps existing curated featured models and falls back to hardcoded list if needed
- Added automation workflow for model updates:
  - `.github/workflows/update-model-catalog.yml`
  - Runs on push to `main`, manual trigger, and every 12 hours
  - Auto-commits updated model snapshot when changes are detected
- Updated docs:
  - README model-update instructions and automation notes

## Notes

- For best coverage in CI refresh jobs, set repository secret `OPENROUTER_API_KEY`.
