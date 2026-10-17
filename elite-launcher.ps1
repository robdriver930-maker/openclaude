#Requires -Version 5.1
param(
    [string]$Model = "",
    [string]$Prompt = "",
    [switch]$Bare,
    [switch]$Debug,
    [int]$Context = 163840,
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$Root = "C:\Users\robdr\Desktop\openclaude\openclaude-main"

if ($Help) {
    Write-Host "OpenClaude Elite Launcher — Usage:"
    Write-Host ""
    Write-Host "  .\elite-launcher.ps1 -Model <name> [-Prompt `"...`"] [-Bare] [-Debug]"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\elite-launcher.ps1 -Model qwen3.6:27b"
    Write-Host "  .\elite-launcher.ps1 -Model qwen3.8-oc-code:27b -Prompt `"fix this bug`""
    Write-Host "  .\elite-launcher.ps1 -Model uncensored:latest -Bare"
    Write-Host ""
    Write-Host "Available models (local Ollama):"
    try {
        $models = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 5
        $models.models | Select-Object -ExpandProperty name | Sort-Object | ForEach-Object { Write-Host "  • $_" }
    } catch {
        Write-Host "  (Ollama not responding — start Ollama first)" -ForegroundColor Red
    }
    exit 0
}

# Validate model exists in Ollama
$available = @()
try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 5
    $available = $resp.models | Select-Object -ExpandProperty name
} catch {
    Write-Host "ERROR: Ollama not responding at 127.0.0.1:11434" -ForegroundColor Red
    Write-Host "Start Ollama and try again."
    exit 1
}

if (-not $available) {
    Write-Host "ERROR: No Ollama models found. Run: ollama list" -ForegroundColor Red
    exit 1
}

if (-not $Model) {
    $Model = "qwen3.8-oc-code:27b"
}

if ($Model -notin $available) {
    Write-Host "ERROR: Model '$Model' not found in Ollama." -ForegroundColor Red
    Write-Host "Available models:"
    $available | ForEach-Object { Write-Host "  • $_" }
    exit 1
}

# Determine context window from settings map
$settingsPath = "$env:USERPROFILE\.openclaude\settings.json"
$ctxSize = 163840
if (Test-Path $settingsPath) {
    try {
        $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
        $mapRaw = $settings.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS
        if ($mapRaw) {
            $map = $mapRaw | ConvertFrom-Json
            if ($map.$Model) { $ctxSize = [int]$map.$Model }
        }
    } catch {}
}

$autoCompact = [math]::Floor($ctxSize * 0.80)
$maxOutput = [math]::Min(16384, [math]::Floor($ctxSize * 0.10))

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  OpenClaude ELITE — Bobby's Tech Services" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Model:      $Model" -ForegroundColor Cyan
Write-Host "Context:    $ctxSize tokens ($([math]::Round($ctxSize/1024))k)" -ForegroundColor Cyan
Write-Host "Compact:    $autoCompact" -ForegroundColor Cyan
Write-Host "Max output: $maxOutput tokens" -ForegroundColor Cyan
if ($Bare) { Write-Host "Mode:       BARE (no auto-scan)" -ForegroundColor Cyan }
Write-Host "==========================================" -ForegroundColor Cyan

# Build env
$env:OPENAI_API_KEY = "x"
$env:OPENAI_BASE_URL = "http://127.0.0.1:11434/v1"
$env:CLAUDE_CODE_USE_OPENAI = "1"
$env:OPENAI_MODEL = $Model
$env:CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS = "$Model=$ctxSize"
$env:CLAUDE_CODE_AUTO_COMPACT_WINDOW = "$autoCompact"
$env:CLAUDE_CODE_MAX_OUTPUT_TOKENS = "$maxOutput"
$env:CLAUDE_CODE_OLLAMA_ONLY = "1"

if ($Bare) {
    $env:CLAUDE_CODE_SIMPLE = "1"
}

# Warm model if not already loaded
try {
    $ps = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/ps" -TimeoutSec 3
    $loaded = $ps.models | Select-Object -ExpandProperty name
    if ($Model -notin $loaded) {
        Write-Host "Warming model $Model..." -ForegroundColor Yellow -NoNewline
        $body = @{ model = $Model; keep_alive = "24h" } | ConvertTo-Json
        Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/generate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120 | Out-Null
        Write-Host " READY" -ForegroundColor Green
    } else {
        Write-Host "Model $Model already loaded." -ForegroundColor Green
    }
} catch {
    Write-Host " (warmup skipped)" -ForegroundColor DarkGray
}

$cli = "$Root\dist\cli.mjs"
if (-not (Test-Path $cli)) {
    Write-Host "ERROR: $cli not found. Build first: bun run build" -ForegroundColor Red
    exit 1
}

$node = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $node)) { $node = "node" }

$argList = @("--max-old-space-size=32768", $cli, "--model", $Model, "--effort", "max", "--dangerously-skip-permissions", "--permission-mode", "bypassPermissions")
if ($Bare) { $argList += "--bare" }
if ($Debug) { $argList += "--debug" }

if ($Prompt) {
    $argList += @("-p", $Prompt)
}

Write-Host "Launching..." -ForegroundColor Green
Write-Host ""

& $node $argList

$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "OpenClaude exited with code $exitCode" -ForegroundColor Red
}
exit $exitCode
