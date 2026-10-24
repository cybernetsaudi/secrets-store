# Agent instructions — secrets-store (secrets.gatvia.com)

## GitHub (mandatory)

- **Account:** `cybernetsaudi` only
- **Repo:** https://github.com/cybernetsaudi/secrets-store
- **Never** use `iwaqasmaqbool` for this project (git remote, PAT, `gh auth`, or deploy tokens)

Tell the user when relevant: **Secrets = cybernetsaudi; never iwaqasmaqbool for secrets.**

Details: `docs/GITHUB.md`, `.cursor/rules/secrets-github-account.mdc`

## Deploy

- Local: `SSH_PASS=... ./scripts/deploy_secrets_gatvia.sh` or `./scripts/deploy_phase_a.sh`
- CI: `.github/workflows/deploy.yml` (FTPS on GitHub runners)
- Post-deploy: `php api/scripts/migrate_variant_dimensions.php` or Admin → Deploy → Run DB migration

## Stack

Next.js static export (`frontend/`) + PHP API (`backend-php/`) on Hostinger. Live: https://secrets.gatvia.com
