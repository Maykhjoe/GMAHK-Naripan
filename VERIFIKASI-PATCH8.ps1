param(
  [switch]$Production
)

$ErrorActionPreference = "Stop"

Write-Host "Patch 8 - Production readiness verification" -ForegroundColor Cyan

npm.cmd run typecheck
npm.cmd run lint
npm.cmd test

$package = Get-Content "package.json" -Raw | ConvertFrom-Json
if ($package.scripts.PSObject.Properties.Name -contains "test:security") {
  npm.cmd run test:security
}

if ($Production) {
  node scripts/check-production-env.mjs
} else {
  Write-Host "Environment production check dilewati. Jalankan ulang dengan -Production saat domain/env production sudah siap." -ForegroundColor Yellow
}

npm.cmd run build

Write-Host "`nPASS: typecheck, lint, tests, dan production build selesai." -ForegroundColor Green
if (-not $Production) {
  Write-Host "Sebelum go-live: .\VERIFIKASI-PATCH8.ps1 -Production" -ForegroundColor Yellow
}
