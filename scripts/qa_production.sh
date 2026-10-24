#!/usr/bin/env bash
# Post-deploy smoke / QC for https://secrets.gatvia.com (Option A).
# Usage: ./scripts/qa_production.sh
#        BASE_URL=https://secrets.gatvia.com API_URL=https://secrets.gatvia.com/api ./scripts/qa_production.sh

set -euo pipefail

BASE_URL="${BASE_URL:-https://secrets.gatvia.com}"
API_URL="${API_URL:-https://secrets.gatvia.com/api}"
BASE_URL="${BASE_URL%/}"
API_URL="${API_URL%/}"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
FAILED=0

if [[ -x /tmp/node-v20.18.0-darwin-arm64/bin/node ]]; then
  NODE=/tmp/node-v20.18.0-darwin-arm64/bin/node
elif command -v node >/dev/null 2>&1; then
  NODE=node
else
  NODE=""
fi

pass() { echo -e "${GREEN}PASS${NC} $*"; }
fail() { echo -e "${RED}FAIL${NC} $*"; FAILED=1; }

http_ok() {
  local label="$1"
  local url="$2"
  local code
  code="$(curl -fsS -L -o /dev/null -w '%{http_code}' --max-time 30 "$url" 2>/dev/null || echo "000")"
  if [[ "$code" =~ ^2 ]]; then
    pass "$label ($code) $url"
  else
    fail "$label (HTTP $code) $url"
  fi
}

http_body() {
  local url="$1"
  curl -fsSL --max-time 45 "$url" 2>/dev/null || echo ""
}

echo "=== Production QA: $BASE_URL ==="

http_ok "Homepage" "$BASE_URL/"
http_ok "Products listing" "$BASE_URL/products/"
http_ok "Cart" "$BASE_URL/cart/"
http_ok "Checkout" "$BASE_URL/checkout/"
http_ok "Admin login" "$BASE_URL/admin/login/"

PRODUCTS_JSON="$(http_body "$API_URL/products?limit=5")"
if [[ -z "$PRODUCTS_JSON" ]]; then
  fail "API products list (empty response)"
else
  if [[ -n "$NODE" ]] && printf '%s' "$PRODUCTS_JSON" | "$NODE" -e "
const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
if (!d.results && !Array.isArray(d)) process.exit(1);
" 2>/dev/null; then
    pass "API products JSON shape"
  else
    fail "API products JSON shape"
  fi
fi

PRODUCT_ID=""
if [[ -n "$NODE" && -n "$PRODUCTS_JSON" ]]; then
  PRODUCT_ID="$(printf '%s' "$PRODUCTS_JSON" | "$NODE" -e "
try {
  const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
  const rows=d.results||d.products||(Array.isArray(d)?d:[]);
  if (rows[0]?.id) process.stdout.write(String(rows[0].id));
} catch {}
" 2>/dev/null || true)"
fi

if [[ -n "${PRODUCT_ID:-}" ]]; then
  http_ok "API product by id" "$API_URL/products/$PRODUCT_ID"
  TMP_PRODUCT="$(mktemp)"
  PRODUCT_FINAL="$(curl -fsSL -o "$TMP_PRODUCT" -w '%{url_effective}' --max-time 45 "$BASE_URL/products/$PRODUCT_ID/" 2>/dev/null || echo "")"
  PRODUCT_CODE="$(curl -sSL -o /dev/null -w '%{http_code}' --max-time 45 "$BASE_URL/products/$PRODUCT_ID/" 2>/dev/null || echo "000")"
  if [[ "$PRODUCT_CODE" =~ ^2 ]]; then
    pass "Product page (real id) ($PRODUCT_CODE) $BASE_URL/products/$PRODUCT_ID/"
  else
    fail "Product page (real id) (HTTP $PRODUCT_CODE)"
  fi
  if [[ "$PRODUCT_FINAL" == *"product-view.html"* ]]; then
    fail "Legacy Hostinger product-view redirect still active — deploy public_html/.htaccess (Option A)"
  fi
  if [[ -s "$TMP_PRODUCT" ]] && grep -q '_next/static' "$TMP_PRODUCT"; then
    pass "Product page serves Next.js shell"
  else
    fail "Product page missing Next.js shell (check .htaccess + products/0/ deploy)"
  fi
  rm -f "$TMP_PRODUCT"
else
  echo "WARN: No products in API — skipping product-by-id checks"
fi

# Template route: high ID should serve Next shell (Apache → /products/0/), not legacy redirects
TMP_SYNTH="$(mktemp)"
SYNTH_FINAL="$(curl -fsSL -o "$TMP_SYNTH" -w '%{url_effective}' --max-time 45 "$BASE_URL/products/999999/" 2>/dev/null || echo "")"
if [[ "$SYNTH_FINAL" == *"product-view.html"* ]]; then
  fail "Synthetic product URL hits legacy product-view.html — deploy Option A .htaccess"
elif [[ -s "$TMP_SYNTH" ]] && grep -q '_next/static' "$TMP_SYNTH"; then
  pass "Synthetic product URL serves Next.js shell"
else
  fail "Synthetic product URL does not serve Next.js shell"
fi
rm -f "$TMP_SYNTH"

MIGRATE_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$API_URL/admin/deploy/migrate-db" 2>/dev/null || echo "000")"
if [[ "$MIGRATE_CODE" == "401" || "$MIGRATE_CODE" == "403" ]]; then
  pass "migrate-db endpoint registered (auth required, HTTP $MIGRATE_CODE)"
elif [[ "$MIGRATE_CODE" == "404" ]]; then
  fail "migrate-db missing on API (HTTP 404)"
else
  fail "migrate-db unexpected HTTP $MIGRATE_CODE"
fi

SETTINGS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$API_URL/settings/visual" 2>/dev/null || echo "000")"
if [[ "$SETTINGS_CODE" =~ ^2 ]]; then
  pass "Public settings/visual ($SETTINGS_CODE)"
else
  fail "Public settings/visual (HTTP $SETTINGS_CODE)"
fi

echo "=== Summary ==="
if [[ "$FAILED" -ne 0 ]]; then
  echo -e "${RED}Production QA failed.${NC}"
  exit 1
fi
echo -e "${GREEN}Production QA passed.${NC}"
exit 0
