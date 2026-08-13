$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pagePath = Join-Path $projectRoot "src\app\page.tsx"
$goodBackup = "$pagePath.gallery-before-module.bak"
$safeIntegrator = Join-Path $projectRoot "TERAPKAN-INTEGRASI-HOMEPAGE-GALERI.ps1"

if (-not (Test-Path $pagePath)) {
  throw "src/app/page.tsx tidak ditemukan. Pastikan hotfix diextract ke root project."
}
if (-not (Test-Path $safeIntegrator)) {
  throw "TERAPKAN-INTEGRASI-HOMEPAGE-GALERI.ps1 tidak ditemukan. Extract seluruh isi hotfix."
}
if (-not (Test-Path $goodBackup)) {
  throw "Backup src/app/page.tsx.gallery-before-module.bak tidak ditemukan. Jangan lanjut agar homepage tidak tertimpa secara tidak aman."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$corruptBackup = "$pagePath.gallery-encoding-before-fix-$timestamp.bak"

# Simpan kondisi saat ini untuk rollback, lalu kembalikan homepage tepat ke kondisi
# sebelum script Galeri lama mengubah encoding.
Copy-Item -LiteralPath $pagePath -Destination $corruptBackup -Force
Copy-Item -LiteralPath $goodBackup -Destination $pagePath -Force

Write-Host "Homepage dikembalikan dari backup UTF-8 sebelum integrasi Galeri." -ForegroundColor Cyan
Write-Host "Backup kondisi sebelum hotfix: $corruptBackup" -ForegroundColor DarkGray

# Terapkan kembali integrasi Galeri memakai reader/writer UTF-8 eksplisit.
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $safeIntegrator

Write-Host "" 
Write-Host "Hotfix encoding selesai." -ForegroundColor Green
Write-Host "Karakter seperti en dash dan smart quote seharusnya kembali normal tanpa menghapus Motion Patch 9." -ForegroundColor Green
