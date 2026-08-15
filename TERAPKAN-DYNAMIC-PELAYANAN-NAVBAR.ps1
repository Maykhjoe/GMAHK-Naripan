param(
  [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

function Read-Utf8([string]$Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.UTF8Encoding]::new($false))
}

function Write-Utf8([string]$Path, [string]$Content) {
  [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
}

function Backup-File([string]$Path) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = "$Path.dynamic-ministry-nav-$stamp.bak"
  Copy-Item -LiteralPath $Path -Destination $backup -Force
  Write-Host "Backup: $backup" -ForegroundColor DarkGray
}

$root = (Resolve-Path $ProjectRoot).Path
$navbarPath = Join-Path $root "src\components\layout\navbar.tsx"
$layoutPath = Join-Path $root "src\app\(public)\layout.tsx"
$cachePath = Join-Path $root "src\lib\cache\public-content.ts"
$newDataPath = Join-Path $root "src\lib\data\ministry-navigation.ts"

foreach ($path in @($navbarPath, $layoutPath, $cachePath, $newDataPath)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "File tidak ditemukan: $path"
  }
}

$navbar = Read-Utf8 $navbarPath
$layout = Read-Utf8 $layoutPath
$cache = Read-Utf8 $cachePath

# ------------------------------------------------------------
# NAVBAR
# ------------------------------------------------------------
if ($navbar -notmatch "MinistryNavigationItem") {
  $anchor = 'import { Logo } from "./logo";'
  if (-not $navbar.Contains($anchor)) {
    throw "Patch Navbar dibatalkan: anchor import Logo tidak ditemukan."
  }

  $navbar = $navbar.Replace(
    $anchor,
    $anchor + "`r`n`r`ntype MinistryNavigationItem = {`r`n  label: string;`r`n  href: string;`r`n};"
  )
}

if ($navbar -notmatch "ministryNavItems\s*=\s*\[\]") {
  $navbar = [regex]::Replace(
    $navbar,
    '(export function Navbar\(\{\s*\r?\n\s*overlay = false,\s*\r?\n\s*site = defaultSiteConfig,\s*\r?\n\s*isLive = false,)',
    '$1' + "`r`n  ministryNavItems = [],",
    1
  )
}

if ($navbar -notmatch "ministryNavItems\?: readonly MinistryNavigationItem\[\]") {
  $navbar = [regex]::Replace(
    $navbar,
    '(\s*isLive\?: boolean;\s*\r?\n\s*\}\) \{)',
    "`r`n  isLive?: boolean;`r`n  ministryNavItems?: readonly MinistryNavigationItem[];`r`n}) {",
    1
  )
}

if ($navbar -notmatch "const resolvedNavItems") {
  $stateAnchor = '  const [open, setOpen] = useState(false);'
  if (-not $navbar.Contains($stateAnchor)) {
    throw "Patch Navbar dibatalkan: state open tidak ditemukan."
  }

  $resolved = @'
  const resolvedNavItems = navItems.map((item) =>
    item.href === "/pelayanan"
      ? {
          ...item,
          children:
            ministryNavItems.length > 0 ? ministryNavItems : undefined,
        }
      : item,
  );
'@
  $navbar = $navbar.Replace($stateAnchor, $stateAnchor + "`r`n`r`n" + $resolved.TrimEnd())
}

# Hanya ubah pemetaan JSX, jangan sentuh navItems.map di resolvedNavItems.
$navbar = $navbar.Replace('{navItems.map(', '{resolvedNavItems.map(')

if ($navbar -notmatch "resolvedNavItems\.map") {
  throw "Patch Navbar dibatalkan: pemetaan menu tidak berhasil ditemukan."
}

# ------------------------------------------------------------
# PUBLIC LAYOUT
# ------------------------------------------------------------
if ($layout -notmatch "getPublishedMinistryNavigation") {
  $importAnchor = 'import { getLivestreamOverview } from "@/lib/data/livestreams";'
  if (-not $layout.Contains($importAnchor)) {
    throw "Patch Layout dibatalkan: import livestream tidak ditemukan."
  }

  $layout = $layout.Replace(
    $importAnchor,
    $importAnchor + "`r`n" + 'import { getPublishedMinistryNavigation } from "@/lib/data/ministry-navigation";'
  )
}

if ($layout -notmatch "\[site,\s*livestream,\s*ministryNavItems\]") {
  $layout = [regex]::Replace(
    $layout,
    'const\s+\[site,\s*livestream\]\s*=\s*await\s+Promise\.all\(\[',
    'const [site, livestream, ministryNavItems] = await Promise.all([',
    1
  )
}

if ($layout -notmatch "getPublishedMinistryNavigation\(\)") {
  $layout = [regex]::Replace(
    $layout,
    '(\s*getLivestreamOverview\(\),)',
    '$1' + "`r`n    getPublishedMinistryNavigation(),",
    1
  )
}

if ($layout -notmatch "ministryNavItems=\{ministryNavItems\}") {
  $layout = [regex]::Replace(
    $layout,
    '<Navbar\s+site=\{site\}\s+isLive=\{livestream\.isLive\}\s*/>',
    '<Navbar site={site} isLive={livestream.isLive} ministryNavItems={ministryNavItems} />',
    1
  )
}

if ($layout -notmatch "ministryNavItems=\{ministryNavItems\}") {
  throw "Patch Layout dibatalkan: komponen Navbar tidak cocok dengan pola yang diharapkan."
}

# ------------------------------------------------------------
# REVALIDATION
# Navbar adalah bagian global, jadi perubahan departemen harus
# me-refresh public layout, bukan hanya halaman /pelayanan.
# ------------------------------------------------------------
if ($cache -notmatch 'section === "departemen"') {
  $functionAnchor = 'export function revalidatePublicContent(section: string, record?: unknown) {'
  if (-not $cache.Contains($functionAnchor)) {
    throw "Patch cache dibatalkan: fungsi revalidatePublicContent tidak ditemukan."
  }

  $insertion = @'
export function revalidatePublicContent(section: string, record?: unknown) {
  if (section === "departemen") {
    revalidatePath("/", "layout");
  }
'@
  $cache = $cache.Replace($functionAnchor, $insertion.TrimEnd())
}

# Semua transformasi sudah lolos validasi. Baru tulis ke disk.
Backup-File $navbarPath
Backup-File $layoutPath
Backup-File $cachePath

Write-Utf8 $navbarPath $navbar
Write-Utf8 $layoutPath $layout
Write-Utf8 $cachePath $cache

Write-Host "" 
Write-Host "Dynamic dropdown Pelayanan berhasil diterapkan." -ForegroundColor Green
Write-Host "- Dropdown hanya menampilkan pelayanan published dari database." -ForegroundColor Green
Write-Host "- Jika belum ada pelayanan published, Pelayanan tidak memiliki dropdown." -ForegroundColor Green
Write-Host "- Tambah/edit/archive pelayanan akan me-refresh public layout." -ForegroundColor Green
Write-Host "" 
Write-Host "Lanjutkan dengan:" -ForegroundColor Cyan
Write-Host "  npm.cmd run typecheck"
Write-Host "  npm.cmd run lint"
Write-Host "  npm.cmd test"
Write-Host "  npm.cmd run test:security"
Write-Host "  npm.cmd run build"
