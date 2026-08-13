$ErrorActionPreference = "Stop"

$required = @(
  "src\components\admin\gallery-manager.tsx",
  "src\lib\data\gallery.ts",
  "src\app\api\admin\gallery\route.ts",
  "src\app\api\admin\gallery\media\route.ts",
  "src\app\api\admin\gallery\[albumId]\images\route.ts",
  "src\app\api\admin\gallery\[albumId]\images\[imageId]\route.ts",
  "src\app\(public)\galeri\[slug]\page.tsx",
  "supabase\migrations\202608120001_gallery_module_complete.sql"
)

$missing = @()
foreach ($item in $required) {
  if (-not (Test-Path -LiteralPath $item)) { $missing += $item }
}

if ($missing.Count -gt 0) {
  Write-Host "File modul Galeri belum lengkap:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "File modul Galeri lengkap." -ForegroundColor Green
Write-Host "Jalankan typecheck, lint, test, test:security, dan build sebelum live." -ForegroundColor Cyan
