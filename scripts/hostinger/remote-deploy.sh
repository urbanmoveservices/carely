#!/usr/bin/env bash
# Runs on the Hostinger VPS after SSH. Do not run locally.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$PWD}"
GIT_BRANCH="${GIT_BRANCH:-main}"
PM2_APP_NAME="${PM2_APP_NAME:-vaidya-gpt}"
NODE_ENV="${NODE_ENV:-production}"

cd "$DEPLOY_PATH"

echo ""
echo "=========================================="
echo "  Vaidya GPT — Hostinger remote deploy"
echo "=========================================="
echo "  Path:   $DEPLOY_PATH"
echo "  Branch: $GIT_BRANCH"
echo ""

if [ ! -f package.json ]; then
  echo "[ERROR] package.json not found in $DEPLOY_PATH"
  echo "        Clone the repo here first, then re-run deploy."
  exit 1
fi

if [ ! -f .env ]; then
  echo "[ERROR] .env missing on server. Create $DEPLOY_PATH/.env before deploying."
  exit 1
fi

echo "[1/6] Fetch latest code..."
git fetch origin "$GIT_BRANCH"
git checkout "$GIT_BRANCH"
git pull --ff-only origin "$GIT_BRANCH"

echo "[2/6] Install dependencies..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "[3/6] Prisma generate..."
npx prisma generate

echo "[4/6] Database migrations..."
npx prisma migrate deploy

echo "[5/6] Production build..."
export NODE_ENV=production
npm run build

echo "[6/6] Restart app..."
mkdir -p storage/uploads
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$PM2_APP_NAME" --update-env
  else
    pm2 start ecosystem.config.cjs --only "$PM2_APP_NAME"
  fi
  pm2 save
else
  echo "[WARN] pm2 not found — starting with npm run start in background (not recommended for production)."
  nohup npm run start > logs/app.log 2>&1 &
fi

echo ""
echo "Deploy complete."
echo ""
