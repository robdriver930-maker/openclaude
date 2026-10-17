# OpenClaude maintenance - run weekly for 12-month reliability
# Auto-runs from run.bat if last run > 7 days ago
# Manual: double-click openclaude-maintain.bat

param(
    [switch]$Quick,
    [switch]$Silent
)

$ErrorActionPreference = "Continue"
$fail = 0
$warn = 0
$root = "C:\Users\robdr\Desktop\openclaude\openclaude-main"
$ocHome = "$env:USERPROFILE\.openclaude"
$settings = "$ocHome\settings.json"
$stamp = "$ocHome\last-maintain.txt"
$now = Get-Date

function Ok($msg) { if (-not $Silent) { Write-Host "[PASS] $msg" -ForegroundColor Green } }
function Bad($msg) { if (-not $Silent) { Write-Host "[FAIL] $msg" -ForegroundColor Red }; $script:fail++ }
function Warn($msg) { if (-not $Silent) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }; $script:warn++ }
function Info($msg) { if (-not $Silent) { Write-Host "[INFO] $msg" -ForegroundColor Cyan } }

if (-not $Silent) {
    Write-Host ""
    Write-Host "=== OpenClaude maintenance $(Get-Date -Format 'yyyy-MM-dd HH:mm') ===" -ForegroundColor Cyan
    Write-Host ""
}

# --- Clean install: no skill-bundles / money-machine ---
if (Test-Path "$root\skill-bundles") { Warn "skill-bundles still present" } else { Ok "No skill-bundles" }
if (Test-Path "$root\money-machine") { Warn "money-machine still present" } else { Ok "No money-machine" }

# --- Backup settings (keep last 5) ---
if (Test-Path $settings) {
    $bakDir = "$ocHome\backups"
    New-Item -ItemType Directory -Force -Path $bakDir | Out-Null
    $bakName = "settings.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    Copy-Item $settings "$bakDir\$bakName" -Force
    Get-ChildItem "$bakDir\settings.backup.*.json" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip 5 |
        Remove-Item -Force -ErrorAction SilentlyContinue
    Ok "Settings backed up"
} else {
    Bad "Missing settings.json"
}

# --- Context settings sanity ---
if (Test-Path $settings) {
    try {
        $json = Get-Content $settings -Raw | ConvertFrom-Json
        $ctxRaw = $json.env.OLLAMA_CONTEXT_LENGTH
        $ctxLen = 0
        if ($ctxRaw) { [void][int]::TryParse("$ctxRaw", [ref]$ctxLen) }
        if ($ctxLen -eq 163840) { Ok "Context length OK (160k MAX local)" }
        elseif ($ctxLen -eq 65536) { Ok "Context length OK (65536 legacy)" }
        elseif ($ctxLen -gt 163840) { Bad "OLLAMA_CONTEXT_LENGTH is $ctxLen - too high (never bare 262k)" }
        elseif ($ctxLen -ge 49152) { Warn "Context length $ctxLen (prefer 163840 for MAX local)" }
        else { Warn "OLLAMA_CONTEXT_LENGTH is $ctxRaw" }
    } catch {
        Warn "Could not parse settings.json for context check"
    }
}

# --- Disk space (warn below 15 GB free on C:) ---
try {
    $disk = Get-PSDrive C -ErrorAction Stop
    $freeGb = [math]::Round($disk.Free / 1GB, 1)
    if ($freeGb -lt 10) { Bad "Only ${freeGb} GB free on C: - delete old models or client previews" }
    elseif ($freeGb -lt 20) { Warn "${freeGb} GB free on C: - consider cleanup soon" }
    else { Ok "${freeGb} GB free on C:" }
} catch { Warn "Could not check disk space" }

# --- Prune old shell snapshots (>14 days) ---
$snapDir = "$ocHome\shell-snapshots"
if (Test-Path $snapDir) {
    $cutoff = (Get-Date).AddDays(-14)
    $old = Get-ChildItem $snapDir -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $cutoff }
    $n = ($old | Measure-Object).Count
    if ($n -gt 0) {
        $old | Remove-Item -Force -ErrorAction SilentlyContinue
        Info "Pruned $n old shell snapshot(s)"
    }
    Ok "Shell snapshots tidy"
}

