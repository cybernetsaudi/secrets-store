#!/usr/bin/env bash
# Phase A deploy: build with bundled Node (if system node is broken) + Hostinger SSH deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_DIR="${NODE_DIR:-/tmp/node-v20.18.0-darwin-arm64}"
NODE_BIN="${NODE_DIR}/bin/node"

if [[ ! -x "${NODE_BIN}" ]]; then
  echo "Downloading portable Node 20..."
  curl -fsSL https://nodejs.org/dist/v20.18.0/node-v20.18.0-darwin-arm64.tar.gz -o /tmp/node20.tgz
  tar -xzf /tmp/node20.tgz -C /tmp
fi

export PATH="${NODE_DIR}/bin:${PATH}"

cd "${ROOT}/frontend"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://secrets.gatvia.com/api}" \
  node node_modules/next/dist/bin/next build

cd "${ROOT}"
exec ./scripts/deploy_secrets_gatvia.sh
