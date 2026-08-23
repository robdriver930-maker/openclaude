# RTX 5090 + 64GB hardware tuning for OpenClaude launchers and profile settings
# Run: powershell -ExecutionPolicy Bypass -File install-openclaude-hardware-tune.ps1 -Tier 5090
# Max:  ... -Tier 5090 -PerformanceMode Max   (or enable-max-performance.ps1)

param(
    [ValidateSet("5090", "default")]
    [string]$Tier = "5090",

    [ValidateSet("Standard", "Max")]
    [string]$PerformanceMode = "Standard"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$profilesRoot = Join-Path $env:USERPROFILE ".openclaude-profiles"
$mainSettings = Join-Path $env:USERPROFILE ".openclaude\settings.json"
$openclaudeBat = Join-Path $root "run.bat"
$launchScript = Join-Path $root "scripts\launch-openclaude-profile.ps1"
$ctxCap = Join-Path $root "apply-context-cap.ps1"

if ($Tier -eq "5090") {
    $localCtx = "65536"
    $localCompact = "57344"
    $cloudCtx = "131072"
    $cloudCompact = "110592"
    if ($PerformanceMode -eq "Max") {
        $maxLoadedDefault = "3"
        $parallelDefault = "2"
        $maxLoadedCloud = "2"
        $parallelCloud = "2"
        $keepAlive = "240m"
    } else {
        $maxLoadedDefault = "3"
        $parallelDefault = "3"
        $maxLoadedCloud = "2"
        $parallelCloud = "2"
        $keepAlive = "120m"
    }
} else {
    $localCtx = "49152"
    $localCompact = "40960"
    $cloudCtx = "131072"
    $cloudCompact = "110592"
    $maxLoadedDefault = "2"
    $parallelDefault = "2"
    $maxLoadedCloud = "1"
    $parallelCloud = "1"
    $keepAlive = "60m"
}

function Set-SettingsEnv {
    param([string]$Path, [hashtable]$EnvMap)
    if (-not (Test-Path $Path)) { return }
    $json = Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $json.env) { $json | Add-Member -NotePropertyName env -NotePropertyValue ([pscustomobject]@{}) }
    foreach ($k in $EnvMap.Keys) {
        if ($json.env.PSObject.Properties.Name -contains $k) {
            $json.env.$k = $EnvMap[$k]
        } else {
            $json.env | Add-Member -NotePropertyName $k -NotePropertyValue $EnvMap[$k]
        }
    }
    $json | ConvertTo-Json -Depth 10 | Set-Content $Path -Encoding UTF8
}

$perfExtras = @{}
if ($PerformanceMode -eq "Max" -and $Tier -eq "5090") {
    $perfExtras = @{
        OLLAMA_NUM_GPU             = "1"
        OLLAMA_MAX_VRAM            = "32768"
        OLLAMA_KV_CACHE_TYPE       = "q8_0"
        OLLAMA_NUM_THREAD          = "24"
        OPENCLAUDE_PERFORMANCE_MODE = "max5090"
    }
}

Write-Host ""
Write-Host "=== OpenClaude Hardware Tune ($Tier$(if ($PerformanceMode -eq 'Max') { ' MAX' })) ===" -ForegroundColor Cyan
Write-Host ""

# Main settings
$mainEnv = @{
    OLLAMA_MAX_LOADED_MODELS = $maxLoadedDefault
    OLLAMA_NUM_PARALLEL      = $parallelDefault
    OLLAMA_KEEP_ALIVE        = $keepAlive
    OLLAMA_CONTEXT_LENGTH    = $localCtx
    OLLAMA_FLASH_ATTENTION   = "1"
}
foreach ($k in $perfExtras.Keys) { $mainEnv[$k] = $perfExtras[$k] }
Set-SettingsEnv $mainSettings $mainEnv

