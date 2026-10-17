# ============================================================
#  fetch-runtimes.ps1 — restore the portable runtime stack
#  Downloads pinned versions into Tools/runtime/ if missing.
#  Run: powershell -NoProfile -ExecutionPolicy Bypass -File setup\fetch-runtimes.ps1
#  (Idempotent — skips anything already present.)
# ============================================================
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$RT   = Join-Path $Root 'Tools\runtime'

# Pinned versions (match what run.bat expects)
$NodeVer  = 'v22.23.3'
$BunVer   = '1.3.13'
$RgVer    = '14.1.1'
$GitVer   = '2.56.0.windows.2'

function Test-Url([string]$u) {
  try { $r = Invoke-WebRequest -Uri $u -Method Head -UseBasicParsing -TimeoutSec 10; return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) } catch { return $false }
}

function Fetch([string]$label, [string]$url, [string]$dest) {
  if (Test-Path $dest) { Write-Host "  [skip] $label (already present)" -ForegroundColor DarkGray; return }
  Write-Host "  [get ] $label" -ForegroundColor Cyan
  $tmp = "$dest.part"
  try {
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 600
    Move-Item -Force $tmp $dest
    Write-Host "  [ok  ] $label -> $dest" -ForegroundColor Green
  } catch {
    if (Test-Path $tmp) { Remove-Item $tmp -Force }
    throw "Failed to fetch $label from $url : $_"
  }
}

New-Item -ItemType Directory -Force -Path $RT | Out-Null
Write-Host "Restoring portable runtimes into: $RT" -ForegroundColor White

# --- Node v22.23.3 (win-x64) ---
$nodeDir = Join-Path $RT "node-$NodeVer-win-x64"
if (-not (Test-Path (Join-Path $nodeDir 'node.exe'))) {
  $zip = Join-Path $RT "node-$NodeVer-win-x64.zip"
  Fetch "node $NodeVer" "https://nodejs.org/dist/$NodeVer/node-$NodeVer-win-x64.zip" $zip
  Write-Host "  [unzip] node -> $nodeDir" -ForegroundColor Cyan
  Expand-Archive -Path $zip -DestinationPath $RT -Force
} else { Write-Host "  [skip] node (already present)" -ForegroundColor DarkGray }

# --- bun 1.3.13 (win-x64) ---
$bunDir = Join-Path $RT 'bun-windows-x64'
if (-not (Test-Path (Join-Path $bunDir 'bun.exe'))) {
  Fetch "bun $BunVer" "https://github.com/oven-sh/bun/releases/download/v$BunVer/bun-windows-x64.zip" (Join-Path $RT 'bun-windows-x64.zip')
  Write-Host "  [unzip] bun -> $bunDir" -ForegroundColor Cyan
  Expand-Archive -Path (Join-Path $RT 'bun-windows-x64.zip') -DestinationPath $RT -Force
} else { Write-Host "  [skip] bun (already present)" -ForegroundColor DarkGray }

# --- ripgrep 14.1.1 (win-x64) ---
$rgDir = Join-Path $RT 'ripgrep'
if (-not (Test-Path (Join-Path $rgDir 'rg.exe'))) {
  Fetch "ripgrep $RgVer" "https://github.com/BurntSushi/ripgrep/releases/download/$RgVer/ripgrep-$RgVer-x86_64-pc-windows-msvc.zip" (Join-Path $RT 'ripgrep.zip')
  Write-Host "  [unzip] ripgrep -> $rgDir" -ForegroundColor Cyan
  Expand-Archive -Path (Join-Path $RT 'ripgrep.zip') -DestinationPath $RT -Force
  # rg.exe lands in a nested folder — flatten it
  $nested = Get-ChildItem $rgDir -Directory | Select-Object -First 1
  if ($nested) { Move-Item (Join-Path $nested.FullName 'rg.exe') (Join-Path $rgDir 'rg.exe') -Force; Remove-Item $nested.FullName -Recurse -Force }
} else { Write-Host "  [skip] ripgrep (already present)" -ForegroundColor DarkGray }

# --- PortableGit 2.56.0 (win-x64) ---
$pgDir = Join-Path $RT 'PortableGit'
if (-not (Test-Path (Join-Path $pgDir 'cmd\git.exe'))) {
  Fetch "PortableGit" "https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.2/PortableGit-2.56.0-64-bit.7z.exe" (Join-Path $RT 'PortableGit.7z.exe')
  Write-Host "  [note] PortableGit requires 7-Zip to extract; see Tools/README.md" -ForegroundColor Yellow
} else { Write-Host "  [skip] PortableGit (already present)" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "Done. Verify: .\Tools\runtime\node-$NodeVer-win-x64\node.exe --version" -ForegroundColor Green
