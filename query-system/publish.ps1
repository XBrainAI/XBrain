# ============================================================
#   query-system 发布脚本 (PowerShell)
#   功能: 将开发目录同步到发布目录，清理垃圾文件，可选构建
#   用法:  .\publish.ps1 [-Build]
# ============================================================

param(
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$DEV_DIR = "d:\data\wy25311753\workspace\ws_workbuddy\ws_study8\query-system"
$REL_DIR = "d:\data\wy25311753\workspace\ws_workbuddy\ws_study8\query-system-release"

Write-Host ""
Write-Host "============================================================"
Write-Host "  Query System - Publish Script"
Write-Host "  DEV:  $DEV_DIR"
Write-Host "  REL:  $REL_DIR"
Write-Host "============================================================"
Write-Host ""

if (-not (Test-Path "$DEV_DIR\src")) { Write-Host "[ERROR] Dev dir not found" -ForegroundColor Red; exit 1 }
if (-not (Test-Path $REL_DIR)) { Write-Host "[ERROR] Release dir not found" -ForegroundColor Red; exit 1 }

# ---- Step 1: 清理垃圾文件 ----
Write-Host "[1/6] Cleaning junk files..." -ForegroundColor Cyan

$deletedCount = 0
foreach ($dir in @($DEV_DIR, $REL_DIR)) {
    if (Test-Path "$dir\src") {
        Get-ChildItem -LiteralPath "$dir\src" -Recurse -File | Where-Object {
            $_.Name.Length -gt 40 -or $_.Name -eq "debug-diag.ts"
        } | ForEach-Object {
            Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
            $deletedCount++
        }
    }
}
Write-Host "       Cleaned $deletedCount junk files"

# ---- Step 2: 同步 src/ 核心源码 ----
Write-Host "[2/6] Syncing src\" -ForegroundColor Cyan

$srcFiles = @(
    "App.css", "App.tsx", "main.tsx", "index.css",
    "components\FilterPanel.tsx", "components\ResultTable.tsx",
    "components\DetailDrawer.tsx", "components\GradientBar.tsx",
    "components\Tooltip.tsx", "components\tooltipData.ts", "components\SchoolDetailModal.tsx",
    "components\MarkdownModal.tsx", "components\MarkdownModal.css",
    "types.ts",
    "utils\dataMerger.ts", "utils\filterEngine.ts", "utils\fieldHelpers.ts",
    "utils\mdParser.ts", "utils\rawData.ts", "utils\exportCsv.ts"
)

$synced = 0
foreach ($f in $srcFiles) {
    $s = Join-Path $DEV_DIR "src\$f"
    $d = Join-Path $REL_DIR "src\$f"
    if (Test-Path $s) {
        $dd = Split-Path $d
        if (-not (Test-Path $dd)) { New-Item -ItemType Directory -Path $dd -Force | Out-Null }
        Copy-Item -LiteralPath $s -Destination $d -Force
        $synced++
    }
}

Write-Host ""
Write-Host "       Syncing __tests__\" -ForegroundColor Gray
$td = Join-Path $REL_DIR "src\__tests__"
if (-not (Test-Path $td)) { New-Item -ItemType Directory -Path $td -Force | Out-Null }
Get-ChildItem -LiteralPath "$DEV_DIR\src\__tests__" -Filter "*.ts" | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $td -Force; $synced++
}
Write-Host "       Synced $synced files"

# ---- Step 3: 同步配置文件 ----
Write-Host "[3/6] Syncing config files..." -ForegroundColor Cyan

@("index.html", "vite.config.ts", "package.json", "eslint.config.js", "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json", ".gitignore") | ForEach-Object {
    Copy-Item -LiteralPath (Join-Path $DEV_DIR $_) -Destination (Join-Path $REL_DIR $_) -Force -ErrorAction SilentlyContinue
}

$pd = Join-Path $REL_DIR "public"
if (-not (Test-Path $pd)) { New-Item -ItemType Directory -Path $pd -Force | Out-Null }
Copy-Item -LiteralPath "$DEV_DIR\public\*" -Destination $pd -Force -Recurse -ErrorAction SilentlyContinue

