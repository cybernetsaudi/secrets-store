# GitHub — GATVIA Secrets (`secrets-store`)

## Official account (only one)

| Item | Value |
|------|--------|
| Owner | **`cybernetsaudi`** |
| Repo | **`secrets-store`** |
| URL | https://github.com/cybernetsaudi/secrets-store |
| Actions | https://github.com/cybernetsaudi/secrets-store/actions |

## Do not use `iwaqasmaqbool` for Secrets

The personal account **`iwaqasmaqbool`** is **not** used for this project.

- Do **not** set `origin` to `iwaqasmaqbool/secrets-store`
- Do **not** create PATs or `gh auth login` under `iwaqasmaqbool` for secrets.gatvia.com work
- If code was pushed to the wrong account, fix `origin` and push to **`cybernetsaudi/secrets-store`**

**Reminder:** Secrets store = **`cybernetsaudi` only.**

## Sign in (terminal)

```bash
export PATH="/Library/Developer/CommandLineTools/usr/bin:$PATH"

# Clear old GitHub login
printf "protocol=https\nhost=github.com\n\n" | git credential-osxkeychain erase

# Store PAT for cybernetsaudi (password = PAT, not GitHub password)
git credential-osxkeychain store <<EOF
protocol=https
host=github.com
username=cybernetsaudi
password=YOUR_PAT_HERE
EOF

cd ~/secrets-store
git remote set-url origin https://github.com/cybernetsaudi/secrets-store.git
./scripts/push-main.sh
```

`gh` config: `~/.config/gh/hosts.yml` should have `user: cybernetsaudi`.

## Repository secrets (Actions)

Set under **cybernetsaudi/secrets-store** → Settings → Secrets:

- `SSH_HOST` — `u950050130@141.136.39.245` (same server as FTP; port `65002`)
- `SSH_PORT` — `65002`
- `SSH_PASS` — Hostinger **SSH** password (local deploy / server token update)
- **`FTP_PASS`** — Hostinger **FTP** password (hPanel → Files → FTP Accounts). **Required for Actions deploy** if it differs from SSH (common). Workflow uses `FTP_PASS` first, then falls back to `SSH_PASS`.
- `NEXT_PUBLIC_API_URL` — `https://secrets.gatvia.com/api`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — optional

Deploy uses **FTPS** via `SamKirkland/FTP-Deploy-Action` (GitHub runners cannot SSH/rsync to Hostinger). A failed deploy with `530 Login incorrect` almost always means `FTP_PASS` / `SSH_PASS` does not match the FTP account password in hPanel.

Optional secrets (if not using `SSH_HOST=u950050130@145.79.209.14`):

- `FTP_HOST` — `141.136.39.245` (from hPanel FTP Access)
- `FTP_USER` — `u950050130.secrets.gatvia.com`
- `FTP_REMOTE_ROOT` — `public_html`

## Admin panel deploy token

Admin → Settings → Deploy → save a **`cybernetsaudi`** PAT with `repo` + `workflow` scope. Stored server-side as `github_deploy_token`.

## Setup script

```bash
gh auth login -h github.com   # as cybernetsaudi
export SSH_PASS='...'
./scripts/setup_github_actions.sh
```
