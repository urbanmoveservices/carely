Write-Host ""
Write-Host "[CARELY] Stopping Carely-Med Gen AI..." -ForegroundColor Yellow

$connections = Get-NetTCPConnection -LocalPort 7111 -ErrorAction SilentlyContinue
if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "[CARELY] Stopped process $pid on port 7111." -ForegroundColor Green
        } catch {
            Write-Host "[WARNING] Could not stop process $pid." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[CARELY] No process found on port 7111." -ForegroundColor Yellow
}

Write-Host "[CARELY] Carely-Med Gen AI stopped." -ForegroundColor Green
Write-Host ""
