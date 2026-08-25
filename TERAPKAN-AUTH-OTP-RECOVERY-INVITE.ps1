$ErrorActionPreference = "Stop"

$root = Get-Location
$forgotPath = Join-Path $root "src\app\auth\forgot-password\page.tsx"

if (-not (Test-Path $forgotPath)) {
  throw "File tidak ditemukan: $forgotPath. Jalankan script dari root project gmahk-naripan."
}

$utf8 = [System.Text.UTF8Encoding]::new($false)
$newLine = [Environment]::NewLine
$content = [System.IO.File]::ReadAllText($forgotPath, [System.Text.Encoding]::UTF8)

if ($content -match 'router\.push\("/auth/verify-reset"\)') {
  Write-Host "Forgot Password sudah terintegrasi dengan OTP. Tidak ada perubahan tambahan." -ForegroundColor Yellow
  exit 0
}

$backup = "$forgotPath.auth-otp-before-patch.bak"
[System.IO.File]::WriteAllText($backup, $content, $utf8)
Write-Host "Backup dibuat: $backup"

# Tambah useRouter import tanpa merusak styling/branding Forgot Password yang sudah diedit manual.
if ($content -notmatch 'from "next/navigation"') {
  $anchor = 'import Link from "next/link";'
  if (-not $content.Contains($anchor)) {
    throw 'Tidak menemukan import Link from "next/link"; pada Forgot Password page.'
  }

  $replacement = $anchor + $newLine + 'import { useRouter } from "next/navigation";'
  $content = $content.Replace($anchor, $replacement)
}

# Tambah router instance.
$functionAnchor = 'export default function ForgotPasswordPage() {'
if (-not $content.Contains($functionAnchor)) {
  throw "Tidak menemukan ForgotPasswordPage()."
}

if ($content -notmatch 'const router = useRouter\(\);') {
  $replacement = $functionAnchor + $newLine + '  const router = useRouter();'
  $content = $content.Replace($functionAnchor, $replacement)
}

# Setelah Supabase menerima request recovery, arahkan user ke halaman input OTP.
$successAnchor = '      setSent(true);'
if (-not $content.Contains($successAnchor)) {
  throw "Tidak menemukan setSent(true);. Patch dihentikan agar tidak merusak file."
}

$replacement = $successAnchor + $newLine + '      router.push("/auth/verify-reset");'
$content = $content.Replace($successAnchor, $replacement)

[System.IO.File]::WriteAllText($forgotPath, $content, $utf8)
Write-Host "OK: Forgot Password sekarang diarahkan ke /auth/verify-reset setelah kode dikirim." -ForegroundColor Green
Write-Host "File baru OTP/Invite dari ZIP sudah siap digunakan." -ForegroundColor Green
Write-Host "PENTING: konfigurasi Custom SMTP + template Recovery/Invite masih wajib dilakukan di Supabase." -ForegroundColor Cyan
