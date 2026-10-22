#!/usr/bin/env bash
# Deploy built frontend + PHP API to Hostinger.
# - Local / self-hosted runners: SSH + rsync (fast).
# - GitHub-hosted runners: FTPS (Hostinger often blocks GitHub SSH/rsync with exit code 5).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_HOST="${SSH_HOST:-}"
SSH_PORT="${SSH_PORT:-65002}"
SSH_PASS="${SSH_PASS:-}"
REMOTE_ROOT="${REMOTE_ROOT:-/home/u950050130/domains/secrets.gatvia.com/public_html}"
FTP_REMOTE_ROOT="${FTP_REMOTE_ROOT:-domains/secrets.gatvia.com/public_html}"

FTP_HOST="${FTP_HOST:-}"
FTP_USER="${FTP_USER:-}"
FTP_PASS="${FTP_PASS:-}"

trim() {
  printf '%s' "$1" | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

SSH_HOST="$(trim "${SSH_HOST}")"
SSH_PORT="$(trim "${SSH_PORT}")"
SSH_PASS="$(trim "${SSH_PASS}")"
REMOTE_ROOT="$(trim "${REMOTE_ROOT}")"
FTP_REMOTE_ROOT="$(trim "${FTP_REMOTE_ROOT}")"

deploy_ftps() {
  FTP_PASS="${FTP_PASS:-${SSH_PASS}}"
  FTP_USER="${FTP_USER:-${SSH_HOST%%@*}}"
  FTP_HOST="${FTP_HOST:-${SSH_HOST#*@}}"

  if [[ -z "${FTP_PASS}" || -z "${FTP_USER}" || -z "${FTP_HOST}" ]]; then
    echo "ERROR: FTPS credentials missing (set SSH_HOST + SSH_PASS or FTP_* secrets)." >&2
    exit 5
  fi

  if ! command -v lftp >/dev/null 2>&1; then
    echo "ERROR: lftp is required for FTPS deploy." >&2
    exit 5
  fi

  local enc_pass
  enc_pass="$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.stdin.read(), safe=""))' <<<"${FTP_PASS}")"

  echo "=== FTPS deploy to ${FTP_HOST} (${FTP_REMOTE_ROOT}) ==="

  lftp -e "
set ftp:ssl-allow true
set ftp:passive-mode true
set ssl:verify-certificate no
set net:timeout 60
set net:max-retries 3
open -p 21 ftps://${FTP_USER}:${enc_pass}@${FTP_HOST}
pwd
cd ${FTP_REMOTE_ROOT} || cd domains/secrets.gatvia.com/public_html || cd public_html
pwd
lcd ${ROOT_DIR}/frontend/out
mirror --reverse --verbose --exclude api/ --exclude-glob .htaccess
lcd ${ROOT_DIR}/public_html
put -O . .htaccess
lcd ${ROOT_DIR}/backend-php
cd api || mkdir -p api; cd api
mirror --reverse --verbose \
  --exclude-glob .env \
  --exclude-glob .env.* \
  --exclude-glob uploads/ \
  --exclude-glob .git/
bye
"

  echo "=== FTPS deploy complete ==="
}

deploy_ssh() {
  if [[ -z "${SSH_HOST}" || -z "${SSH_PASS}" ]]; then
    echo "ERROR: SSH_HOST and SSH_PASS are required for SSH deploy." >&2
    exit 1
  fi

  if [[ ! "${SSH_HOST}" == *"@"* ]]; then
    echo "ERROR: SSH_HOST must include username, e.g. u950050130@145.79.209.14" >&2
    exit 1
  fi

  export SSHPASS="${SSH_PASS}"

  ssh_bin() {
    sshpass -e ssh -p "${SSH_PORT}" \
      -o StrictHostKeyChecking=no \
      -o PreferredAuthentications=password \
      -o PubkeyAuthentication=no \
      -o NumberOfPasswordPrompts=1 \
      "${SSH_HOST}" "$@"
  }

  rsync_bin() {
    sshpass -e rsync -avz \
      -e "ssh -p ${SSH_PORT} -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no" \
      "$@"
  }

  echo "=== SSH preflight ==="
  ssh_bin "echo connected"

  echo "=== Deploy frontend ==="
  rsync_bin "${ROOT_DIR}/frontend/out/" "${SSH_HOST}:${REMOTE_ROOT}/" \
    --exclude='api/' --exclude='.htaccess' --delete

  echo "=== Deploy .htaccess ==="
  rsync_bin "${ROOT_DIR}/public_html/.htaccess" "${SSH_HOST}:${REMOTE_ROOT}/.htaccess"

  echo "=== Deploy API ==="
  rsync_bin "${ROOT_DIR}/backend-php/" "${SSH_HOST}:${REMOTE_ROOT}/api/" \
    --exclude='vendor' \
    --exclude='.env' \
    --exclude='.git' \
    --exclude='*.md' \
    --exclude='tests' \
    --exclude='uploads/'

  echo "=== Composer on server ==="
  ssh_bin "cd ${REMOTE_ROOT}/api && composer install --no-dev --optimize-autoloader"

  echo "=== DB migration (idempotent) ==="
  ssh_bin "cd ${REMOTE_ROOT}/api && php scripts/migrate_variant_dimensions.php"

  echo "=== SSH deploy complete ==="
}

if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  deploy_ftps
else
  if ! deploy_ssh; then
    echo "SSH deploy failed; trying FTPS fallback..." >&2
    deploy_ftps
  fi
fi
