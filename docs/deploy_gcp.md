# GCP Deployment Notes

This project can deploy to Cloud Run with Cloud Build.

## 1) gcloud setup (local)

If `gcloud` is not on PATH, use:

```bash
export GCLOUD_BIN=/opt/homebrew/share/google-cloud-sdk/bin/gcloud
export CLOUDSDK_PYTHON=/opt/homebrew/bin/python3
```

This machine has permission issues on `~/.config/gcloud`, so use a project-local config:

```bash
export CLOUDSDK_CONFIG=$PWD/.gcloud
mkdir -p "$CLOUDSDK_CONFIG"
```

Then authenticate:

```bash
$GCLOUD_BIN auth login --no-launch-browser
$GCLOUD_BIN auth application-default login --no-launch-browser
$GCLOUD_BIN config set project allpath
$GCLOUD_BIN config set run/region us-central1
```

## 2) Deploy

```bash
PROJECT_ID=allpath REGION=us-central1 SERVICE_NAME=allpath-web ./deploy.sh
# optional fixed tag
IMAGE_TAG=v0.0.5 ./deploy.sh
```

## 3) One-time Secret Manager setup

Create or update the secrets used by Cloud Run:

```bash
printf '%s' 'YOUR_OPENROUTER_API_KEY' | $GCLOUD_BIN secrets create OPENROUTER_API_KEY --data-file=- 2>/dev/null || \
printf '%s' 'YOUR_OPENROUTER_API_KEY' | $GCLOUD_BIN secrets versions add OPENROUTER_API_KEY --data-file=-

printf '%s' 'YOUR_TRIAL_COOKIE_SECRET' | $GCLOUD_BIN secrets create TRIAL_COOKIE_SECRET --data-file=- 2>/dev/null || \
printf '%s' 'YOUR_TRIAL_COOKIE_SECRET' | $GCLOUD_BIN secrets versions add TRIAL_COOKIE_SECRET --data-file=-

printf '%s' 'YOUR_TRIAL_ENCRYPTION_SECRET' | $GCLOUD_BIN secrets create TRIAL_ENCRYPTION_SECRET --data-file=- 2>/dev/null || \
printf '%s' 'YOUR_TRIAL_ENCRYPTION_SECRET' | $GCLOUD_BIN secrets versions add TRIAL_ENCRYPTION_SECRET --data-file=-
```

Grant the Cloud Run runtime service account access to these secrets if it does not already have it.

After that, every `./deploy.sh` run will automatically configure:

- `NODE_ENV=production`
- `FIRESTORE_DATABASE_ID=default`
- `OPENROUTER_SITE_URL=https://all-path.com`
- `OPENROUTER_APP_NAME=AllPath`
- `OPENROUTER_API_KEY` from Secret Manager
- `TRIAL_COOKIE_SECRET` from Secret Manager
- `TRIAL_ENCRYPTION_SECRET` from Secret Manager

Optional overrides for custom secret names or values:

```bash
FIRESTORE_DATABASE_ID=default \
OPENROUTER_SITE_URL=https://all-path.com \
OPENROUTER_APP_NAME=AllPath \
OPENROUTER_API_KEY_SECRET=OPENROUTER_API_KEY \
TRIAL_COOKIE_SECRET_NAME=TRIAL_COOKIE_SECRET \
TRIAL_ENCRYPTION_SECRET_NAME=TRIAL_ENCRYPTION_SECRET \
./deploy.sh
```

## Notes

- Current app storage is still in-memory (no persistent DB yet).
- Cloud SQL Postgres integration is the next step for cross-restart persistence and multi-user history.
