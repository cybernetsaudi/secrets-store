#!/bin/bash
# Clear product_images on production so placeholders show (and optionally archive legacy files).
# Usage: SSH_PASS='...' ./scripts/use_placeholders_only.sh [--archive-files]

set -euo pipefail

SSH_HOST="${SSH_HOST:-u950050130@145.79.209.14}"
SSH_PORT="${SSH_PORT:-65002}"
SSH_PASS="${SSH_PASS:-}"
REMOTE_PATH="${REMOTE_PATH:-/home/u950050130/domains/secrets.gatvia.com/public_html}"
ARCHIVE_FLAG="${1:-}"

if [[ -z "$SSH_PASS" ]]; then
  echo "ERROR: export SSH_PASS=... before running" >&2
  exit 1
fi

ssh_cmd() { sshpass -p "$SSH_PASS" ssh -p "$SSH_PORT" -o StrictHostKeyChecking=no "$SSH_HOST" "$@"; }

echo "=== product_images rows (before) ==="
ssh_cmd "cd '$REMOTE_PATH/api' && php -r \"
require 'vendor/autoload.php';
if (file_exists('.env')) Dotenv\\\Dotenv::createImmutable(__DIR__)->safeLoad();
echo App\\\Core\\\Database::query('SELECT COUNT(*) as c FROM product_images')->fetch()['c'], PHP_EOL;
\""

echo "=== Purging product_images ==="
ssh_cmd "cd '$REMOTE_PATH/api' && php scripts/purge_product_images.php $ARCHIVE_FLAG"

echo "=== product_images rows (after) ==="
ssh_cmd "cd '$REMOTE_PATH/api' && php -r \"
require 'vendor/autoload.php';
if (file_exists('.env')) Dotenv\\\Dotenv::createImmutable(__DIR__)->safeLoad();
echo App\\\Core\\\Database::query('SELECT COUNT(*) as c FROM product_images')->fetch()['c'], PHP_EOL;
\""

echo "Done. Storefront should now use collection placeholders."
