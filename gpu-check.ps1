# Quick GPU + Ollama check for Robert's RTX 5090 setup
# Double-click gpu-check.bat or run this script after OpenClaude feels "not using GPU"

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=== OpenClaude GPU check (RTX 5090) ===" -ForegroundColor Cyan
Write-Host ""

# NVIDIA
$nv = $null
try {
    $env:Path = "C:\Program Files\NVIDIA Corporation\NVSMI;$env:Path"
    $nv = nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv,noheader 2>&1
} catch {}
if ($nv -and ($nv -notmatch "error") -and ($nv -notmatch "failed")) {
    $parts = ($nv -split "," | ForEach-Object { $_.Trim() })
    Write-Host "[GPU]     $($parts[0])" -ForegroundColor Green
    Write-Host "          VRAM: $($parts[1]) / $($parts[2])  |  Util now: $($parts[3])" -ForegroundColor DarkGray
    Write-Host "          (Util % only jumps while the model is thinking. Idle is normal.)" -ForegroundColor DarkGray
} else {
    Write-Host "[FAIL]    nvidia-smi not found. NVIDIA driver issue?" -ForegroundColor Red
}

Write-Host ""

# Ollama loaded models
try {
    $ps = ollama ps 2>&1 | Out-String
    if ($ps -match "100% GPU") {
        Write-Host "[PASS]    Ollama has a model on GPU (100% GPU in list below)" -ForegroundColor Green
    } elseif ($ps -match "GPU") {
        Write-Host "[WARN]    Ollama using GPU partially. See list below." -ForegroundColor Yellow
    } elseif ($ps -match "100% CPU") {
        Write-Host "[FAIL]    Model on CPU only. Quit Ollama tray, reopen Ollama, then run run.bat (loads GPU)." -ForegroundColor Red
    } elseif ($ps -match "cloud") {
        Write-Host "[INFO]    Cloud model loaded. Zero local GPU is normal for *-cloud models." -ForegroundColor Yellow
    } elseif ($ps.Trim().Length -lt 20) {
        Write-Host "[INFO]    No model loaded. Send a message in OpenClaude to load one." -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "--- ollama ps ---" -ForegroundColor DarkGray
    ollama ps 2>&1
} catch {
    Write-Host "[FAIL]    Ollama not running. Start Ollama from system tray." -ForegroundColor Red
}

Write-Host ""

# Which OpenClaude model = GPU or not
$main = "$env:USERPROFILE\.openclaude\settings.json"
if (Test-Path $main) {
    $mm = (Get-Content $main -Raw | ConvertFrom-Json).model
    if ($mm -match "cloud") {
        Write-Host "[CLOUD]   Main window model: $mm" -ForegroundColor Yellow
        Write-Host "          Runs on Ollama servers - your 5090 stays idle. Use /model qwen3-coder:30b for GPU." -ForegroundColor Yellow
    } else {
        Write-Host "[LOCAL]   Main window model: $mm (uses your GPU when loaded)" -ForegroundColor Green
    }
}

$sw = "$env:USERPROFILE\.openclaude-profiles\software-ai\settings.json"
if (Test-Path $sw) {
    $m = (Get-Content $sw -Raw | ConvertFrom-Json).model
    if ($m -match "cloud") {
        Write-Host "[CLOUD]   Software window model: $m" -ForegroundColor Yellow
        Write-Host "          Runs on Ollama servers. Your 5090 stays idle." -ForegroundColor Yellow
        Write-Host "          For local GPU: /model qwen3-coder:30b  or  /model devstral-small-2:latest" -ForegroundColor Cyan
    } else {
        Write-Host "[LOCAL]   Software window model: $m (should use GPU when loaded)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "--- Windows Ollama env (Ollama reads these on START) ---" -ForegroundColor DarkGray
foreach ($k in @("OLLAMA_NUM_GPU","OLLAMA_MAX_VRAM","OLLAMA_FLASH_ATTENTION","OLLAMA_KEEP_ALIVE")) {
    $v = [Environment]::GetEnvironmentVariable($k, "User")
    if ($v) { Write-Host "  $k = $v" }
}
Write-Host ""
Write-Host "If env looks wrong: check User env OLLAMA_* vars, then RESTART Ollama (quit tray, reopen). See setup\DO-NOT-RUN.txt." -ForegroundColor DarkGray
Write-Host ""
