Set-Location $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Vaidya GPT — Hostinger Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".env.deploy")) {
    Write-Host "[WARN] .env.deploy not found." -ForegroundColor Yellow
    Write-Host "       Copy .env.deploy.example to .env.deploy and fill in SSH details." -ForegroundColor Yellow
    Write-Host ""
}

$commitMsg = $args -join " "
if ($commitMsg) {
    npm run deploy:hostinger -- $commitMsg
} else {
    npm run deploy:hostinger
}

exit $LASTEXITCODE
