# secrets-store

E-commerce store for **https://secrets.gatvia.com** (Next.js static export + PHP API on Hostinger).

## Deploy

### GitHub Actions (recommended)

Admin panel → Settings → Deploy → Rebuild, or run the workflow manually:

`Actions` → `Build and Deploy Store` → `Run workflow`

Required repository secrets: `SSH_HOST`, `SSH_PORT`, `SSH_PASS`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional).

### Local script

```bash
export SSH_PASS='your-hostinger-password'
./scripts/deploy_secrets_gatvia.sh
```

## Stack

- `frontend/` — Next.js 14
- `backend-php/` — PHP API
- `public_html/.htaccess` — Apache routing