$ad = Join-Path $REL_DIR "src\assets"
if (-not (Test-Path $ad)) { New-Item -ItemType Directory -Path $ad -Force | Out-Null }
Copy-Item -LiteralPath "$DEV_DIR\src\assets\*" -Destination $ad -Force -Recurse -ErrorAction SilentlyContinue

# ---- 同步 other_infos 扩展信息目录 ----
Write-Host "       Syncing other_infos\" -ForegroundColor Gray
$oiDev = Join-Path $DEV_DIR "other_infos"
$oiRel = Join-Path $REL_DIR "other_infos"
if (Test-Path $oiDev) {
    if (-not (Test-Path $oiRel)) { New-Item -ItemType Directory -Path $oiRel -Force | Out-Null }
    # 先清空 release 目录中的旧文件，确保与 dev 完全一致
    Get-ChildItem -LiteralPath $oiRel -Recurse -File | Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem -LiteralPath "$DEV_DIR\other_infos" -File | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $oiRel -Force
        $synced++
    }
    $oiCount = (Get-ChildItem -LiteralPath "$DEV_DIR\other_infos" -File).Count
    Write-Host "       Copied $oiCount files to other_infos\" -ForegroundColor Gray
}

Write-Host "       Done."

# ---- Step 4: 检测并安装新依赖 ----
Write-Host "[4/6] Checking dependencies..." -ForegroundColor Cyan

$devPkg = Join-Path $DEV_DIR "package.json"
$relPkg = Join-Path $REL_DIR "package.json"
$needInstall = $false

if (Test-Path $devPkg) {
    $devJson = Get-Content $devPkg -Raw
    $relJson = $null
    if (Test-Path $relPkg) {
        $relJson = Get-Content $relPkg -Raw
    }

    if ($null -eq $relJson) {
        $needInstall = $true
        Write-Host "       No release package.json found" -ForegroundColor Yellow
    } elseif ($devJson -ne $relJson) {
        $needInstall = $true
        Write-Host "       package.json has changed" -ForegroundColor Yellow
    }

    $nodeModules = Join-Path $REL_DIR "node_modules"
    if (-not (Test-Path $nodeModules)) {
        $needInstall = $true
        Write-Host "       node_modules not found" -ForegroundColor Yellow
    }
}

if ($needInstall) {
    Write-Host "       Running npm install..." -ForegroundColor Cyan
    Push-Location $REL_DIR
    try {
        npm install
        Write-Host "       [OK] Dependencies installed" -ForegroundColor Green
    } catch {
        Write-Host "       [WARN] npm install failed" -ForegroundColor Yellow
    }
    Pop-Location
} else {
    Write-Host "       Dependencies up to date" -ForegroundColor Green
}

# ---- Step 5: 可选构建 ----
if ($Build) {
    Write-Host "[5/6] Building for production..." -ForegroundColor Cyan
    Push-Location $REL_DIR
    try { npx vite build; Write-Host "[OK] Build OK" -ForegroundColor Green }
    catch { Write-Host "[WARN] Build failed" -ForegroundColor Yellow }
    Pop-Location
} else {
    Write-Host "[5/6] Skipped. Use -Build flag." -ForegroundColor Gray
}

# ---- Step 6: 汇总 ----
Write-Host ""
Write-Host "[6/6] Summary" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------"
Write-Host ("  Source files synced: {0}" -f $synced)
Write-Host ("  Junk files cleaned:  {0}" -f $deletedCount)
$total = (Get-ChildItem -LiteralPath "$REL_DIR\src" -Include *.ts,*.tsx,*.css -Recurse -File).Count
Write-Host ("  Total src files:     {0}" -f $total)

$rem = @(Get-ChildItem -LiteralPath "$REL_DIR\src" -Recurse -File | Where-Object { $_.Name.Length -gt 40 }).Count
if ($rem -gt 0) { Write-Host ("  Long-name files:      {0} (may need manual clean)" -f $rem) -ForegroundColor Yellow } else { Write-Host "  Conflict copies:     Clean" -ForegroundColor Green }

Write-Host "------------------------------------------------------------"
Write-Host ""
Write-Host ">>> Publish complete!" -ForegroundColor Green
if (-not $Build) { Write-Host '>>> Run ".\publish.ps1 -Build" for production build.' -ForegroundColor Gray }
Write-Host ""
