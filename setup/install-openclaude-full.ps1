# Improve / repair OpenClaude install on this PC
# Run: powershell -ExecutionPolicy Bypass -File setup\install-openclaude-full.ps1
# Or:  powershell -ExecutionPolicy Bypass -File install-openclaude-full.ps1

param(
    [ValidateSet("default", "5090")]
    [string]$HardwareTier = "5090",
    [switch]$SyncSkills,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Continue"
$setupDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $setupDir
$ocHome = Join-Path $env:USERPROFILE ".openclaude"
$fail = 0

function Ok($m) { Write-Host "[OK]  $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Bad($m) { Write-Host "[FAIL] $m" -ForegroundColor Red; $script:fail++ }

Write-Host ""
Write-Host "=== OpenClaude install repair ($HardwareTier) ===" -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host ""

# 1) Node
$node = "C:\Program Files\nodejs\node.exe"
if (Test-Path $node) { Ok "Node.js $(& $node -v)" } else {
    try { Ok "Node.js $(node -v)" } catch { Bad "Node.js missing - install from https://nodejs.org/" }
}

# 2) Ollama
try {
    $null = Invoke-RestMethod "http://127.0.0.1:11434/api/tags" -TimeoutSec 5
    Ok "Ollama responding on :11434"
} catch {
    Bad "Ollama not running - start the Ollama app"
}

# 3) Build
$cli = Join-Path $root "dist\cli.mjs"
if (Test-Path $cli) {
    Ok "Build present: dist\cli.mjs"
} elseif (-not $SkipBuild) {
    Warn "Build missing - attempting bun run build"
    Push-Location $root
    try {
        bun run build
        if (Test-Path $cli) { Ok "Build completed" } else { Bad "Build still missing after bun run build" }
    } catch {
        Bad "Build failed: $_"
    }
    Pop-Location
} else {
    Bad "Build missing: dist\cli.mjs"
}

# 4) Launcher entry (must hit dist, not broken ESM shim)
$cmd = Join-Path $root "bin\openclaude.cmd"
$cmdText = if (Test-Path $cmd) { Get-Content $cmd -Raw } else { "" }
if ($cmdText -match "dist\\cli\.mjs") {
    Ok "bin\openclaude.cmd launches dist\cli.mjs"
} else {
    Bad "bin\openclaude.cmd does not launch dist\cli.mjs - re-run this installer after fixing the cmd"
}

# 5) Version smoke
if (Test-Path $cmd) {
    $ver = & cmd /c "`"$cmd`" --version" 2>&1 | Out-String
    if ($ver -match "OpenClaude") { Ok ("Version: " + ($ver.Trim() -replace "\s+", " ")) } else { Bad "openclaude.cmd --version returned nothing useful" }
}

# 6) Profile dirs
New-Item -ItemType Directory -Force -Path $ocHome | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $ocHome "skills") | Out-Null
Ok "Profile: $ocHome"

# 7) Settings - ensure Skill allowed
$settingsPath = Join-Path $ocHome "settings.json"
if (Test-Path $settingsPath) {
    try {
        $json = Get-Content $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $allow = @($json.permissions.allow)
        $deny = @($json.permissions.deny)
        $changed = $false
        if ($allow -notcontains "Skill") {
            $json.permissions.allow = @($allow + "Skill")
            $changed = $true
        }
        if ($deny -contains "Skill") {
            $json.permissions.deny = @($deny | Where-Object { $_ -ne "Skill" })
            $changed = $true
        }
        if ($changed) {
            $json | ConvertTo-Json -Depth 30 | Set-Content $settingsPath -Encoding UTF8
            Ok "Enabled Skill tool in settings.json"
        } else {
            Ok "settings.json OK"
        }
    } catch {
        Bad "settings.json invalid JSON"
    }
} else {
    Warn "No settings.json yet - OpenClaude will create defaults on first run"
}

# 8) Hardware tune
$tune = Join-Path $root "install-openclaude-hardware-tune.ps1"
if (Test-Path $tune) {
    & $tune -Tier $HardwareTier -PerformanceMode Max
    Ok "Hardware tune applied ($HardwareTier)"
} else {
    Warn "install-openclaude-hardware-tune.ps1 missing"
}

# 9) Optional skill sync
if ($SyncSkills) {
    $sync = Join-Path $setupDir "sync-from-cursor.ps1"
    if (Test-Path $sync) {
        & $sync
        Ok "Skills synced from Cursor"
    } else {
        Warn "setup\sync-from-cursor.ps1 missing"
    }
}

# 10) Premium agent army (always refresh if installer present)
$agentsInstall = Join-Path $setupDir "install-premium-agents.ps1"
if (Test-Path $agentsInstall) {
    & $agentsInstall -Quiet
    $agentCount = @(Get-ChildItem (Join-Path $env:USERPROFILE ".openclaude\agents") -Filter "*.md" -ErrorAction SilentlyContinue).Count
    if ($agentCount -ge 77) {
        Ok "Premium agent army ready ($agentCount agents)"
    } else {
        Warn "Agent army incomplete ($agentCount agents; expected 77)"
    }
} else {
    Warn "setup\install-premium-agents.ps1 missing"
}

Write-Host ""
if ($fail -eq 0) {
    Write-Host "=== Install healthy ===" -ForegroundColor Green
    Write-Host "Start daily with:  $root\run.bat" -ForegroundColor DarkGray
} else {
    Write-Host "=== Install has $fail issue(s) - fix FAIL lines above ===" -ForegroundColor Red
}
Write-Host ""
exit $(if ($fail -eq 0) { 0 } else { 1 })
