$ErrorActionPreference = "Stop"

Write-Host "GMAHK Naripan - cleanup Auth email/OTP lama" -ForegroundColor Cyan

$paths = @(
  ".\src\app\auth\accept-invite",
  ".\src\app\auth\forgot-password",
  ".\src\app\auth\reset-password",
  ".\src\app\auth\verify-reset",
  ".\src\app\auth\callback",
  ".\src\app\api\auth\accept-invite",
  ".\src\app\api\auth\forgot-password",
  ".\src\app\api\auth\verify-reset-otp",
  ".\src\components\auth\auth-brand.tsx",
  ".\src\components\auth\otp-code-input.tsx",
  ".\docs\SUPABASE-AUTH-OTP-SETUP.md",
  ".\docs\templates\invite-otp.html",
  ".\docs\templates\recovery-otp.html",
  ".\README-PATCH-AUTH-OTP.txt",
  ".\TERAPKAN-AUTH-OTP-RECOVERY-INVITE.ps1"
)

foreach ($path in $paths) {
  if (Test-Path $path) {
    Remove-Item $path -Recurse -Force
    Write-Host "Removed: $path" -ForegroundColor DarkGray
  }
}

if (Test-Path ".\src\components\auth") {
  $remaining = Get-ChildItem ".\src\components\auth" -Force -ErrorAction SilentlyContinue
  if (-not $remaining) {
    Remove-Item ".\src\components\auth" -Force -ErrorAction SilentlyContinue
  }
}

Remove-Item ".\.next" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Auth lama sudah dibersihkan." -ForegroundColor Green
Write-Host "Langkah berikutnya WAJIB: npx.cmd supabase db push" -ForegroundColor Yellow
Write-Host "Setelah migration, username awal Super Admin lama adalah: superadmin" -ForegroundColor Yellow
