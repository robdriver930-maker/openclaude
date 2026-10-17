# Apply editable stack folders into live OpenClaude
# Edit: Skills\, MCPs\, Tools\  then run this script.
#   powershell -ExecutionPolicy Bypass -File setup\apply-stack.ps1

param(
    [switch]$Quiet,
    # By default MCPs stay OFF (empty .mcp.json) so MAX local chat stays stable.
    # Pass -WithMcps only when you want Notion/Figma/etc. re-enabled.
    [switch]$WithMcps
)

$ErrorActionPreference = "Stop"
$setupDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $setupDir

$skillsSrc = Join-Path $root "Skills"
$mcpsSrc = Join-Path $root "MCPs\servers.json"
$toolsSrc = Join-Path $root "Tools\permissions.json"
$manifestPath = Join-Path $skillsSrc "manifest.json"

$ocSkills = Join-Path $env:USERPROFILE ".openclaude\skills"
$projSkills = Join-Path $root ".openclaude\skills"
$settingsPath = Join-Path $env:USERPROFILE ".openclaude\settings.json"
$openclaudeJson = Join-Path $env:USERPROFILE ".openclaude.json"
$mcpJson = Join-Path $root ".mcp.json"

$utf8 = New-Object System.Text.UTF8Encoding $false

function Log($msg, $color = "White") {
    if (-not $Quiet) { Write-Host $msg -ForegroundColor $color }
}

function Read-JsonFile([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing file: $path"
    }
    $raw = [System.IO.File]::ReadAllText($path)
    if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 0xFEFF) {
        $raw = $raw.Substring(1)
    }
    return $raw | ConvertFrom-Json
}

function Write-JsonFile([string]$path, $obj) {
    $json = $obj | ConvertTo-Json -Depth 40
    [System.IO.File]::WriteAllText($path, $json + "`n", $utf8)
}

Log ""
Log "=== Apply OpenClaude stack (Skills / MCPs / Tools) ===" Cyan

# --- Skills: merge Skills\* skill folders into live + project ---
New-Item -ItemType Directory -Force -Path $ocSkills | Out-Null
New-Item -ItemType Directory -Force -Path $projSkills | Out-Null

$merged = 0
Get-ChildItem -LiteralPath $skillsSrc -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $skillMd = Join-Path $_.FullName "SKILL.md"
    if (-not (Test-Path -LiteralPath $skillMd)) { return }
    $name = $_.Name
    foreach ($destRoot in @($ocSkills, $projSkills)) {
        $dest = Join-Path $destRoot $name
        if (Test-Path -LiteralPath $dest) {
            Remove-Item -LiteralPath $dest -Recurse -Force
        }
        Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
    }
    $merged++
    Log "  [skill] $name" DarkGray
}
Log "[OK] Merged $merged custom skill folder(s) from Skills\" Green

# --- MCPs ---
$emptyMcp = [pscustomobject]@{ mcpServers = [pscustomobject]@{} }
$mcpDoc = $emptyMcp
$serverNames = @()
if ($WithMcps) {
    $mcpDoc = Read-JsonFile $mcpsSrc
    if (-not $mcpDoc.mcpServers) {
        throw "MCPs\servers.json must contain mcpServers"
    }
    $serverNames = @($mcpDoc.mcpServers.PSObject.Properties.Name)
    Log "[MCP] Restoring $($serverNames.Count) servers (-WithMcps)" Yellow
} else {
    Log "[MCP] Keeping MCPs OFF for MAX stability (use -WithMcps to restore)" DarkGray
}

# 1) Project .mcp.json
Write-JsonFile $mcpJson $mcpDoc
Log "[OK] Wrote .mcp.json ($($serverNames.Count) servers)" Green

# 2) User ~/.openclaude.json top-level mcpServers + project mcp flags
$ocj = Read-JsonFile $openclaudeJson
$ocj | Add-Member -NotePropertyName mcpServers -NotePropertyValue $mcpDoc.mcpServers -Force

$projectKey = ($root -replace '\\', '/')
if (-not $ocj.projects) {
    $ocj | Add-Member -NotePropertyName projects -NotePropertyValue ([pscustomobject]@{}) -Force
}
$proj = $ocj.projects.$projectKey
if (-not $proj) {
    # try Windows-style key variants
    $alt = $root
    if ($ocj.projects.PSObject.Properties.Name -contains $alt) {
        $projectKey = $alt
        $proj = $ocj.projects.$projectKey
    }
}
if (-not $proj) {
    $proj = [pscustomobject]@{
        allowedTools                                      = @()
        mcpContextUris                                    = @()
        mcpServers                                        = @{}
        enabledMcpjsonServers                             = @()
        disabledMcpjsonServers                            = @()
        hasTrustDialogAccepted                            = $true
        projectOnboardingSeenCount                        = 0
        hasClaudeMdExternalIncludesApproved               = $false
        hasClaudeMdExternalIncludesWarningShown           = $false
        hasCompletedProjectOnboarding                     = $true
    }
    $ocj.projects | Add-Member -NotePropertyName $projectKey -NotePropertyValue $proj -Force
}

$proj | Add-Member -NotePropertyName enabledMcpjsonServers -NotePropertyValue $serverNames -Force
$proj | Add-Member -NotePropertyName disabledMcpjsonServers -NotePropertyValue @() -Force
$proj | Add-Member -NotePropertyName hasTrustDialogAccepted -NotePropertyValue $true -Force

