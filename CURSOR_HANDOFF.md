# GATVIA Secrets Store — Complete Project Handoff

> **For:** Next Cursor agent / developer continuing this project  
> **Live site:** https://secrets.gatvia.com  
> **Owner goal:** Turn this into a **fully branded GATVIA under-garments fashion store** — not Gulf United FC (GUFC), not a generic clone. The UI should feel like a premium fashion brand with four distinct product lines.

---

## ⚠️ Security notice

This document contains **production credentials** because the owner requested a full handoff. Treat it as confidential. Do not commit this file to a public repo without redacting secrets. Rotate passwords if this file is ever exposed.

---

## 1. Mission (read this first)

### What this site is

**GATVIA Secrets** is an e-commerce store for **under-garments** (lingerie, basics, premium lines) sold under the **GATVIA** brand. It was cloned from the Gulf United FC (GUFC) football club store and is being transformed to match the fashion aesthetic of **pk.gatvia.com**.

### What the owner wants

1. **Make it a brand** — every pixel, word, order number, email, and admin screen should say **GATVIA**, not GUFC.
2. **Four collection lines** with distinct visual identities:
   - **Classic** — everyday essentials, white + violet/purple
   - **Premium** — quiet luxury, ivory + gold confetti/shimmer
   - **Designer** — bold statement pieces, white + purple/pink confetti
   - **Limited** — rare drops, bright multicolor energy
3. **Fashion-forward UI** like pk.gatvia.com — hero carousels, collection rail, mega-menu, product cards, themed pages.
4. **Purge legacy GUFC content** — products, images, copy, payment merchant IDs, order prefixes.
5. **Real GATVIA products** — upload via admin with correct `collection` + `product_category`.
6. **Deploy reliably** — local deploy script works; GitHub Actions often fails from cloud runners.

### Brand voice (use this everywhere)

| Element | Direction |
|---------|-----------|
| Name | **GATVIA** (all caps in hero/eyebrows) |
| Tagline (brand) | *Wear Your Attitude* |
| Product type | Under-garments, intimates, essentials — **not** football kits |
| Tone | Confident, minimal, fashion-editorial — not sports/club |
| Collections | Classic · Premium · Designer · Limited Edition |
| Avoid | GUFC, Gulf United, football, kits, players, GUFC-verse |

---

## 2. Hosting & infrastructure

### Hostinger (production)

| Item | Value |
|------|-------|
| **hPanel** | https://hpanel.hostinger.com |
| **Domain** | `secrets.gatvia.com` |
| **SSH user** | `u950050130` |
| **SSH host** | `145.79.209.14` |
| **SSH port** | `65002` |
| **SSH password** | `!@#Acc3ss931!@#` |
| **Remote web root** | `~/domains/secrets.gatvia.com/public_html` |
| **API path on server** | `~/domains/secrets.gatvia.com/public_html/api/` |
| **PHP** | 8.1+ |
| **Web server** | Apache (`.htaccess` routing) |

### SSH quick connect

```bash
sshpass -p '!@#Acc3ss931!@#' ssh -p 65002 -o StrictHostKeyChecking=no u950050130@145.79.209.14
```

### MySQL (production)

| Item | Value |
|------|-------|
| **Database name** | `u950050130_secrets` |
| **Database user** | `u950050130_secrets` |
| **Database password** | `!@#Acc3ss931!@#` (same as SSH) |
| **Host** | `localhost` |
| **Port** | `3306` |

> Created in hPanel after initial clone. GUFC DB was imported from source server; data still contains GUFC products until purged.

### Backend `.env` (on server only — NOT in git)

Location: `~/domains/secrets.gatvia.com/public_html/api/.env`

Expected keys (from clone + updates):

