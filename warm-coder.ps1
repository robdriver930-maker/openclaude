# Preloads the local coder onto the GPU at a SPEED-SAFE context length.
# Huge num_ctx (64k–256k) makes 30b spill to CPU and feel slow on a 5090.
param(
    [switch]$Quiet,
    [string]$Model = "qwen3-coder:30b",
    [int]$NumCtx = 32768
)

$ErrorActionPreference = "Continue"

function Log($msg, $color) {
    if (-not $Quiet) { Write-Host $msg -ForegroundColor $color }
}

# Unload any resident copies so a prior huge context cannot stick
try { ollama stop $Model 2>$null | Out-Null } catch { }
try {
    $ps = ollama ps 2>$null | Out-String
    if ($ps -match "qwen3-coder:30b|qwen2.5-coder:7b|qwen3\.6:|abliterated") {
        foreach ($name in @(
            "qwen3.6-oc:27b",
            "qwen3.6:27b",
            "qwen3.6:35b",
            "qwen3.6:latest",
            "qwen3-coder:30b",
            "qwen2.5-coder:7b",
            "huihui_ai/qwen3-coder-abliterated:30b",
            "huihui_ai/Qwen3.6-abliterated:35b"
        )) {
            try { ollama stop $name 2>$null | Out-Null } catch { }
        }
    }
} catch { }

$env:OLLAMA_CONTEXT_LENGTH = "$NumCtx"

$bodyObj = @{
    model      = $Model
    prompt     = "OK"
    stream     = $false
    keep_alive = "120m"
    options    = @{
        num_ctx     = $NumCtx
        num_predict = 4
    }
}
$body = $bodyObj | ConvertTo-Json -Depth 5 -Compress

$loaded = $false
for ($i = 0; $i -lt 3; $i++) {
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/generate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 180 | Out-Null
        $loaded = $true
        break
    } catch {
        Start-Sleep -Seconds 3
    }
}

if ($loaded) {
    $ps = ollama ps 2>$null | Out-String
    if ($ps -match "100% GPU") {
        Log "[OK] $Model on GPU (num_ctx=$NumCtx) - ready for fast replies." Green
    } elseif ($ps -match "GPU") {
        Log "[WARN] $Model only partly on GPU. Close other apps using VRAM, then relaunch." Yellow
    } else {
        Log "[INFO] $Model loaded (num_ctx=$NumCtx)." DarkGray
    }
} else {
    Log "[WARN] Could not reach Ollama to warm $Model. Is the Ollama tray app running?" Yellow
    exit 1
}

exit 0
