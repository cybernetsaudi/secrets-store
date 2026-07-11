#!/bin/bash
# Deploy secrets-store to https://secrets.gatvia.com
# Usage: SSH_PASS='...' ./scripts/deploy_secrets_gatvia.sh

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

ssh_cmd() { sshpass -p "$SSH_PASS" ssh -p "$SSH_PORT" -o StrictHostKeyChecking=no "$SSH_HOST" "$@"; }
rsync_cmd() { rsync -avz -e "sshpass -p '$SSH_PASS' ssh -p $SSH_PORT -o StrictHostKeyChecking=no" "$@"; }

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
  --exclude='vendor' --exclude='.env' --exclude='.git' --exclude='*.md' --exclude='tests'

echo "Composer install..."
ssh_cmd "cd $REMOTE_PATH/api && composer install --no-dev --optimize-autoloader"

echo "Done: https://secrets.gatvia.com/"
