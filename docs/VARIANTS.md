# Product variants — target UX & implementation plan

Reference UX: color swatches (hover changes hero image), size row, cup row, compare-at price, quantity + Add to cart; unavailable combinations greyed out.

## Current state (after Option A deploy)

| Layer | Status |
|--------|--------|
| **DB columns** | `option_color`, `option_size`, `option_cup`, `swatch_image`, `compare_at_price` — migrated |
| **DB `stock_quantity`** | Column exists; **not wired** in API, admin, or storefront |
| **Storefront `ProductVariantPicker`** | **Deployed** — Color / Size / Cup UI when `option_*` set |
| **Color → gallery** | **Click only** — filters images whose `alt_text` contains color name; **no hover** on swatch |
| **Inventory grey-out** | **Not implemented** — buttons only check SKU exists, not stock |
| **Admin `ApparelVariantEditor`** | **Deployed** — colors, sizes, cups, Generate SKUs, price modifier, active |
| **Live catalog data** | Mostly **color-only** (legacy names backfilled to `option_color`); **no size/cup SKUs yet** |

Until a product has generated SKUs (color × size × cup), the picker falls back to **simple name chips** (e.g. `black`, `maroon`).

---

## Foolproof model: one row = one purchasable SKU

```
Product (base_price, compare_at_price, images[])
  └── product_variants[]  — one row per unique (color, size, cup)
        option_color, option_size, option_cup
        swatch_image          — small tile (optional)
        stock_quantity        — integer ≥ 0, or NULL if not tracked
        is_unlimited          — if true, ignore stock_quantity
        is_active             — false = never sold (admin off)
        price_modifier        — added to base_price
```

**Golden rules**

1. **Never** sell without a resolved `variant_id` when the product has variants.
2. **Cart/checkout** re-check stock server-side (race-safe decrement or reservation).
3. **UI** derives availability only from API fields (`stock_quantity`, `is_unlimited`, `is_active`).
4. **Images**: each gallery image tagged with color (see below); hover/click color updates hero set.

---

## Admin workflow (adding a product like the reference)

1. Create product: name, description, **base price**, **compare at price** (optional).
2. Upload images; set **alt text** to include color name (e.g. `Demi Bra - Maroon front`) — powers gallery filter until we add `image_color` column.
3. Variants → **Color / Size / Cup**:
   - Add colors + **swatch image URL** (or product thumb for that color).
   - Sizes: `30, 32, 34, 36, 38, 40, 42`
   - Cups: `B, C, D` (if applicable)
   - **Generate SKU combinations**
4. **Per SKU row** (to be added in UI): `Stock qty` + `Unlimited` checkbox.
5. Save — **no site redeploy** (Option A).

---

## Storefront selection algorithm

1. Load `product` + `variants` from API.
2. If no `option_*` on any variant → legacy name chips.
3. Else apparel mode:
   - **Colors**: unique `option_color`; swatch = `swatch_image` or text tile.
   - **Sizes**: for selected color, show sizes where ∃ SKU with `is_active` and **in stock**.
   - **Cups**: for color+size, same rule.
4. **In stock** = `is_active && (is_unlimited || (stock_quantity ?? 0) > 0)`.
5. On color **hover** (preview) and **click** (commit): update gallery to images matching that color.
6. On full selection: set `selectedVariant`; cap quantity ≤ `stock_quantity` unless unlimited.
7. Add to cart: send `variant_id`; API rejects if OOS.

**Grey-out rules**

| Control | Disabled when |
|---------|----------------|
| Size `S` | No in-stock SKU for `(color, S, *)` |
| Cup `C` | No in-stock SKU for `(color, size, C)` |
| Color | No in-stock SKU for that color at all |
| Add to cart | No complete selection or OOS |

---

## Implementation phases (recommended order)

### Phase 1 — Data & admin (no new DB columns)

- [ ] Admin: `stock_quantity` + `is_unlimited` per SKU row in `ApparelVariantEditor`
- [ ] Admin save/load: pass through `VariantNormalizer` + `ProductVariant` model
- [ ] API public + admin: include `stock_quantity`, `is_unlimited` on variants (already in DB SELECT *)

### Phase 2 — Storefront availability

- [ ] Extend `ProductVariant` TypeScript type
- [ ] `variantInStock()` in `productVariants.ts`; use in `isSizeAvailable` / `isCupAvailable` / color list
- [ ] Disable Add to cart when OOS; max quantity from stock
- [ ] Color swatch `onMouseEnter` → `onColorPreview` for gallery (keep click to commit selection)

### Phase 3 — Checkout integrity

- [ ] Cart API: validate variant stock on add/update
- [ ] Order placement: decrement `stock_quantity` per line item (transaction)
- [ ] Optional: `reserved_quantity` if you need holds during checkout

### Phase 4 — Images (cleaner than alt_text)

- [ ] Optional column `product_images.option_color` or JSON metadata
- [ ] Admin: assign color when uploading
- [ ] Gallery: filter by `option_color` field first, fallback to alt_text

### Phase 5 — QA automation

- [ ] Playwright: select color → size → cup → add to cart
- [ ] Fixture product with known stock; assert grey-out when stock = 0

---

## Quick test on live (product 31 today)

- API returns colors only (`option_size` / `option_cup` null) → you will **not** see size/cup rows yet.
- Edit in admin → generate full matrix → save → refresh product page (no deploy).

---

## Deploy note

Code changes for phases above require `./scripts/deploy_secrets_gatvia.sh` once. Catalog edits never require deploy.
