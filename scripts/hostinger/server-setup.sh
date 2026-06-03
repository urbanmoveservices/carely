#!/usr/bin/env bash
# One-time Hostinger VPS setup for Vaidya GPT.
# Run ON THE SERVER as root or deploy user.
set -euo pipefail

APP_DIR="${1:-/var/www/vaidya-gpt}"
GIT_REPO="${2:-https://github.com/urbanmoveservices/carely.git}"
BRANCH="${3:-main}"

echo ""
echo "Vaidya GPT — Hostinger server setup"
echo "  App dir:  $APP_DIR"
echo "  Git repo: $GIT_REPO"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js not found. Install Node 20+ first."
  echo "  Hostinger VPS: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && apt install -y nodejs"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "[WARN] PostgreSQL client not found. Install PostgreSQL and create DATABASE_URL before first deploy."
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[INFO] Installing pm2 globally..."
  npm install -g pm2
fi

mkdir -p "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone -b "$BRANCH" "$GIT_REPO" "$APP_DIR"
else
  echo "[INFO] Repo already cloned at $APP_DIR"
fi

cd "$APP_DIR"
mkdir -p storage/uploads logs

if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "[ACTION REQUIRED] Edit $APP_DIR/.env with production values:"
  echo "  - DATABASE_URL"
  echo "  - JWT_SECRET"
  echo "  - NEXT_PUBLIC_APP_URL / APP_URL"
  echo "  - OPENAI_API_KEY"
  echo "  - FILE_ENCRYPTION_KEY"
  echo ""
fi

echo ""
echo "Next steps:"
echo "  1. Edit .env on this server"
echo "  2. Create PostgreSQL database and run migrations"
echo "  3. From your PC: copy .env.deploy.example → .env.deploy and run npm run deploy:hostinger"
echo "  4. Optional: configure nginx using scripts/hostinger/nginx-vaidya-gpt.conf.example"
echo ""
