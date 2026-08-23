# Sync Cursor + find-skills recommendations into OpenClaude
# Run:
#   powershell -ExecutionPolicy Bypass -File setup\sync-from-cursor.ps1
#
# Sources:
#   %USERPROFILE%\.agents\skills
#   %USERPROFILE%\.cursor\skills-cursor
#   Desktop\find skills\find skills.txt  (recommendation checklist)
#
# Destinations (OpenClaude loads both):
#   %USERPROFILE%\.openclaude\skills
#   <repo>\.openclaude\skills

param(
    [switch]$SkipRecommendedInstall,
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$setupDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $setupDir
$agents = Join-Path $env:USERPROFILE ".agents\skills"
$cursor = Join-Path $env:USERPROFILE ".cursor\skills-cursor"
$ocSkills = Join-Path $env:USERPROFILE ".openclaude\skills"
$projSkills = Join-Path $root ".openclaude\skills"
$findSkills = "C:\Users\GoldenBoy\Desktop\find skills\find skills.txt"
$settingsPath = Join-Path $env:USERPROFILE ".openclaude\settings.json"

function Log($msg, $color = "White") {
    if (-not $Quiet) { Write-Host $msg -ForegroundColor $color }
}

function Copy-SkillDir([string]$src, [string]$destName) {
    $dest = Join-Path $ocSkills $destName
    if (Test-Path $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }
    Copy-Item -LiteralPath $src -Destination $dest -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $ocSkills | Out-Null

Log ""
Log "=== Sync Cursor skills -> OpenClaude ===" Cyan

$copied = 0
if (Test-Path $agents) {
    Get-ChildItem $agents -Directory | ForEach-Object {
        Copy-SkillDir $_.FullName $_.Name
        $copied++
    }
}
if (Test-Path $cursor) {
    Get-ChildItem $cursor -Directory | ForEach-Object {
        Copy-SkillDir $_.FullName ("cursor-" + $_.Name)
        $copied++
    }
}

# Project mirror
if (Test-Path $projSkills) { Remove-Item -LiteralPath $projSkills -Recurse -Force }
New-Item -ItemType Directory -Force -Path $projSkills | Out-Null
cmd /c "robocopy `"$ocSkills`" `"$projSkills`" /E /NFL /NDL /NJH /NJS /nc /ns /np" | Out-Null

$count = (Get-ChildItem $ocSkills -Directory).Count
Log "[OK] Synced $copied skill folders. OpenClaude now has $count skills." Green
Log "     User: $ocSkills" DarkGray
Log "     Project: $projSkills" DarkGray

if (-not $SkipRecommendedInstall -and (Test-Path $findSkills)) {
    Log ""
    Log "=== find skills.txt checklist (already installed if present) ===" Cyan
    $checklist = @(
        "playwright-best-practices",
        "supabase",
        "supabase-postgres-best-practices",
        "vercel-react-view-transitions",
        "deploy-to-vercel",
        "extract-design-system",
        "emil-design-eng",
        "copywriting",
        "seo-audit",
        "agent-browser",
        "insecure-defaults",
        "differential-review",
        "supply-chain-risk-auditor"
    )
    foreach ($name in $checklist) {
        $ok = Test-Path (Join-Path $ocSkills $name)
        if ($ok) { Log "  [HAVE] $name" Green } else { Log "  [MISS] $name" Yellow }
    }
    Log "Source list: $findSkills" DarkGray
}

# Ensure Skill tool is allowed
if (Test-Path $settingsPath) {
    $json = Get-Content $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $allow = @($json.permissions.allow)
    $deny = @($json.permissions.deny)
    if ($allow -notcontains "Skill") {
        $json.permissions.allow = @($allow + "Skill")
    }
    if ($deny -contains "Skill") {
        $json.permissions.deny = @($deny | Where-Object { $_ -ne "Skill" })
    }
    $json | ConvertTo-Json -Depth 30 | Set-Content $settingsPath -Encoding UTF8
    Log "[OK] Skill tool enabled in settings.json" Green
}

# Merge editable stack folders (Skills / MCPs / Tools) into live paths
$apply = Join-Path $setupDir "apply-stack.ps1"
if (Test-Path -LiteralPath $apply) {
    Log ""
    Log "=== apply-stack (Skills / MCPs / Tools) ===" Cyan
    if ($Quiet) {
        & $apply -Quiet
    } else {
        & $apply
    }
} else {
    Log "[WARN] setup\apply-stack.ps1 missing - skipped stack apply" Yellow
}

Log ""
Log "Done. Restart OpenClaude (run.bat, prefer Local) to load skills + stack." Green
Log ""
