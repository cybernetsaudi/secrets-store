#!/bin/bash
# Run AFTER: gh auth login (as iwaqasmaqbool) and from repo root
#
#   cd /Users/waqas/secrets-store
#   export SSH_PASS='your-hostinger-password'
#   ./scripts/setup_github_actions.sh

set -euo pipefail

REPO="iwaqasmaqbool/secrets-store"
SSH_PASS="${SSH_PASS:-}"

if ! gh auth status -h github.com 2>&1 | grep -q 'iwaqasmaqbool'; then
  echo "Log in as iwaqasmaqbool first: gh auth login -h github.com" >&2
  exit 1
fi

if [[ -z "$SSH_PASS" ]]; then
  echo "ERROR: export SSH_PASS=... (Hostinger password for u950050130)" >&2
  exit 1
fi

echo "Pushing main branch..."
git push -u origin main

echo "Setting GitHub Actions secrets..."
gh secret set SSH_HOST --repo "$REPO" --body "u950050130@145.79.209.14"
gh secret set SSH_PORT --repo "$REPO" --body "65002"
gh secret set SSH_PASS --repo "$REPO" --body "$SSH_PASS"
gh secret set NEXT_PUBLIC_API_URL --repo "$REPO" --body "https://secrets.gatvia.com/api"
STRIPE_PK="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"
if [[ -z "$STRIPE_PK" ]]; then
  echo "WARN: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set; skipping Stripe secret" >&2
else
  gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --repo "$REPO" --body "$STRIPE_PK"
fi

TOKEN="$(gh auth token)"
echo "Updating github_deploy_token on server..."
sshpass -p "$SSH_PASS" ssh -p 65002 -o StrictHostKeyChecking=no u950050130@145.79.209.14 \
  "ENV=~/domains/secrets.gatvia.com/public_html/api/.env; DB_USER=\$(grep ^DB_USER= \$ENV|cut -d= -f2); DB_NAME=\$(grep ^DB_NAME= \$ENV|cut -d= -f2); DB_PASS=\$(grep ^DB_PASSWORD= \$ENV|cut -d= -f2-|tr -d '\"'); mysql -h localhost -u \"\$DB_USER\" -p\"\$DB_PASS\" \"\$DB_NAME\" -e \"INSERT INTO settings (\`key\`, value, type) VALUES ('github_deploy_token', '$TOKEN', 'string') ON DUPLICATE KEY UPDATE value='$TOKEN';\""

echo "Triggering test workflow..."
gh workflow run deploy.yml --repo "$REPO" -f reason="Initial setup test deploy"

echo "Done. Watch: https://github.com/iwaqasmaqbool/secrets-store/actions"