# Profile settings
foreach ($p in @("coder", "software-ai")) {
    $sp = Join-Path (Join-Path $profilesRoot $p) "settings.json"
    if ($p -eq "software-ai") {
        $profEnv = @{
            OLLAMA_MAX_LOADED_MODELS = $maxLoadedCloud
            OLLAMA_NUM_PARALLEL      = $parallelCloud
            OLLAMA_KEEP_ALIVE        = $keepAlive
            OLLAMA_CONTEXT_LENGTH    = $cloudCtx
            OLLAMA_FLASH_ATTENTION   = "1"
        }
    } else {
        $profEnv = @{
            OLLAMA_MAX_LOADED_MODELS = $maxLoadedDefault
            OLLAMA_NUM_PARALLEL      = $parallelDefault
            OLLAMA_KEEP_ALIVE        = $keepAlive
            OLLAMA_CONTEXT_LENGTH    = $localCtx
            OLLAMA_FLASH_ATTENTION   = "1"
        }
    }
    foreach ($k in $perfExtras.Keys) { $profEnv[$k] = $perfExtras[$k] }
    Set-SettingsEnv $sp $profEnv
    Write-Host "[OK]      profile $p settings.json" -ForegroundColor Green
}

# run.bat env lines
if (Test-Path $openclaudeBat) {
    $bat = Get-Content $openclaudeBat -Raw -Encoding ASCII
    $bat = $bat -replace 'set OLLAMA_KEEP_ALIVE=.*', "set OLLAMA_KEEP_ALIVE=$keepAlive"
    $bat = $bat -replace 'set OLLAMA_MAX_LOADED_MODELS=.*', "set OLLAMA_MAX_LOADED_MODELS=$maxLoadedDefault"
    $bat = $bat -replace 'set OLLAMA_NUM_PARALLEL=.*', "set OLLAMA_NUM_PARALLEL=$parallelDefault"
    $bat = $bat -replace 'set OLLAMA_CONTEXT_LENGTH=.*', "set OLLAMA_CONTEXT_LENGTH=$localCtx"
    if ($bat -notmatch 'OLLAMA_FLASH_ATTENTION') {
        $bat = $bat -replace '(set OLLAMA_CONTEXT_LENGTH=.*)', "`$1`r`nset OLLAMA_FLASH_ATTENTION=1"
    } else {
        $bat = $bat -replace 'set OLLAMA_FLASH_ATTENTION=.*', "set OLLAMA_FLASH_ATTENTION=1"
    }
    if ($PerformanceMode -eq "Max" -and $Tier -eq "5090") {
        foreach ($pair in @(
            @("OLLAMA_KV_CACHE_TYPE", "q8_0"),
            @("OLLAMA_NUM_THREAD", "24"),
            @("OLLAMA_MAX_VRAM", "32768")
        )) {
            $name = $pair[0]; $val = $pair[1]
            if ($bat -match "set $name=") {
                $bat = $bat -replace "set $name=.*", "set $name=$val"
            } else {
                $bat = $bat -replace '(set OLLAMA_FLASH_ATTENTION=.*)', "`$1`r`nset $name=$val"
            }
        }
    }
    Set-Content $openclaudeBat $bat -Encoding ASCII -NoNewline
    Write-Host "[OK]      run.bat" -ForegroundColor Green
}

# Context cap script
if (Test-Path $ctxCap) {
    & $ctxCap -SettingsPath $mainSettings -Fix -Quiet -Tier $Tier 2>$null
    foreach ($p in @("coder", "software-ai")) {
        $sp = Join-Path (Join-Path $profilesRoot $p) "settings.json"
        & $ctxCap -SettingsPath $sp -Fix -Quiet -Tier $Tier 2>$null
    }
    Write-Host "[OK]      apply-context-cap.ps1 (-Tier $Tier)" -ForegroundColor Green
}

Write-Host ""
$modeLabel = if ($PerformanceMode -eq "Max") { " MAX" } else { "" }
Write-Host "Tier $Tier$modeLabel applied. Local ctx=$localCtx parallel=$parallelDefault loaded=$maxLoadedDefault keep=$keepAlive" -ForegroundColor DarkGray
Write-Host ""