# --- Prune file-history versions (keep newest 3 per file id; skip in Quick - can be huge) ---
if (-not $Quick) {
    $fhDir = "$ocHome\file-history"
    if (Test-Path $fhDir) {
        $removed = 0
        Get-ChildItem $fhDir -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $sessionDir = $_
            Get-ChildItem $sessionDir.FullName -Directory -ErrorAction SilentlyContinue | ForEach-Object {
                $versions = Get-ChildItem $_.FullName -File -ErrorAction SilentlyContinue | Sort-Object Name -Descending
                $versions | Select-Object -Skip 3 | ForEach-Object {
                    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
                    $script:removed++
                }
            }
        }
        if ($removed -gt 0) { Info "Pruned $removed old file-history version(s)" }
        Ok "File history trimmed"
    }
}

# --- Ollama warm + verify (Quick: short API ping only - CLI can hang when GPU is full) ---
try {
    if ($Quick) {
        $ping = $null
        try {
            $ping = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 5 -ErrorAction Stop
        } catch { }
        if ($null -ne $ping) { Ok "Ollama responding" } else { Warn "Ollama not responding - start Ollama app" }
    } else {
        $null = ollama list 2>$null
        if ($LASTEXITCODE -eq 0) {
            Ok "Ollama responding"
            Info "Warming qwen3.8-oc-code:27b (local GPU)..."
            $env:OLLAMA_CONTEXT_LENGTH = "163840"
            ollama stop qwen3.8-oc-code:27b 2>$null | Out-Null
            ollama run qwen3.8-oc-code:27b "Say OK" --verbose 2>$null | Out-Null
            Ok "Model warm"
        } else {
            Bad "Ollama not responding - start Ollama app"
        }
    }
} catch { Bad "Ollama not found" }

# --- Lean profile (Bobby Tech core; full army stays parked) ---
$skillCount = 0
$agentCount = 0
if (Test-Path "$ocHome\skills") {
    $skillCount = @(Get-ChildItem "$ocHome\skills" -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '_*' }).Count
}
if (Test-Path "$ocHome\agents") {
    $agentCount = @(Get-ChildItem "$ocHome\agents" -Filter *.md -ErrorAction SilentlyContinue).Count
}
if ($skillCount -le 40 -and $skillCount -gt 0) { Ok "Lean skills: $skillCount" } elseif ($skillCount -eq 0) { Warn "No live skills" } else { Warn "Skills bloated: $skillCount - park-army-for-context.mjs" }
if ($agentCount -ge 50) { Ok "Agent army live: $agentCount" } elseif ($agentCount -eq 0) { Warn "No live agents" } else { Warn "Partial army: $agentCount - restore-army.mjs --agents-only" }

if (-not $Quick) {
    # --- Full runtime doctor ---
    if (-not $Silent) {
        Write-Host ""
        Write-Host "--- Runtime doctor ---" -ForegroundColor Yellow
    }
    Push-Location $root
    bun run doctor:runtime 2>&1 | ForEach-Object {
        if (-not $Silent) {
            if ($_ -match "\[PASS\]|completed successfully") { Write-Host $_ -ForegroundColor Green }
            elseif ($_ -match "\[FAIL\]|failed") { Write-Host $_ -ForegroundColor Red; $script:fail++ }
            else { Write-Host $_ }
        } elseif ($_ -match "\[FAIL\]|failed") { $script:fail++ }
    }
    Pop-Location
}

# --- Stamp last run ---
New-Item -ItemType Directory -Force -Path $ocHome | Out-Null
$now.ToString("o") | Set-Content $stamp -Encoding UTF8

if (-not $Silent) {
    Write-Host ""
    if ($fail -eq 0) {
        Write-Host "MAINTENANCE: COMPLETE - OpenClaude tuned for another week." -ForegroundColor Green
        if ($warn -gt 0) { Write-Host "$warn warning(s) - optional fixes above" -ForegroundColor Yellow }
    } else {
        Write-Host "MAINTENANCE: ISSUES FOUND - fix FAIL lines, then run run.bat" -ForegroundColor Red
    }
    Write-Host ""
}

exit $(if ($fail -eq 0) { 0 } else { 1 })