```env
APP_ENV=production
DEBUG=0

DB_HOST=localhost
DB_PORT=3306
DB_NAME=u950050130_secrets
DB_USER=u950050130_secrets
DB_PASSWORD="!@#Acc3ss931!@#"

CORS_ALLOWED_ORIGINS=https://secrets.gatvia.com,https://www.secrets.gatvia.com
FRONTEND_URL=https://secrets.gatvia.com

# Payment / integrations (update for GATVIA — many still say GUFC)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=   # build-time, GitHub secret

TABBY_API_KEY=
TABBY_API_URL=https://api.tabby.ai/api/v2
TABBY_WEBHOOK_SECRET=

ORDER_NUMBER_PREFIX=GATVIA          # ⚠️ still defaults to GUFC in code if unset
ENCRYPTION_KEY=                     # generate unique key for production
UAE_VAT_RATE=0.05
CSRF_ENABLED=true
```

---

## 3. Admin access

| Item | Value |
|------|-------|
| **Admin URL** | https://secrets.gatvia.com/admin/login/ |
| **Username** | `admin` |
| **Password** | `!@#Acc3ss931!@#` (reset during setup; same as SSH/DB) |

### Admin sections

| Path | Purpose |
|------|---------|
| `/admin/dashboard/` | Overview |
| `/admin/products/` | Product CRUD |
| `/admin/products/new/` | Add product — **Collection Line** + **Product Category** dropdowns |
| `/admin/products/edit/` | Edit product |
| `/admin/orders/` | Orders |
| `/admin/discounts/` | Discount codes |
| `/admin/settings/visual/` | Logos, hero images, landing tiles |
| `/admin/settings/payment-gateways/` | Stripe, Tabby, Tamara, bank transfer |
| `/admin/settings/deploy/` | Trigger GitHub Actions rebuild |
| `/admin/settings/server-diagnostics/` | Server health |

### Admin API notes

- Session-based auth with cookies (`credentials: 'include'`)
- **CSRF token required** on POST/PUT/DELETE — see `frontend/lib/adminApi.ts`
- Use `getApiUrl()` from `@/lib/utils` — do NOT shadow it locally (caused infinite recursion on visual settings page)

---

## 4. GitHub & repositories

### GitHub account & repo

| Item | Value |
|------|-------|
| **Organization / owner** | `cybernetsaudi` |
| **Repository** | `secrets-store` |
| **Repo URL** | https://github.com/cybernetsaudi/secrets-store |
| **Default branch** | `main` |
| **Actions URL** | https://github.com/cybernetsaudi/secrets-store/actions |
| **Workflow file** | `.github/workflows/deploy.yml` |
| **Workflow name** | `Build and Deploy Store` |

### GitHub CLI auth (for setup scripts)

**Only `cybernetsaudi`.** Do **not** use `iwaqasmaqbool` for secrets-store (git, PAT, Actions, admin deploy token).

```bash
gh auth login -h github.com   # sign in as cybernetsaudi
gh auth status              # must show cybernetsaudi
git remote -v               # origin → github.com/cybernetsaudi/secrets-store.git
```

**Reminder:** Secrets = `cybernetsaudi` only. Never `iwaqasmaqbool` for secrets.

See `docs/GITHUB.md` and `.cursor/rules/secrets-github-account.mdc`.

### One-time GitHub Actions setup

Run from repo root after pushing code:

```bash
cd /Users/waqas/secrets-store
export SSH_PASS='your-hostinger-password'
# optional: export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_live_...'
./scripts/setup_github_actions.sh
```

This script:
1. Pushes `main` to `origin`
2. Sets GitHub Actions **repository secrets** (see table below)
3. Stores a `github_deploy_token` in the **server database** `settings` table (so Admin → Deploy can trigger workflows)
4. Triggers a test workflow run

### GitHub Actions repository secrets

| Secret name | Value |
|-------------|-------|
| `SSH_HOST` | `u950050130@145.79.209.14` |
| `SSH_PORT` | `65002` |
| `SSH_PASS` | Hostinger password (do not commit) |
| `NEXT_PUBLIC_API_URL` | `https://secrets.gatvia.com/api` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (optional) |

Set manually if needed:

```bash
gh secret set SSH_HOST --repo cybernetsaudi/secrets-store --body "u950050130@145.79.209.14"
gh secret set SSH_PORT --repo cybernetsaudi/secrets-store --body "65002"
gh secret set SSH_PASS --repo cybernetsaudi/secrets-store --body 'YOUR_HOSTINGER_PASSWORD'
gh secret set NEXT_PUBLIC_API_URL --repo cybernetsaudi/secrets-store --body "https://secrets.gatvia.com/api"
```

