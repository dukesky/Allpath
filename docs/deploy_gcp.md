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

## 3) Set OpenRouter key (recommended via Secret Manager)

Create secret:

```bash
echo -n "YOUR_OPENROUTER_API_KEY" | $GCLOUD_BIN secrets create OPENROUTER_API_KEY --data-file=-
```

Grant Cloud Run service account access, then redeploy with:

```bash
$GCLOUD_BIN run services update allpath-web \
  --region us-central1 \
  --set-secrets OPENROUTER_API_KEY=OPENROUTER_API_KEY:latest
```

## Notes

- Current app storage is still in-memory (no persistent DB yet).
- Cloud SQL Postgres integration is the next step for cross-restart persistence and multi-user history.