# Pin agent routing to MAX local model (no mid-chat model swaps)
$LOCAL = 'qwen3.8-oc-code:27b'
$ocj | Add-Member -NotePropertyName activeProviderProfileId -NotePropertyValue 'provider_local_power' -Force
$ocj | Add-Member -NotePropertyName agentRouting -NotePropertyValue ([pscustomobject]@{
    Explore             = $LOCAL
    Plan                = $LOCAL
    'general-purpose'   = $LOCAL
    'frontend-dev'      = $LOCAL
    'code-fixer'        = $LOCAL
    'hard-code-fixer'   = $LOCAL
    default             = $LOCAL
}) -Force

Write-JsonFile $openclaudeJson $ocj
Log "[OK] User .openclaude.json mcpServers + agentRouting pinned to $LOCAL" Green

# 3) settings.json mcpServers mirror + tools permissions
$settings = Read-JsonFile $settingsPath
$settings | Add-Member -NotePropertyName mcpServers -NotePropertyValue $mcpDoc.mcpServers -Force
$settings | Add-Member -NotePropertyName model -NotePropertyValue $LOCAL -Force
$settings | Add-Member -NotePropertyName effortLevel -NotePropertyValue 'max' -Force
$settings | Add-Member -NotePropertyName alwaysThinkingEnabled -NotePropertyValue $true -Force
if (-not $settings.env) {
    $settings | Add-Member -NotePropertyName env -NotePropertyValue ([pscustomobject]@{}) -Force
}
$settings.env | Add-Member -NotePropertyName OPENAI_MODEL -NotePropertyValue $LOCAL -Force
$settings.env | Add-Member -NotePropertyName OPENCLAUDE_PERFORMANCE_MODE -NotePropertyValue 'max5090' -Force
$settings.env | Add-Member -NotePropertyName OLLAMA_CONTEXT_LENGTH -NotePropertyValue '32768' -Force
$settings.env | Add-Member -NotePropertyName CLAUDE_CODE_NO_FLICKER -NotePropertyValue '0' -Force
$settings.env | Add-Member -NotePropertyName CLAUDE_CODE_AUTO_COMPACT_WINDOW -NotePropertyValue '143360' -Force
$settings.env | Add-Member -NotePropertyName CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW -NotePropertyValue '153600' -Force
$settings.env | Add-Member -NotePropertyName CLAUDE_CODE_USE_OPENAI -NotePropertyValue '1' -Force
$settings.env | Add-Member -NotePropertyName OPENAI_BASE_URL -NotePropertyValue 'http://127.0.0.1:11434/v1' -Force
$settings.env | Add-Member -NotePropertyName OPENAI_API_KEY -NotePropertyValue 'ollama' -Force
$settings.env | Add-Member -NotePropertyName ANTHROPIC_MODEL -NotePropertyValue 'claude-opus-4-8' -Force

$perms = Read-JsonFile $toolsSrc
if (-not $settings.permissions) {
    $settings | Add-Member -NotePropertyName permissions -NotePropertyValue ([pscustomobject]@{}) -Force
}
$settings.permissions | Add-Member -NotePropertyName allow -NotePropertyValue @($perms.allow) -Force
$settings.permissions | Add-Member -NotePropertyName deny -NotePropertyValue @($perms.deny) -Force
$settings.permissions | Add-Member -NotePropertyName defaultMode -NotePropertyValue $perms.defaultMode -Force
$settings.permissions | Add-Member -NotePropertyName allowBypassPermissionsMode -NotePropertyValue $perms.allowBypassPermissionsMode -Force
$settings.permissions | Add-Member -NotePropertyName additionalDirectories -NotePropertyValue @($perms.additionalDirectories) -Force

# Keep plugin marketplaces empty (perfect setup)
if (-not $settings.enabledPlugins) {
    $settings | Add-Member -NotePropertyName enabledPlugins -NotePropertyValue ([pscustomobject]@{}) -Force
}
if (-not $settings.extraKnownMarketplaces) {
    $settings | Add-Member -NotePropertyName extraKnownMarketplaces -NotePropertyValue ([pscustomobject]@{}) -Force
}

Write-JsonFile $settingsPath $settings
Log "[OK] settings.json permissions + mcpServers mirror" Green

# --- Manifest must-have check ---
$missing = @()
if (Test-Path -LiteralPath $manifestPath) {
    $manifest = Read-JsonFile $manifestPath
    foreach ($name in @($manifest.mustHave)) {
        if (-not (Test-Path -LiteralPath (Join-Path $ocSkills $name))) {
            $missing += $name
        }
    }
}

$skillCount = @(Get-ChildItem -LiteralPath $ocSkills -Directory -ErrorAction SilentlyContinue).Count
$allowList = @($settings.permissions.allow) -join ", "

Log ""
Log "=== Health ===" Cyan
Log "Skills live: $skillCount" White
Log "MCPs: $($serverNames -join ', ')" White
Log "Tools allow: $allowList" White
if ($missing.Count -gt 0) {
    Log "Missing must-have skills (run sync-from-cursor.ps1):" Yellow
    foreach ($m in $missing) { Log "  [MISS] $m" Yellow }
} else {
    Log "[OK] All manifest must-have skills present" Green
}

Log ""
Log "Done. Restart OpenClaude (run.bat, prefer Local) to load changes." Green
Log "Edit anytime: Skills\  MCPs\  Tools\  then re-run this script." DarkGray
Log ""
