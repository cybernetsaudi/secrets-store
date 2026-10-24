# Operations — Option A (API-driven catalog)

## Day to day (merchandising)

- **Add / edit products, images, prices, variants** → Admin only. **No deploy.**
- Data is served from **MySQL via the PHP API**.

## When to deploy code

Deploy only when **application code** changes (frontend, API, `.htaccess`):

```bash
export SSH_PASS='your-hostinger-ssh-password'
./scripts/deploy_secrets_gatvia.sh
```

This runs **local QA** (build + PHP lint) then **production QA** (HTTP smoke tests) after upload.

## Product URLs (no rebuild per product)

- Static export contains one shell: `/products/0/`
- Apache rewrites `/products/{any-id}/` → that shell
- The browser loads product data from `GET /api/products/{id}`

If product URLs redirect to `product-view.html`, the live `.htaccess` is outdated — run `./scripts/deploy_secrets_gatvia.sh` (or FTPS backup workflow) to publish `public_html/.htaccess`.

## GitHub Actions (optional)

Use only as a **backup** deploy path (FTPS). Not required for catalog updates.

Admin → **Deploy code (optional)** → GitHub Actions, or run workflow manually on GitHub.

## QA scripts

| Script | When |
|--------|------|
| `./scripts/qa_local.sh` | Before deploy (build + checks) |
| `./scripts/qa_production.sh` | After deploy or to verify live site |
