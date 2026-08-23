# Max performance mode — i9-14900KS + 64 GB RAM + RTX 5090 (Win 11)
# Sets persistent Ollama user env + OpenClaude settings + launchers.
# Run: powershell -ExecutionPolicy Bypass -File enable-max-performance.ps1

param(
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$openclaudeDir = Join-Path $env:USERPROFILE ".openclaude"
$markerPath = Join-Path $openclaudeDir "performance-mode.json"

function Log($msg, $color = "White") {
    if (-not $Quiet -and $msg) { Write-Host $msg -ForegroundColor $color }
}

Log ""
Log "=== OpenClaude MAX PERFORMANCE (i9-14900KS + RTX 5090 + 64 GB) ===" Cyan
Log ""

# 1) Windows user env — Ollama app reads these on start (restart Ollama after apply)
$ollamaUserEnv = @{
    OLLAMA_NUM_GPU           = "1"
    OLLAMA_MAX_VRAM          = "32768"
    OLLAMA_FLASH_ATTENTION   = "1"
    OLLAMA_KV_CACHE_TYPE     = "q8_0"
    OLLAMA_NUM_PARALLEL      = "2"
    OLLAMA_MAX_LOADED_MODELS = "3"
    OLLAMA_KEEP_ALIVE        = "240m"
    OLLAMA_CONTEXT_LENGTH    = "65536"
    OLLAMA_NUM_THREAD        = "24"
}

foreach ($k in $ollamaUserEnv.Keys) {
    [Environment]::SetEnvironmentVariable($k, $ollamaUserEnv[$k], "User")
}
Log "[OK]      Ollama user environment (restart Ollama app from tray after this)" Green

# 2) OpenClaude hardware tune (settings.json, profiles, run.bat, context caps)
$hwTune = Join-Path $root "install-openclaude-hardware-tune.ps1"
if (-not (Test-Path $hwTune)) {
    Log "[FAIL] Missing $hwTune" Red
    exit 1
}
& $hwTune -Tier 5090 -PerformanceMode Max

# 3) Marker file — health check + docs
if (-not (Test-Path $openclaudeDir)) {
    New-Item -ItemType Directory -Path $openclaudeDir -Force | Out-Null
}
$marker = [ordered]@{
    mode     = "max"
    hardware = "Intel i9-14900KS | 64 GB RAM | RTX 5090 | MSI MS-7D85 | Win 11 Pro"
    tier     = "5090-max"
    applied  = (Get-Date -Format "yyyy-MM-dd HH:mm")
    ollama   = $ollamaUserEnv
    notes    = "Restart Ollama from system tray after first apply. Three OpenClaude windows OK."
}
$marker | ConvertTo-Json -Depth 5 | Set-Content $markerPath -Encoding UTF8
Log "[OK]      $markerPath" Green

Log ""
Log "MAX PERFORMANCE applied." Green
Log "  Parallel requests: 2 | Models kept hot: 240m | GPU VRAM cap: 32 GB | CPU threads: 24" DarkGray
Log "  Restart Ollama (quit tray icon, reopen) so GPU env vars load." Yellow
Log "  Daily start: run.bat" DarkGray
Log "  Health check: openclaude-health.bat" DarkGray
Log ""