List secrets: `gh secret list --repo cybernetsaudi/secrets-store`

### Admin panel → GitHub deploy trigger

Admin → **Settings → Deploy** (`/admin/settings/deploy/`) can trigger the GitHub workflow remotely.

**How it works:**
- `AdminDeployController.php` calls GitHub API: `cybernetsaudi/secrets-store` workflow `deploy.yml` on branch `main`
- Token source (in order): `GITHUB_DEPLOY_TOKEN` in server `api/.env` → `github_deploy_token` in DB `settings` table
- Token needs `workflow` scope (PAT) or is auto-set by `setup_github_actions.sh` using `gh auth token`

**If admin deploy says "GitHub token not configured":**
```bash
# Re-run setup script, OR manually set on server:
# Option A — in api/.env:
GITHUB_DEPLOY_TOKEN=ghp_xxxxxxxx

# Option B — in MySQL settings table:
INSERT INTO settings (`key`, value, type) VALUES ('github_deploy_token', 'ghp_xxxxxxxx', 'string')
ON DUPLICATE KEY UPDATE value='ghp_xxxxxxxx';
```

### Local paths

| Item | Path / URL |
|------|------------|
| **Local repo** | `/Users/waqas/secrets-store` |
| **Reference UI repo** | `/Users/waqas/pk.gatvia.com` (fashion store to mirror) |
| **Original GUFC source** | `/Users/waqas/gufc` (cloned from live `store.gulfunitedfc.com`) |

### Git status note (as of handoff)

Many changes exist locally and may **not be pushed** to GitHub. Always check `git status` before assuming remote matches local. Modified areas include frontend theme/collections, admin product forms, PHP product model, `.htaccess`.

**Typical git workflow before deploy:**
```bash
cd /Users/waqas/secrets-store
git status
git add -A
git commit -m "Describe changes"
git push origin main
# then deploy (local script or GitHub Actions)
```

---

## 5. Tech stack

### Frontend

| Technology | Version / notes |
|------------|-----------------|
| **Next.js** | 14.1.3 |
| **React** | 18 |
| **TypeScript** | 5.3 |
| **Tailwind CSS** | 3.4 |
| **Framer Motion** | 11 (animations, hero transitions) |
| **Build mode** | `output: 'export'` — **static HTML** deployed to Hostinger |
| **Trailing slashes** | `true` — URLs end with `/` |

### Backend

| Technology | Notes |
|------------|-------|
| **PHP** | 8.1+, custom MVC in `backend-php/src/` |
| **Composer** | stripe-php, phpdotenv, monolog |
| **MySQL/MariaDB** | PDO |
| **Entry point** | `backend-php/index.php` → `routes/api.php` |

### Payments supported

- Stripe
- Tabby (BNPL)
- Tamara (BNPL)
- N-Genius
- Bank transfer

### Testing

- Playwright e2e in `frontend/e2e/` (optional)

---

## 6. Architecture overview

```
secrets.gatvia.com/
├── index.html              ← Next.js static export (homepage)
├── _next/                  ← JS/CSS bundles
├── products/               ← Pre-built product pages + client-side routing
├── admin/                  ← Admin panel (static)
├── api/                    ← PHP backend
│   ├── index.php
│   ├── .env                ← secrets (server only)
│   ├── uploads/            ← product images
│   └── vendor/
└── .htaccess               ← Apache routing (API first, then static, then SPA fallback)
```

### Request routing (`.htaccess`)

1. `/api/*` → `api/index.php` (except `/api/uploads/` served directly)
2. Existing files → served as-is
3. Directories with `index.html` → served
4. Everything else → `index.html` (client-side routing)

### Static export limitation

Product pages are pre-built at deploy time via `generateStaticParams()`. **New product IDs still work** via client-side fetch on `/products/[id]/`, but adding IDs to static params improves first paint. After adding products, **rebuild + redeploy**.

---

## 7. The four GATVIA collections

