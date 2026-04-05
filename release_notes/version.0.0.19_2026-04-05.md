# AllPath v0.0.19 (2026-04-05)

## Highlights

- Added Enter-to-send behavior in chat input (`Shift+Enter` keeps newline).
- Updated navigation consistency: `Back to Chat` now routes to `/chat` in Profile and Agent Studio.
- Hardened chat session state hydration and avatar rendering in session/member UI blocks.

## What Changed

### Chat input behavior

- Pressing `Enter` in the chat textarea now sends the message immediately.
- `Shift+Enter` still inserts a line break.
- IME composition is respected to avoid accidental sends while typing Chinese/Japanese/Korean.

### Navigation updates

- Changed `Back to Chat` link target to `/chat` in:
  - `app/profile/page.tsx`
  - `app/agents/page.tsx`

### Stability and UI consistency

- Added stricter session/member shape normalization when restoring session list from storage.
- Replaced several avatar usages from `next/image` fill mode to regular `img` with explicit sizing classes in chat/session member chips to reduce rendering edge cases.

### Local build reliability

- Added `@next/swc-darwin-arm64` to `devDependencies` to make local builds on Apple Silicon more reliable.

## Validation

- Verified with local `next build` on 2026-04-05.
