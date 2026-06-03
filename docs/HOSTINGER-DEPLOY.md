# Hostinger deployment (Vaidya GPT)

Deploy from your PC to a **Hostinger VPS** (Node.js + PostgreSQL). The script pushes to GitHub, then SSHs into the server to pull, build, migrate, and restart with PM2.

## One-time server setup

1. Create a **Hostinger VPS** (Ubuntu recommended) and note the SSH IP/hostname.
2. SSH into the server and run:

```bash
curl -fsSL https://raw.githubusercontent.com/urbanmoveservices/carely/main/scripts/hostinger/server-setup.sh | bash -s /var/www/vaidya-gpt
```

Or clone manually:

```bash
sudo mkdir -p /var/www
sudo git clone -b main https://github.com/urbanmoveservices/carely.git /var/www/vaidya-gpt
cd /var/www/vaidya-gpt
cp .env.example .env
# Edit .env with production DATABASE_URL, JWT_SECRET, APP_URL, etc.
npm install -g pm2
```

3. Install **PostgreSQL**, create the database, and set `DATABASE_URL` in `/var/www/carely/.env`.
4. **Point domain DNS to VPS IP** — see [DOMAIN-DNS-SETUP.md](DOMAIN-DNS-SETUP.md) if you see Hostinger parking page.
5. Configure **nginx + SSL** on the VPS:

```bash
cd /var/www/carely
bash scripts/hostinger/setup-nginx-ssl.sh vaidya-gpt.com your-email@example.com
```

6. Enable SSH key login from your PC to the VPS.

## One-time local setup

```powershell
copy .env.deploy.example .env.deploy
```

Edit `.env.deploy`:

```env
HOSTINGER_SSH_HOST=123.456.789.0
HOSTINGER_SSH_USER=root
HOSTINGER_SSH_PORT=22
HOSTINGER_DEPLOY_PATH=/var/www/vaidya-gpt
HOSTINGER_SSH_KEY=C:\Users\you\.ssh\id_ed25519
GIT_REMOTE=origin
GIT_BRANCH=main
PM2_APP_NAME=vaidya-gpt
```

## Deploy (git push + Hostinger)

From the project folder on Windows:

```powershell
npm run deploy:hostinger -- "Deploy: your commit message"
```

Or double-click `deploy-hostinger.bat`.

### What the script does

1. `npm run audit:urls`
2. `npm run prod:check`
3. `git add` / `git commit` (if needed) / `git push` to GitHub
4. SSH → `git pull` → `npm ci` → `prisma migrate deploy` → `npm run build` → `pm2 restart`

### Skip options (in `.env.deploy`)

| Variable | Effect |
|----------|--------|
| `DEPLOY_SKIP_CHECKS=true` | Skip audit + prod:check |
| `DEPLOY_SKIP_GIT=true` | Skip commit/push |
| `DEPLOY_SKIP_REMOTE=true` | Push only, no SSH |
| `DEPLOY_DRY_RUN=true` | Print plan, run nothing |

### Razorpay webhook on Hostinger

Set in Razorpay Dashboard (use your production domain from env):

```text
https://your-domain.com/api/billing/razorpay/webhook
```

Ensure `NEXT_PUBLIC_APP_URL` and `APP_URL` in server `.env` match that domain.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `git push` fails | Configure GitHub credentials or SSH keys on your PC |
| SSH connection refused | Check Hostinger firewall, SSH port, and `HOSTINGER_SSH_*` in `.env.deploy` |
| `.env missing on server` | Create `/var/www/vaidya-gpt/.env` on the VPS |
| Build fails on server | SSH in, `cd` to deploy path, run `npm run build` and read errors |
| App not reachable | Confirm PM2 running (`pm2 status`) and nginx proxy to port 7111 |

## Shared hosting note

This app needs **Node.js 20+**, **PostgreSQL**, long-running processes, and file uploads. Use a **VPS** or Hostinger cloud plan with Node support—not basic shared PHP hosting.