Defined in `frontend/lib/collections.ts`:

| ID | Widget label | Theme (`data-theme`) | Visual identity |
|----|--------------|----------------------|-----------------|
| `classic` | Classic | `classic` | Violet/purple, everyday |
| `premium` | Premium | `premium` | Ivory + gold confetti |
| `designer` | Designer | `designer` | White + purple/pink confetti |
| `limited` | Limited | `limited` | Multicolor, energetic |

### Per-collection hero copy (homepage)

| Collection | Eyebrow | Headline | Subtitle |
|------------|---------|----------|----------|
| Brand (at rest) | GATVIA | Wear Your / Attitude | Four lines. One attitude. Hover above to explore… |
| Classic | GATVIA · Classic Line | Classic / Collection | Everyday under-garments — comfort, fit, confidence |
| Premium | GATVIA · Premium Line | Quiet / Luxury | Ivory canvas. Gold foil details. Elevated craft. |
| Designer | GATVIA · Designer Line | Bold / Signal | Pure white grounds. Violet energy. Statement pieces. |
| Limited | GATVIA · Limited Line | Limited / Edition | Numbered drops. Vibrant energy. Once gone, gone. |

### Product categories per collection

Defined in `frontend/lib/categories.ts` — e.g. Classic has `bras-bralettes`, Premium has `silk-satin`, etc.

### URL patterns

```
/products/?collection=classic
/products/?collection=premium&category=silk-satin
```

Filtering is **client-side** in `frontend/app/products/page.tsx` using `filterProductsByCollection()` — the public PHP API does **not** yet filter by `collection` query param server-side.

---

## 8. Key frontend files

| File | Purpose |
|------|---------|
| `frontend/app/page.tsx` | Homepage — hero, collection rail, trending carousel |
| `frontend/app/layout.tsx` | Root layout, GATVIA metadata |
| `frontend/app/globals.css` | Theme CSS variables, collection tints, hero overlays |
| `frontend/lib/collections.ts` | Collection definitions, hero copy, URLs |
| `frontend/lib/categories.ts` | Per-collection product categories |
| `frontend/contexts/ThemeContext.tsx` | Applies `data-theme` from URL |
| `frontend/components/CollectionRail.tsx` | "Choose Your Line" hover rail on hero |
| `frontend/components/CollectionMegaMenu.tsx` | Header hover mega-menu per collection |
| `frontend/components/CollectionAmbience.tsx` | Confetti/particle effects (Premium, Designer) |
| `frontend/components/Header.tsx` | Nav, search, utility bar |
| `frontend/components/Footer.tsx` | Footer links |
| `frontend/components/ProductCard.tsx` | Product grid card |
| `frontend/lib/api.ts` | Public API client |
| `frontend/lib/utils.ts` | `getApiUrl()`, `getImageUrl()` |
| `frontend/next.config.js` | Static export config |

---

## 9. Key backend files

| File | Purpose |
|------|---------|
| `backend-php/index.php` | API bootstrap, CORS, DB init |
| `backend-php/routes/api.php` | All routes |
| `backend-php/src/Models/Product.php` | Product CRUD — `collection`, `product_category` columns |
| `backend-php/src/Controllers/AdminProductController.php` | Admin product API |
| `backend-php/src/Controllers/AdminSettingsController.php` | Visual settings, logos |
| `backend-php/src/Models/Order.php` | Orders — `ORDER_NUMBER_PREFIX` env (default `GUFC` ⚠️) |
| `backend-php/database/add_collection_column.sql` | Migration: `products.collection` |
| `backend-php/database/add_product_category_column.sql` | Migration: `products.product_category` |
| `public_html/.htaccess` | Apache routing |

---

## 10. What has been completed

### Infrastructure
- [x] GUFC store cloned to `secrets.gatvia.com`
- [x] Database imported to `u950050130_secrets`
- [x] API `.env` updated for new domain/CORS
- [x] Local deploy script: `scripts/deploy_secrets_gatvia.sh`
- [x] GitHub Actions workflow: `.github/workflows/deploy.yml`
- [x] Admin `/admin/` 403 fixed (redirect to login)

