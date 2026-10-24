#!/bin/bash
# Deploy secrets-store to https://secrets.gatvia.com (Option A — primary deploy path)
# Usage: SSH_PASS='...' ./scripts/deploy_secrets_gatvia.sh
#
# Products/catalog: live from API — no rebuild when adding products.
# This script is for CODE changes only. Runs local + production QA when possible.
#
# Post-deploy checklist (run on server via ssh when needed):
#   cd ~/domains/secrets.gatvia.com/public_html/api
#   php scripts/repair_product_images.php [--dry-run]   # only if uploads exist but DB rows missing
#   php scripts/purge_product_images.php --archive-files # use placeholders; archives legacy GUFC files
#   php scripts/migrate_variant_dimensions.php         # once: color/size/cup variant columns
#
# Optional env:
#   REPAIR_PRODUCT_IMAGES=1  — run repair_product_images.php automatically after deploy

set -euo pipefail

# SSH must use the same Hostinger server as FTP (141.136.39.245). 145.79.209.14 rejects this account password.
SSH_HOST="${SSH_HOST:-u950050130@141.136.39.245}"
SSH_PORT="${SSH_PORT:-65002}"
SSH_PASS="${SSH_PASS:-}"
REMOTE_PATH="${REMOTE_PATH:-~/domains/secrets.gatvia.com/public_html}"
API_URL="${API_URL:-https://secrets.gatvia.com/api}"

if [[ -z "$SSH_PASS" ]]; then
  echo "ERROR: export SSH_PASS=... before running" >&2
  exit 1
fi

export SSHPASS="$SSH_PASS"
ssh_cmd() {
  sshpass -e ssh -p "$SSH_PORT" -o StrictHostKeyChecking=no \
    -o PreferredAuthentications=password -o PubkeyAuthentication=no "$SSH_HOST" "$@"
}
rsync_cmd() {
  sshpass -e rsync -avz -e "ssh -p $SSH_PORT -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no" "$@"
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/scripts/qa_local.sh"

echo "Deploying frontend..."
rsync_cmd "$ROOT/frontend/out/" "$SSH_HOST:$REMOTE_PATH/" \
  --exclude='api/' --exclude='.htaccess' --delete

echo "Deploying .htaccess..."
rsync_cmd "$ROOT/public_html/.htaccess" "$SSH_HOST:$REMOTE_PATH/.htaccess"

echo "Deploying API..."
rsync_cmd "$ROOT/backend-php/" "$SSH_HOST:$REMOTE_PATH/api/" \
  --exclude='vendor' --exclude='.env' --exclude='.git' --exclude='*.md' --exclude='tests' \
  --exclude='uploads/'

echo "Composer install..."
ssh_cmd "cd $REMOTE_PATH/api && composer install --no-dev --optimize-autoloader"

echo "Running migrate_variant_dimensions.php (idempotent)..."
ssh_cmd "cd $REMOTE_PATH/api && php scripts/migrate_variant_dimensions.php"

if [[ "${REPAIR_PRODUCT_IMAGES:-}" == "1" ]]; then
  echo "Running repair_product_images.php (REPAIR_PRODUCT_IMAGES=1)..."
  ssh_cmd "cd $REMOTE_PATH/api && php scripts/repair_product_images.php"
else
  echo "Skipped repair_product_images.php (set REPAIR_PRODUCT_IMAGES=1 to auto-run)"
fi

echo "Running production QA..."
if BASE_URL="${BASE_URL:-https://secrets.gatvia.com}" API_URL="$API_URL" bash "$ROOT/scripts/qa_production.sh"; then
  echo "Done: https://secrets.gatvia.com/ (production QA passed)"
else
  echo "ERROR: Deploy uploaded but production QA failed — investigate before announcing release." >&2
  exit 1
fi
