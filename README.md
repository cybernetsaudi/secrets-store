# secrets-store

E-commerce store for **https://secrets.gatvia.com** (Next.js static export + PHP API on Hostinger).

## GitHub account

| | |
|---|---|
| **Use** | [`cybernetsaudi`](https://github.com/cybernetsaudi) / [`secrets-store`](https://github.com/cybernetsaudi/secrets-store) |
| **Do not use** | `iwaqasmaqbool` — not for this repo, PAT, or deploy |

Full guide: [`docs/GITHUB.md`](docs/GITHUB.md)

## Operations (Option A)

**Products:** edit in admin — **no deploy**. Catalog is API + database.

**Code:** deploy from your Mac (runs QA before/after):

```bash
export SSH_PASS='your-hostinger-ssh-password'
./scripts/deploy_secrets_gatvia.sh
```

See [`docs/OPERATIONS.md`](docs/OPERATIONS.md).

### GitHub Actions (optional backup)

Manual workflow only — FTPS deploy when SSH script is unavailable. Not used for day-to-day catalog changes.

Repository: **https://github.com/cybernetsaudi/secrets-store** (`cybernetsaudi` only)

## Stack

- `frontend/` — Next.js 14
- `backend-php/` — PHP API
- `public_html/.htaccess` — Apache routing