### Branding & UI (partial)
- [x] Homepage fashion layout ported from pk.gatvia.com style
- [x] GATVIA title/metadata in layout
- [x] Admin panel recolored to GATVIA violet/fuchsia
- [x] Collection theme system (`data-theme` CSS variables)
- [x] Collection rail on hero with hover preview
- [x] Hero banner two-mode UX (brand at rest → collection on hover)
- [x] Collection mega-menu in header
- [x] Collection ambience (confetti for Premium/Designer)
- [x] Fixed collection rail hover layout shift

### Products & admin
- [x] `products.collection` DB column + admin dropdown
- [x] `products.product_category` DB column + admin dropdown
- [x] Admin product save includes `collection` in JSON + FormData
- [x] Products page filters by collection + category (client-side)

---

## 11. What still needs to be done (priority order)

### 🔴 Critical — branding

1. **Purge all GUFC content**
   - Delete GUFC products in admin (or bulk SQL)
   - Replace hero/tile images in Admin → Visual Settings with GATVIA fashion photography
   - Upload GATVIA logos (`/branding/gatvia-logo-*.png` referenced in code but may not exist in `frontend/public/`)
   - Remove `public_html/index.php` GUFC-verse landing page if still on server

2. **Replace every GUFC string in codebase**
   - `ORDER_NUMBER_PREFIX` → `GATVIA` in server `.env`
   - `backend-php/src/Models/Order.php` default prefix
   - Tabby `merchant_id` scripts still use `GUFC`
   - `backend-php/index.php` comment still says "Gulf United FC"
   - `composer.json` name/description
   - `frontend/package.json` name `gufc-frontend`
   - `frontend/app/products/[id]/layout.tsx` still defaults API to `https://gatvia.pk/api` ⚠️

