# Golden-path smoke - proves edit/run + OpenClaude CLI + local power model.
# Run: powershell -ExecutionPolicy Bypass -File setup\golden-path-smoke.ps1

param(
    [switch]$SkipModelChat
)

$ErrorActionPreference = "Stop"
$setupDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $setupDir
$tmp = Join-Path $root ".tmp\golden-path"
$fail = 0

function Ok([string]$m) { Write-Host "[OK]   $m" -ForegroundColor Green }
function Bad([string]$m) { Write-Host "[FAIL] $m" -ForegroundColor Red; $script:fail++ }
function Info([string]$m) { Write-Host "       $m" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "=== OpenClaude golden-path smoke ===" -ForegroundColor Cyan
Write-Host ""

# 1) CLI present
$cli = Join-Path $root "dist\cli.mjs"
if (Test-Path -LiteralPath $cli) {
    Ok "dist\cli.mjs present"
} else {
    Bad "dist\cli.mjs missing - run bun run build"
}

# 2) Edit + run proof (no model required)
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$scriptPath = Join-Path $tmp "hello-smoke.mjs"
$marker = "GOLDEN_PATH_OK_" + [guid]::NewGuid().ToString("N").Substring(0, 8)
$js = "console.log('$marker')"
[System.IO.File]::WriteAllText($scriptPath, $js, [System.Text.UTF8Encoding]::new($false))
Ok "Wrote hello-smoke.mjs"

$node = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $node)) { $node = "node" }
$out = & $node $scriptPath 2>&1 | Out-String
if ($out -match [regex]::Escape($marker)) {
    Ok "Node executed edited file"
    Info $out.Trim()
} else {
    Bad "Node did not print marker. Output: $out"
}

# 3) Ollama up
try {
    Invoke-RestMethod "http://127.0.0.1:11434/api/tags" -TimeoutSec 5 | Out-Null
    Ok "Ollama API reachable"
} catch {
    Bad "Ollama not running on :11434 - start Ollama app"
}

# 4) Settings: power model + effort max
$settingsPath = Join-Path $env:USERPROFILE ".openclaude\settings.json"
if (Test-Path $settingsPath) {
    $raw = [System.IO.File]::ReadAllText($settingsPath)
    if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 0xFEFF) { $raw = $raw.Substring(1) }
    $s = $raw | ConvertFrom-Json
    if ($s.model -eq "qwen3.8-oc-code:27b") {
        Ok "settings.model = qwen3.8-oc-code:27b (local Qwen3.8)"
    } else {
        Bad "settings.model is '$($s.model)' (expected qwen3.8-oc-code:27b)"
    }
    if ($s.effortLevel -eq "max") {
        Ok "effortLevel = max"
    } else {
        Bad "effortLevel is '$($s.effortLevel)' (expected max)"
    }
    if ($s.alwaysThinkingEnabled -eq $true) {
        Ok "alwaysThinkingEnabled = true"
    } else {
        Bad "alwaysThinkingEnabled not true"
    }
} else {
    Bad "settings.json missing"
}

# 5) Short model chat (optional)
if (-not $SkipModelChat -and (Test-Path $cli) -and $fail -eq 0) {
    Write-Host ""
    Write-Host "Chat smoke (qwen3.8-oc-code:27b) - may take ~30s..." -ForegroundColor DarkGray
    $env:CLAUDE_CODE_USE_OPENAI = "1"
    $env:OPENAI_BASE_URL = "http://127.0.0.1:11434/v1"
    $env:OPENAI_API_KEY = "ollama"
    $env:OPENAI_MODEL = "qwen3.8-oc-code:27b"
    $chat = & $node --max-old-space-size=8192 $cli --model qwen3.8-oc-code:27b --print --dangerously-skip-permissions "Reply with exactly: GOLDEN_OC_OK" 2>&1 | Out-String
    if ($chat -match "GOLDEN_OC_OK") {
        Ok "OpenClaude local coding genius model chat works"
    } else {
        Bad "OpenClaude chat smoke failed"
        $len = [Math]::Min(400, $chat.Length)
        Info $chat.Substring(0, $len)
    }
}

Write-Host ""
if ($fail -eq 0) {
    Write-Host "=== GOLDEN PATH PASS ===" -ForegroundColor Green
    Write-Host "Daily: run.bat  (model = qwen3.8-oc-code:27b local Qwen3.8)" -ForegroundColor DarkGray
    exit 0
} else {
    Write-Host "=== GOLDEN PATH FAIL ($fail) ===" -ForegroundColor Red
    exit 1
}
