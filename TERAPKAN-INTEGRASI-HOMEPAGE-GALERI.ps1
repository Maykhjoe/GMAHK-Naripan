$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pagePath = Join-Path $projectRoot "src\app\page.tsx"

if (-not (Test-Path $pagePath)) {
  throw "src/app/page.tsx tidak ditemukan. Pastikan patch diextract ke root project."
}

# PENTING: Windows PowerShell 5.1 dapat membaca UTF-8 tanpa BOM sebagai ANSI jika
# Get-Content dipakai tanpa -Encoding. Gunakan API .NET dengan UTF-8 eksplisit agar
# karakter en dash, smart quote, dan karakter non-ASCII lain tidak menjadi mojibake.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$text = [System.IO.File]::ReadAllText($pagePath, $utf8NoBom)

if ($text -match 'getGalleryHomepagePreview') {
  Write-Host "Integrasi galeri homepage sudah terpasang. Tidak ada perubahan." -ForegroundColor Green
  exit 0
}

$updated = $text

# Hapus sumber galeri statis tanpa menyentuh wrapper/motion homepage.
$updated = [regex]::Replace(
  $updated,
  '(?m)^import \{ galleryImages \} from "@/lib/constants/site-data";\r?\n',
  '',
  1
)

# GalleryCard lama tidak lagi dipakai oleh homepage. Mendukung format import satu baris maupun multiline.
$updated = $updated.Replace(', GalleryCard', '')
$updated = $updated.Replace('GalleryCard, ', '')
$updated = [regex]::Replace($updated, '(?m)^\s*GalleryCard,?\s*\r?\n', '', 1)

$livestreamImport = 'import { getLivestreamOverview } from "@/lib/data/livestreams";'
if (-not $updated.Contains($livestreamImport)) {
  throw "Marker import livestream tidak ditemukan. Homepage tidak diubah agar Patch 9 tetap aman."
}

$updated = $updated.Replace(
  $livestreamImport,
  "import { HomepageGalleryCard } from `"@/components/gallery/homepage-gallery-card`";`r`n$livestreamImport`r`nimport { getGalleryHomepagePreview } from `"@/lib/data/gallery`";"
)

# Tambahkan galleryPreview sebagai item terakhir Promise.all.
$tuplePattern = '(?m)(^\s*livestream,\s*\r?\n)(\s*\]\s*=\s*await Promise\.all\(\[)'
if (-not [regex]::IsMatch($updated, $tuplePattern)) {
  throw "Marker Promise.all homepage tidak ditemukan. Tidak ada file yang ditulis."
}
$updated = [regex]::Replace(
  $updated,
  $tuplePattern,
  { param($m) $m.Groups[1].Value + "    galleryPreview,`r`n" + $m.Groups[2].Value },
  1
)

$overviewCall = '    getLivestreamOverview(),'
if (-not $updated.Contains($overviewCall)) {
  throw "Marker getLivestreamOverview() tidak ditemukan. Tidak ada file yang ditulis."
}
$updated = $updated.Replace(
  $overviewCall,
  "$overviewCall`r`n    getGalleryHomepagePreview(5),"
)

# Ganti hanya ekspresi data galeri. MotionSection dan styling di sekitarnya dipertahankan.
$galleryMapPattern = '(?s)\{galleryImages\.map\(\(src,\s*index\)\s*=>\s*<GalleryCard\b.*?/>\s*\)\}'
if (-not [regex]::IsMatch($updated, $galleryMapPattern)) {
  throw "Marker galleryImages.map tidak ditemukan. Homepage tidak diubah agar Patch 9 tetap aman."
}

$galleryReplacement = @'
{galleryPreview.length > 0 ? (
        galleryPreview.map((entry, index) => (
          <HomepageGalleryCard
            key={entry.id}
            item={entry}
            albumSlug={entry.albumSlug}
            albumTitle={entry.albumTitle}
            index={index}
          />
        ))
      ) : (
        <div className="col-span-full rounded-2xl border border-primary/10 bg-white p-8 text-center">
          <p className="font-serif text-2xl text-primary">Belum ada foto galeri</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Foto dari album yang dipublikasikan melalui admin akan tampil otomatis di sini.
          </p>
        </div>
      )}
'@
$updated = [regex]::Replace($updated, $galleryMapPattern, $galleryReplacement, 1)

if ($updated -eq $text) {
  Write-Host "Tidak ada perubahan yang diperlukan." -ForegroundColor Yellow
  exit 0
}

$backup = "$pagePath.gallery-before-module.bak"
if (-not (Test-Path $backup)) {
  Copy-Item -LiteralPath $pagePath -Destination $backup -Force
}

[System.IO.File]::WriteAllText($pagePath, $updated, $utf8NoBom)

Write-Host "Integrasi homepage Galeri berhasil dengan UTF-8 aman." -ForegroundColor Green
Write-Host "Backup homepage: $backup" -ForegroundColor DarkGray