3. **Footer cleanup**
   - `Footer.tsx` has placeholder links (Men's Clothing, Kids, etc.) — replace with GATVIA collection/category links

### 🟠 High — product experience

4. **Upload real GATVIA under-garment products**
   - Assign each product a `collection` and `product_category`
   - Add proper images, descriptions, variants (sizes)

5. **Port features from pk.gatvia.com** (reference repo)
   - Product reviews (`ProductReview` model, `ReviewSection`, `ReviewForm`)
   - Image gallery + zoom modal (`ImageGallery`, `ImageModal`)
   - Wishlist
   - User accounts / email subscriptions
   - See `pk.gatvia.com/PRODUCT_PAGE_IMPLEMENTATION_STATUS.md`

6. **Homepage sections still generic**
   - "The Essentials" grid still links to Men/Women/Kids clothing — should be collection/category focused for under-garments
   - "Latest Drops / Iconic Looks" block needs GATVIA copy and imagery

### 🟡 Medium — technical

7. **Server-side collection filter** in `Product::all()` — optional performance improvement

8. **Men / Women / Unisex filter** — owner mentioned as optional future feature

9. **Git push** — commit and push all local changes to `cybernetsaudi/secrets-store`

10. **GitHub Actions deploy** — often blocked by Hostinger SSH from cloud IPs. Options:
    - Keep using local `scripts/deploy_secrets_gatvia.sh`
    - Set up self-hosted GitHub runner on owner's machine

11. **Payment gateway reconfiguration** — Tabby merchant code, Stripe keys, etc. for GATVIA merchant account (not GUFC)

### 🟢 Low — polish

12. Mobile menu in header (icon exists, not wired)
13. Product page layout parity with pk.gatvia.com
14. SEO metadata per collection page
15. Favicon/apple-touch assets (referenced in layout, may be missing)

---

## 12. Rebuild & deploy (complete guide)

### When you must rebuild & redeploy

| Change type | Rebuild needed? | Why |
|-------------|-----------------|-----|
| Frontend React/TS/CSS | **Yes** | Static export — HTML/JS baked at build time |
| New product pages (better SEO) | **Yes** | `generateStaticParams()` runs at build |
| PHP backend only | **No** (rsync API is enough) | PHP runs server-side |
| Server `.env` only | **No** | Not part of deploy artifact |
| Admin visual images (uploaded via API) | **No** | Stored in `api/uploads/`, not in git |
| `.htaccess` changes | **Redeploy** `.htaccess` only | Included in deploy script |

---

### Method 1 — Local deploy script (RECOMMENDED, most reliable)

Hostinger often **blocks SSH from GitHub cloud runners**. Use this when Actions times out.

```bash
cd /Users/waqas/secrets-store
export SSH_PASS='your-hostinger-password'
./scripts/deploy_secrets_gatvia.sh
```

**Script location:** `scripts/deploy_secrets_gatvia.sh`

**Optional overrides:**
```bash
export SSH_HOST='u950050130@145.79.209.14'
export SSH_PORT='65002'
export REMOTE_PATH='~/domains/secrets.gatvia.com/public_html'
export API_URL='https://secrets.gatvia.com/api'
```

**What the script does (step by step):**
1. `cd frontend && NEXT_PUBLIC_API_URL=https://secrets.gatvia.com/api npm run build`
   - Output goes to `frontend/out/` (static HTML + `_next/` assets)
2. `rsync frontend/out/` → server `public_html/`
   - `--delete` removes old files
   - **Excludes:** `api/`, `.htaccess` (so live API is not wiped)
3. `rsync public_html/.htaccess` → server
4. `rsync backend-php/` → server `public_html/api/`
   - **Excludes:** `vendor/`, `.env`, `.git`, `tests/`, `*.md`
   - **Server `.env` is preserved** — never overwritten
5. SSH: `cd api && composer install --no-dev --optimize-autoloader`
6. Prints: `Done: https://secrets.gatvia.com/`

**Requires on your Mac:** `sshpass`, `rsync`, `npm`, `node` (Node 18 recommended)

```bash
# Install sshpass on macOS if missing:
brew install hudochenkov/sshpass/sshpass
```

---

### Method 2 — Manual rebuild (frontend only, for debugging)

```bash
cd /Users/waqas/secrets-store/frontend
npm ci                    # or npm install
NEXT_PUBLIC_API_URL=https://secrets.gatvia.com/api npm run build
# Check output:
ls -la out/index.html
# Then rsync manually or run full deploy script
```

**PHP-only deploy (no frontend rebuild):**
```bash
export SSH_PASS='your-hostinger-password'
rsync -avz -e "sshpass -e ssh -p 65002 -o StrictHostKeyChecking=no" \
  --exclude='vendor' --exclude='.env' --exclude='.git' \
  backend-php/ u950050130@145.79.209.14:~/domains/secrets.gatvia.com/public_html/api/

sshpass -p "$SSH_PASS" ssh -p 65002 u950050130@145.79.209.14 \
  "cd ~/domains/secrets.gatvia.com/public_html/api && composer install --no-dev --optimize-autoloader"
```

---

### Method 3 — GitHub Actions (cloud deploy)

**Workflow:** `.github/workflows/deploy.yml`  
**Name:** `Build and Deploy Store`  
**Trigger:** Manual only (`workflow_dispatch`)

**Option A — GitHub website:**
1. Go to https://github.com/cybernetsaudi/secrets-store/actions
2. Click **Build and Deploy Store**
3. Click **Run workflow** → branch `main` → Run

**Option B — GitHub CLI:**
```bash
gh workflow run deploy.yml --repo cybernetsaudi/secrets-store \
  -f reason="Manual rebuild from CLI"
gh run list --repo cybernetsaudi/secrets-store --limit 3
gh run watch   # follow latest run
```

**Option C — Admin panel:**
1. Log in at https://secrets.gatvia.com/admin/login/
2. Go to **Settings → Deploy**
3. Click **Rebuild & Deploy** (triggers same workflow via GitHub API)
4. Modal shows progress; link to GitHub Actions logs

**What the workflow does:**
1. Checkout code from GitHub (`main` branch — **must be pushed first**)
2. `npm ci` + `npm run build` in `frontend/` (uses `NEXT_PUBLIC_API_URL` secret)
3. Rsync `frontend/out/` to Hostinger via SSH
4. Rsync `.htaccess`
5. Rsync `backend-php/` to `api/`
6. `composer install --no-dev` on server

**Known issue:** GitHub-hosted runners (`ubuntu-latest`) often get **SSH connection timeout** to Hostinger `145.79.209.14:65002`. If Actions fails at the rsync step, use **Method 1** (local deploy) or set up a **self-hosted GitHub runner** on the owner's Mac.

---

### Deploy checklist (after every deploy)

- [ ] https://secrets.gatvia.com loads homepage
- [ ] https://secrets.gatvia.com/api/products returns JSON
- [ ] https://secrets.gatvia.com/admin/login/ works
- [ ] Hard refresh (Cmd+Shift+R) to bust browser cache
- [ ] Collection rail hover changes hero text + theme
- [ ] `/products/?collection=premium` filters correctly
- [ ] New product IDs load on `/products/{id}/`

### Troubleshooting deploy

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Actions SSH timeout | Hostinger blocks GitHub IPs | Use local `deploy_secrets_gatvia.sh` |
| Site shows old UI | Browser cache or deploy didn't run | Hard refresh; verify `out/` was rsynced |
| API 500 after deploy | `composer install` failed | SSH in, run composer manually in `api/` |
| Admin deploy "no token" | `github_deploy_token` missing | Run `setup_github_actions.sh` or set PAT |
| `.env` wiped | Should never happen — script excludes it | Restore from backup; re-set DB credentials |
| `sshpass: command not found` | Missing on Mac | `brew install hudochenkov/sshpass/sshpass` |
| Build fails locally | Node version | Use Node 18: `nvm use 18` |

---

## 13. Local development

```bash
cd /Users/waqas/secrets-store/frontend
npm install
NEXT_PUBLIC_API_URL=https://secrets.gatvia.com/api npm run dev
# → http://localhost:3000
```

For local PHP API (optional):

```bash
cd /Users/waqas/secrets-store/backend-php
composer install
cp .env.example .env   # if exists; configure DB
php -S localhost:8080 index.php
```

> Most frontend dev points at **production API** on secrets.gatvia.com.

---

## 14. Database migrations

Run on server via phpMyAdmin or SSH:

```bash
mysql -u u950050130_secrets -p'!@#Acc3ss931!@#' u950050130_secrets < add_collection_column.sql
mysql -u u950050130_secrets -p'!@#Acc3ss931!@#' u950050130_secrets < add_product_category_column.sql
```

Files in `backend-php/database/`. Other migrations from GUFC era may already be applied.

### Key `products` columns

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `collection` | varchar(50) | `classic` | Product line: classic, premium, designer, limited |
| `product_category` | varchar(80) | NULL | Category slug within collection |
| `short_description` | varchar(300) | NULL | Product blurb (legacy: was misused for collection) |

---

## 15. Reference site: pk.gatvia.com

| Item | Value |
|------|-------|
| **Live** | https://gatvia.pk (pk.gatvia.com) |
| **Local repo** | `/Users/waqas/pk.gatvia.com` |
| **Deploy script** | `pk.gatvia.com/deploy_pk_gatvia.sh` |
| **Same Hostinger account** | `u950050130@145.79.209.14:65002` |

Use pk.gatvia.com as the **UI/UX reference** for:
- Product detail page (reviews, image zoom)
- Homepage layout patterns
- Admin product forms
- Fashion copy tone

**Do not** confuse the two domains — secrets.gatvia.com is under-garments; pk may differ in product mix.

---

## 16. Theme system (how it works)

### CSS

`frontend/app/globals.css` defines `[data-theme="classic"]`, `premium`, `designer`, `limited` with CSS variables:
- `--brand-primary`, `--brand-accent`, `--brand-bg`, `--brand-text`, etc.
- Utility classes: `.theme-page`, `.theme-header`, `.theme-btn-primary`, `.theme-muted`

### Runtime

1. **Homepage:** `page.tsx` sets `data-theme` on hover via CollectionRail `onPreview`
2. **Other pages:** `ThemeContext` reads `?collection=` from URL
3. **Ambience:** `CollectionAmbience.tsx` renders confetti on Premium/Designer

### Adding a new theme

1. Add entry to `COLLECTIONS` in `collections.ts`
2. Add `[data-theme="newtheme"]` block in `globals.css`
3. Add hero tint classes `.hero-tint-newtheme`, `.hero-copy--newtheme`
4. Run DB migration if new collection ID needed

---

## 17. Known bugs & gotchas

| Issue | Detail / fix |
|-------|----------------|
| GitHub Actions SSH timeout | Hostinger blocks cloud runner IPs — use local deploy |
| `generateStaticParams` wrong API | `products/[id]/layout.tsx` defaults to `gatvia.pk` — change to `secrets.gatvia.com` |
| Order numbers say GUFC | Set `ORDER_NUMBER_PREFIX=GATVIA` in `.env` |
| Branding assets missing | `collections.ts` references `/branding/gatvia-logo-*.png` — add to `frontend/public/branding/` |
| GUFC products in DB | All default to `collection=classic` until re-tagged or deleted |
| Static export + search params | Some pages read `window.location.search` as fallback — keep this pattern |
| Admin visual settings crash | Never redefine `getImageUrl` locally in that page — import from `@/lib/utils` |
| CSRF on admin writes | Always use `adminApi.ts` helpers |

---

## 18. Instructions for the next Cursor agent

### Your mandate

> **Transform secrets.gatvia.com into a polished GATVIA fashion brand.**  
> The code foundation exists. The owner needs you to finish branding, content, and feature parity with pk.gatvia.com — not more infrastructure cloning.

### Workflow

1. Read this file completely.
2. Open https://secrets.gatvia.com and compare with https://gatvia.pk.
3. Check `git status` in `/Users/waqas/secrets-store` — many changes may be uncommitted.
4. Make changes locally → `npm run build` → deploy with `scripts/deploy_secrets_gatvia.sh`.
5. Test admin at https://secrets.gatvia.com/admin/login/.
6. When purging GUFC products, **back up DB first** via phpMyAdmin or mysqldump.

### Do

- Use GATVIA voice and under-garments positioning everywhere
- Match pk.gatvia.com quality for product pages and interactions
- Keep collection theme system consistent (Classic / Premium / Designer / Limited)
- Use `getApiUrl()` / `getImageUrl()` from `@/lib/utils`
- Deploy after meaningful frontend changes (static export)
- Ask before force-pushing or deleting production data

### Don't

- Leave GUFC references in user-visible copy
- Commit `.env` or this handoff file with secrets to public GitHub
- Assume GitHub Actions deploy works without testing
- Break CSRF/session auth on admin endpoints
- Over-engineer — minimal focused diffs preferred

### Suggested next tasks (pick up where we left off)

1. Add GATVIA logo files to `frontend/public/branding/`
2. Upload hero + tile images via Admin → Visual
3. Fix `products/[id]/layout.tsx` API URL
4. Global find-replace GUFC → GATVIA in backend defaults
5. Purge GUFC products; add 4–8 real products per collection
6. Port product reviews from pk.gatvia.com
7. Update homepage "Essentials" section for under-garment categories
8. Commit + push to GitHub
9. Deploy and verify live

---

## 19. Quick reference commands

```bash
# Deploy
export SSH_PASS='your-hostinger-password'
./scripts/deploy_secrets_gatvia.sh

# SSH to server
sshpass -p '!@#Acc3ss931!@#' ssh -p 65002 u950050130@145.79.209.14

# Build frontend only
cd frontend && NEXT_PUBLIC_API_URL=https://secrets.gatvia.com/api npm run build

# MySQL on server
mysql -u u950050130_secrets -p'!@#Acc3ss931!@#' u950050130_secrets

# Test API
curl -s https://secrets.gatvia.com/api/products | head -c 500
```

---

## 20. Contact & ownership

- **GitHub org:** cybernetsaudi
- **Repo:** secrets-store
- **Brand:** GATVIA (gatvia.com ecosystem)
- **This store:** secrets.gatvia.com — under-garments / intimates line

---

*Document generated for Cursor agent handoff. Update this file as the project evolves — especially the "What still needs to be done" section.*
