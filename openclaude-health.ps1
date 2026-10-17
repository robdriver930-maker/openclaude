# OpenClaude health check - run weekly or when something feels wrong
# Usage: double-click openclaude-health.bat  (or pass -Fast to skip the slow model test)
param([switch]$Fast)

$ErrorActionPreference = "Continue"
$fail = 0
$warn = 0
$root = "C:\Users\robdr\Desktop\openclaude\openclaude-main"
$settings = "$env:USERPROFILE\.openclaude\settings.json"

function Ok($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Bad($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; $script:fail++ }
function Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow; $script:warn++ }
function Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }

Write-Host ""
Write-Host "=== OpenClaude health check ===" -ForegroundColor Cyan
Write-Host ""

# Launcher
if (Test-Path "$root\run.bat") { Ok "Local launcher: run.bat" } else { Bad "Missing run.bat" }
if (Test-Path "$root\run-opus.bat") { Ok "Opus launcher: run-opus.bat" } else { Warn "Missing run-opus.bat" }
if (Test-Path "$root\run-kimi-k3.bat") { Ok "Kimi K3 launcher: run-kimi-k3.bat" } else { Warn "Missing run-kimi-k3.bat" }

# Clean install marker - no addon skill libraries
if (Test-Path "$root\skill-bundles") {
    Warn "skill-bundles folder present (expected clean install)"
} else {
    Ok "No skill-bundles (clean install)"
}

# Node
try {
    $nv = (node -v 2>$null).Trim()
    if ($nv) { Ok "Node.js $nv" } else { Bad "Node.js not found" }
} catch { Bad "Node.js not found" }

# ripgrep (Glob/Grep) — accept system rg, WinGet link, or the portable copy
$rgOk = $false
try {
    $null = Get-Command rg -ErrorAction Stop
    $rgOk = $true
} catch {
    if (Test-Path "$env:LOCALAPPDATA\Microsoft\WinGet\Links\rg.exe") { $rgOk = $true }
}
if (-not $rgOk -and (Test-Path "$root\tools\runtime\ripgrep\rg.exe")) { $rgOk = $true }
if ($rgOk) { Ok "ripgrep available" } else { Bad "ripgrep missing - winget install BurntSushi.ripgrep.MSVC" }

# Ollama
try {
    $models = ollama list 2>$null
    if ($LASTEXITCODE -eq 0 -and ($models -match "qwen3\.8-oc-code:27b")) {
        Ok "Ollama running + qwen3.8-oc-code:27b installed"
    } elseif ($LASTEXITCODE -eq 0) {
        Warn "Ollama running but qwen3.8-oc-code:27b not listed"
    } else {
        Bad "Ollama not responding - start Ollama app"
    }
} catch { Bad "Ollama not found or not running" }

