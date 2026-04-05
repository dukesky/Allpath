# AllPath v0.0.20 (2026-04-05)

## Hotfix

- Fixed Cloud Build deployment failure caused by platform-specific SWC dependency.

## What Changed

- Removed top-level `@next/swc-darwin-arm64` from:
  - `package.json`
  - `package-lock.json`

## Why Deploy Failed

- Cloud Build runs on Linux x64.
- `@next/swc-darwin-arm64` only supports macOS arm64.
- `npm ci` failed with `EBADPLATFORM` when that package was declared as a direct dependency.

## Validation

- Local `next build` passes after removal.
- Ready to redeploy from `main`.
