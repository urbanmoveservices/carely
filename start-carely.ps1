Set-Location $PSScriptRoot
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Carely-Med Gen AI — Startup Script"    -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# Check psql
try {
    $psqlVersion = psql --version
    Write-Host "[OK] psql: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] psql was not found. Install PostgreSQL or add PostgreSQL bin folder to PATH." -ForegroundColor Yellow
    Write-Host '  Example: $env:Path += ";C:\Program Files\PostgreSQL\16\bin"' -ForegroundColor Yellow
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "[CARELY] Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed." -ForegroundColor Red
        exit 1
    }
}

# Prisma generate
Write-Host ""
Write-Host "[CARELY] Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Prisma generate failed." -ForegroundColor Red
    exit 1
}

# Prisma migrate
Write-Host ""
Write-Host "[CARELY] Running database migrations..." -ForegroundColor Yellow
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Database connection failed. Make sure PostgreSQL is running and DATABASE_URL in .env is correct." -ForegroundColor Red
    exit 1
}

# Create admin
Write-Host ""
Write-Host "[CARELY] Creating admin user..." -ForegroundColor Yellow
npm run admin:create

# Start the app
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Carely-Med Gen AI is starting..."      -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  App:         http://localhost:7111"         -ForegroundColor Green
Write-Host "  Admin Login: http://localhost:7111/admin/login" -ForegroundColor Green
Write-Host ""

Start-Process "http://localhost:7111"
npm run dev
