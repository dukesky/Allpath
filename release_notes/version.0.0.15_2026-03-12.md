# AllPath v0.0.15 (2026-03-12)

## What changed

- Added new default Historical Figures personas:
  - Confucius (孔子)
  - Socrates (苏格拉底)
  - Shakyamuni (释迦牟尼)
- Bundled local avatar assets for the three new Historical Figures presets.
- Moved `Historical Figures` to the first position in the default story order so Quick Start surfaces it first.
- Added Quick Start story cards for one-click session creation from story groups.
- Improved mobile UX with a bottom navigation flow:
  - `Chat`
  - `Sessions`
  - `Setup`
- Kept the AllPath logo visible at the top while switching mobile views.
- Added collapsible Setup sections to reduce scroll length on phones:
  - Quick Start
  - Session Rules
  - Participants
  - Summarizer
- Increased the default guest trial budget from `$1.00` to `$2.00`.

## Notes

- The `$2.00` default applies to new invite-code initialization and new redemptions that do not already store an explicit `trialBudgetUsd`.
- Existing Firestore invite documents with `trialBudgetUsd` already set will keep their stored value until you update them.
