# AllPath v0.0.5 (2026-02-17)

## What changed

- Added GCP deployment artifacts for Cloud Run:
  - `Dockerfile` (Next.js standalone runtime)
  - `cloudbuild.yaml` (build + push + deploy pipeline)
  - `deploy.sh` (one-command deploy helper)
- Enabled Next.js standalone output in `next.config.ts` for container deploy.
- Added deployment guide: `docs/deploy_gcp.md`.
- Updated README with a Cloud Run quick-start section.
- Added `.dockerignore` and `public/.gitkeep` for stable Docker builds.
- Added `.gcloud` to `.gitignore` to keep local cloud auth/config out of git.
- Fixed Cloud Build image tag bug by replacing `$SHORT_SHA` with explicit `_IMAGE_TAG` substitution.

## Notes

- `gcloud` is available via `/opt/homebrew/share/google-cloud-sdk/bin/gcloud` on this machine.
- Due local permission issues on `~/.config/gcloud`, use `CLOUDSDK_CONFIG=$PWD/.gcloud`.
- App data is still in-memory; Cloud SQL Postgres integration is not wired yet in this release.
