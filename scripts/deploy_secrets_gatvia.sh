#!/bin/bash
# Deploy secrets-store to https://secrets.gatvia.com
# Usage: SSH_PASS='...' ./scripts/deploy_secrets_gatvia.sh
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

SSH_HOST="${SSH_HOST:-u950050130@145.79.209.14}"
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

echo "Building frontend..."
cd "$(dirname "$0")/../frontend"
NEXT_PUBLIC_API_URL="$API_URL" npm run build
cd ..

echo "Deploying frontend..."
rsync_cmd frontend/out/ "$SSH_HOST:$REMOTE_PATH/" \
  --exclude='api/' --exclude='.htaccess' --delete

echo "Deploying .htaccess..."
rsync_cmd public_html/.htaccess "$SSH_HOST:$REMOTE_PATH/.htaccess"

echo "Deploying API..."
rsync_cmd backend-php/ "$SSH_HOST:$REMOTE_PATH/api/" \
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

echo "Done: https://secrets.gatvia.com/"
