# One-time + every-launch: bake safe context into Ollama and reload the model.
# Prevents: request (65550 tokens) exceeds context size (65536 tokens)

param(
    [switch]$Quiet
)

$ErrorActionPreference = "Continue"

$root = "C:\Users\robdr\Desktop\openclaude\openclaude-main"
$modelfile = Join-Path $root "Modelfile.qwen36"
$modelTag = "qwen3.6-oc:latest"
$ollamaCtx = 32768

function Log($msg, $color) {
    if (-not $Quiet) { Write-Host $msg -ForegroundColor $color }
}

if (-not (Test-Path $modelfile)) {
    Log "[FAIL] Missing $modelfile" Red
    exit 1
}

$env:OLLAMA_CONTEXT_LENGTH = "$ollamaCtx"

# Stop model loaded at wrong context (65536)
ollama stop qwen3.6:latest 2>$null | Out-Null
ollama stop qwen3.6-oc:latest 2>$null | Out-Null

# Create/update OpenClaude-tuned model with num_ctx 49152 baked in
Log "Creating $modelTag with num_ctx $ollamaCtx..." Cyan
ollama create $modelTag -f $modelfile 2>&1 | ForEach-Object {
    if (-not $Quiet) { Write-Host $_ }
}

if ($LASTEXITCODE -ne 0) {
    Log "[FAIL] ollama create failed" Red
    exit 1
}

# Verify modelfile
$show = ollama show $modelTag --modelfile 2>$null
if ($show -match "num_ctx 32768") {
    Log "[PASS] $modelTag has num_ctx 49152" Green
} else {
    Log "[WARN] Could not verify num_ctx on $modelTag" Yellow
}

if (-not $Quiet) {
    Log "Warming $modelTag (first load may take 1-2 min)..." Cyan
    ollama run $modelTag "Say OK" 2>$null | Out-Null
    $ps = ollama ps 2>$null
    if ($ps -match "49152") {
        Log "[PASS] Model loaded at 49152 context" Green
    } elseif ($ps -match "65536") {
        Log "[FAIL] Model still at 65536 - quit Ollama from system tray and run this script again" Red
        exit 1
    }
}

exit 0