# Settings sanity
if (Test-Path $settings) {
    $json = Get-Content $settings -Raw | ConvertFrom-Json
    $stopCmd = ''
    try { $stopCmd = [string]$json.hooks.Stop[0].hooks[0].command } catch { }
    $sessionStartCmd = ''
    try { $sessionStartCmd = [string]$json.hooks.SessionStart[0].hooks[0].command } catch { }
    if ($json.disableAllHooks -eq $true) {
        Warn "disableAllHooks=true - reply voice cannot speak"
    } elseif ($stopCmd -match 'speak-reply') {
        Ok "Reply voice hooks live"
    } else {
        Warn "Hooks enabled but speak-reply Stop hook missing"
    }
    if ($sessionStartCmd -match 'rules-loader\.ps1') {
        Ok "SessionStart hook: rules-loader.ps1 (ROBERT-RULES-FOREVER loaded each session)"
    } else {
        Warn "SessionStart rules-loader.ps1 hook missing - ROBERT-RULES-FOREVER not auto-loaded"
    }
    if ($json.model -eq "qwen3.8-oc-code:27b") { Ok "Model: qwen3.8-oc-code:27b (local)" }
    elseif ($json.model -eq "claude-opus-4-8") { Ok "Model: claude-opus-4-8 (Opus - use run-opus.bat)" }
    elseif ($json.model -eq "kimi-k3:cloud") { Ok "Model: kimi-k3:cloud (Ollama Cloud - use run-kimi-k3.bat)" }
    elseif ($json.model -eq "kimi-k2.7-code:cloud") { Ok "Model: kimi-k2.7-code:cloud (Ollama Cloud)" }
    elseif ($json.model -eq "glm-5.1:cloud") { Ok "Model: glm-5.1:cloud (cloud)" }
    elseif ($json.model -eq "qwen3.8:27b" -or $json.model -eq "qwen3.8:latest" -or $json.model -eq "qwen3.8:27b-mtp-q8_0" -or $json.model -eq "qwen3.8:27b-q8_0") { Warn "Model is $($json.model) (256k) - use qwen3.8-oc-code:27b" }
    elseif ($json.model -eq "qwen3-coder:480b-cloud") { Warn "Model qwen3-coder:480b-cloud is retired - use qwen3.8-oc-code:27b" }
    elseif ($json.model -eq "qwen3-coder:30b") { Warn "Model qwen3-coder:30b is legacy - prefer qwen3.8-oc-code:27b" }
    elseif ($json.model -eq "qwen3.6-oc-code:27b") { Warn "Model is qwen3.6-oc-code:27b - prefer qwen3.8-oc-code:27b" }
    elseif ($json.model -eq "qwen3.6-oc:latest") { Warn "Model is qwen3.6-oc:latest - prefer qwen3.8-oc-code:27b" }
    elseif ($json.model -eq "qwen3.6:latest") { Warn "Model is qwen3.6:latest (262k crash risk) - use qwen3.8-oc-code:27b" }
    else { Warn "Model is $($json.model)" }
    if ($json.env.USE_BUILTIN_RIPGREP -eq "0") { Ok "USE_BUILTIN_RIPGREP=0" } else { Warn "Set USE_BUILTIN_RIPGREP=0 in settings.json" }
    $deny = @($json.permissions.deny)
    if ($deny -contains "Agent") { Warn "Agent tool denied" } else { Ok "Agent tool enabled (specialist army)" }
    if ($deny -contains "Task") { Warn "Task denied - that is the Agent alias, so specialists cannot spawn. run.bat removes it." } else { Ok "Agent alias Task allowed (spawn specialists)" }
    if ($deny -contains "TodoWrite") { Ok "TodoWrite blocked (prevents freeze)" } else { Warn "TodoWrite not denied - can cause Error writing file loops" }
    if ($deny -contains "TaskCreate") { Ok "TaskCreate blocked (prevents freeze)" } else { Warn "TaskCreate not denied" }
    if ($json.alwaysThinkingEnabled -eq $true) { Ok "alwaysThinkingEnabled=true (MAX thinking)" } else { Warn "alwaysThinkingEnabled is not true (want true)" }
    if ($json.effortLevel -eq "max") { Ok "effortLevel=max (MAX thinking)" } else { Warn "effortLevel is $($json.effortLevel) (want max)" }
    $ctxRaw = $json.env.OLLAMA_CONTEXT_LENGTH
    $ctxLen = 0
    if ($ctxRaw) { [void][int]::TryParse("$ctxRaw", [ref]$ctxLen) }
    if ($ctxLen -eq 163840) { Ok "Context cap: Ollama 163840 (160k MAX local)" }
    elseif ($ctxLen -eq 65536) { Ok "Context cap: Ollama 65536 (legacy Step C)" }
    elseif ($ctxLen -gt 163840) { Bad "OLLAMA_CONTEXT_LENGTH is $ctxLen - too high (never bare 262k)" }
    elseif ($ctxLen -gt 0) { Warn "OLLAMA_CONTEXT_LENGTH is $ctxRaw (expected 163840 for MAX local)" }
    else { Warn "OLLAMA_CONTEXT_LENGTH missing" }

    $perfMarker = Join-Path $env:USERPROFILE ".openclaude\performance-mode.json"
    if (Test-Path $perfMarker) {
        try {
            $pm = Get-Content $perfMarker -Raw | ConvertFrom-Json
            if ($pm.mode -eq "max") {
                Ok "Performance mode marker present ($($pm.hardware))"
            }
        } catch { Warn "performance-mode.json unreadable" }
    } else {
        Info "No performance-mode.json marker (run.bat still applies max5090 env)"
    }
} else {
    Bad "Missing settings.json at $settings"
}

