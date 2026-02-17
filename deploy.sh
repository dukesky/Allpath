#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-allpath}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-allpath-web}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

GCLOUD_BIN="${GCLOUD_BIN:-/opt/homebrew/share/google-cloud-sdk/bin/gcloud}"
CLOUDSDK_CONFIG="${CLOUDSDK_CONFIG:-$PWD/.gcloud}"
CLOUDSDK_PYTHON="${CLOUDSDK_PYTHON:-/opt/homebrew/bin/python3}"
mkdir -p "$CLOUDSDK_CONFIG"
export CLOUDSDK_CONFIG
if [ -x "$CLOUDSDK_PYTHON" ]; then
  export CLOUDSDK_PYTHON
fi

echo "Using gcloud: $GCLOUD_BIN"
echo "Project: $PROJECT_ID | Region: $REGION | Service: $SERVICE_NAME | Tag: $IMAGE_TAG"

"$GCLOUD_BIN" config set project "$PROJECT_ID" >/dev/null

"$GCLOUD_BIN" builds submit \
  --config cloudbuild.yaml \
  --substitutions "_SERVICE_NAME=${SERVICE_NAME},_REGION=${REGION},_IMAGE_TAG=${IMAGE_TAG}" \
  .

echo
echo "Deploy done. Get URL with:"
echo "$GCLOUD_BIN run services describe $SERVICE_NAME --region $REGION --format='value(status.url)'"
