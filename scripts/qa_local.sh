#!/usr/bin/env bash
# Pre-deploy checks: frontend build + PHP syntax on API entrypoints.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${API_URL:-https://secrets.gatvia.com/api}"

echo "=== Local QA (pre-deploy) ==="

if [[ -x /tmp/node-v20.18.0-darwin-arm64/bin/node ]]; then
  export PATH="/tmp/node-v20.18.0-darwin-arm64/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found" >&2
  exit 1
fi

cd "$ROOT/frontend"
echo "Building Next.js (static export)..."
NEXT_PUBLIC_API_URL="$API_URL" npm run build

PHP_BIN=""
for c in php /usr/bin/php /opt/homebrew/bin/php; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -v >/dev/null 2>&1; then
    PHP_BIN="$c"
    break
  fi
done

if [[ -n "$PHP_BIN" ]]; then
  echo "PHP syntax check ($PHP_BIN)..."
  while IFS= read -r -d '' f; do
    "$PHP_BIN" -l "$f" >/dev/null
  done < <(find "$ROOT/backend-php" -name '*.php' -not -path '*/vendor/*' -print0)
  pass_msg="PHP syntax OK"
else
  pass_msg="PHP not available — skipped syntax check"
fi

TEMPLATE="$ROOT/frontend/out/products/0/index.html"
if [[ ! -f "$TEMPLATE" ]]; then
  echo "ERROR: Missing static product template at frontend/out/products/0/index.html" >&2
  exit 1
fi

LEGACY_COUNT="$(find "$ROOT/frontend/out/products" -mindepth 1 -maxdepth 1 -type d ! -name '0' 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$LEGACY_COUNT" != "0" ]]; then
  echo "ERROR: Expected only products/0/ in export, found $LEGACY_COUNT extra product folders" >&2
  exit 1
fi

echo "PASS Next.js build + single product template (products/0/)"
echo "$pass_msg"
echo "=== Local QA passed ==="