# Build
if (Test-Path "$root\dist\cli.mjs") { Ok "OpenClaude build (dist/cli.mjs)" } else { Bad "Build missing - run bun run build in openclaude-main" }

# Agent army (skills stay lean so context lasts)
$skillsDir = Join-Path $env:USERPROFILE ".openclaude\skills"
$agentsDir = Join-Path $env:USERPROFILE ".openclaude\agents"
$skillCount = 0
$agentCount = 0
if (Test-Path $skillsDir) {
    $skillCount = @(Get-ChildItem $skillsDir -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '_*' }).Count
}
if (Test-Path $agentsDir) {
    $agentCount = @(Get-ChildItem $agentsDir -Filter *.md -ErrorAction SilentlyContinue).Count
}
if ($skillCount -eq 0) { Warn "No live skills (parked too hard?)" }
elseif ($skillCount -le 40) { Ok "Lean skills: $skillCount (target max 40 so context lasts)" }
else { Warn "Skills bloated: $skillCount - run node setup\park-army-for-context.mjs" }
if ($agentCount -ge 50) { Ok "Agent army live: $agentCount" }
elseif ($agentCount -ge 13) { Warn "Partial army: $agentCount - restore: node setup\restore-army.mjs --agents-only" }
elseif ($agentCount -eq 0) { Warn "No live agents" }
else { Warn "Few agents: $agentCount - restore: node setup\restore-army.mjs --agents-only" }
$cursorLive = @(Get-ChildItem $skillsDir -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'cursor-*' }).Count
if ($cursorLive -gt 0) { Warn "cursor-* skills still live ($cursorLive) - park them" } else { Ok "No cursor-* skills live" }

# GPU check (optional)
$gpuCheck = Join-Path $root "gpu-check.ps1"
if (Test-Path $gpuCheck) {
    & $gpuCheck 2>$null | Select-Object -First 5 | ForEach-Object { Info $_ }
} else { Warn "gpu-check.ps1 missing" }

# Last maintenance
$stamp = "$env:USERPROFILE\.openclaude\last-maintain.txt"
if (Test-Path $stamp) {
    $age = ((Get-Date) - (Get-Item $stamp).LastWriteTime).TotalDays
    if ($age -gt 14) { Warn "Maintenance overdue ($([math]::Round($age)) days) - run openclaude-maintain.bat" }
    else { Ok "Maintenance ran $([math]::Round($age)) day(s) ago" }
} else { Warn "Never maintained - run openclaude-maintain.bat once" }


# Runtime doctor (includes test generation - loads model on GPU, ~30-60 sec). Skipped with -Fast.
if ($Fast) {
    Write-Host ""
    Info "Skipped runtime doctor (-Fast); the stack verify already proves the model answers."
} else {
    Write-Host ""
    Write-Host "--- Runtime doctor (Ollama test reply) ---" -ForegroundColor Yellow
    Push-Location $root
    $priorModel = $env:OPENAI_MODEL
    $env:OPENAI_MODEL = "qwen3.8-oc-code:27b"
    bun run doctor:runtime 2>&1 | ForEach-Object {
        if ($_ -match "\[PASS\]") { Write-Host $_ -ForegroundColor Green }
        elseif ($_ -match "\[FAIL\]") { Write-Host $_ -ForegroundColor Red; $script:fail++ }
        else { Write-Host $_ }
    }
    if ($null -ne $priorModel) { $env:OPENAI_MODEL = $priorModel } else { Remove-Item Env:\OPENAI_MODEL -ErrorAction SilentlyContinue }
    Pop-Location
}

Write-Host ""
if ($fail -eq 0) {
    Write-Host "OVERALL: HEALTHY - OpenClaude ready for work." -ForegroundColor Green
    if ($warn -gt 0) { Write-Host "$warn optional warning(s) above" -ForegroundColor Yellow }
    exit 0
}
Write-Host "OVERALL: NEEDS FIX - see FAIL lines above, then run run.bat" -ForegroundColor Red
exit 1
