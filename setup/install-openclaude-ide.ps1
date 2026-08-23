# Install OpenClaude into VS Code and/or Cursor for fast IDE replies.
# Does NOT modify run.bat or wipe openclaude-main - only adds IDE wiring.
#
#   powershell -ExecutionPolicy Bypass -File setup\install-openclaude-ide.ps1
#   powershell -ExecutionPolicy Bypass -File setup\install-openclaude-ide.ps1 -Strong
#   powershell -ExecutionPolicy Bypass -File setup\install-openclaude-ide.ps1 -SkipCursor
#   powershell -ExecutionPolicy Bypass -File setup\install-openclaude-ide.ps1 -SkipVSCode

param(
    [switch]$SkipPackage,
    [switch]$SkipCopilotRemoval,
    [switch]$SkipCursor,
    [switch]$SkipVSCode,
    [switch]$Strong
)

$ErrorActionPreference = "Stop"
$root = "C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main"
$extDir = Join-Path $root "vscode-extension\openclaude-vscode"
$launchFast = Join-Path $root "bin\vscode-launch-openclaude-fast.bat"
$launchStrong = Join-Path $root "bin\vscode-launch-openclaude.bat"
if ($Strong) {
    $launchBat = $launchStrong
} else {
    $launchBat = $launchFast
}

function Log {
    param([string]$Msg, [string]$Color = "White")
    Write-Host $Msg -ForegroundColor $Color
}

function Find-IdeCli {
    param([string]$Name)
    $fromPath = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    $candidates = @($fromPath)
    if ($Name -eq "code") {
        $candidates += @(
            "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
            "$env:ProgramFiles\Microsoft VS Code\bin\code.cmd"
        )
    } else {
        $candidates += @(
            "$env:LOCALAPPDATA\Programs\cursor\resources\app\bin\cursor.cmd",
            "$env:LOCALAPPDATA\Programs\Cursor\resources\app\bin\cursor.cmd",
            "$env:LOCALAPPDATA\Programs\cursor\bin\cursor.cmd"
        )
    }
    $hit = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
    return $hit
}

function Write-OpenClaudeSettings {
    param(
        [string]$SettingsPath,
        [string]$LaunchPath,
        [string]$Label
    )
    $settingsDir = Split-Path $SettingsPath -Parent
    if (-not (Test-Path $settingsDir)) {
        New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
    }

    $settings = [ordered]@{}
    if (Test-Path $SettingsPath) {
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $bak = Join-Path $settingsDir "settings.backup.openclaude-ide.$stamp.json"
        Copy-Item $SettingsPath $bak -Force
        Log "[OK]      Backed up $Label settings -> $bak" "Green"
        try {
            $raw = Get-Content $SettingsPath -Raw -Encoding UTF8
            if ($raw -and $raw.Trim()) {
                $parsed = $raw | ConvertFrom-Json
                foreach ($prop in $parsed.PSObject.Properties) {
                    $settings[$prop.Name] = $prop.Value
                }
            }
        } catch {
            Log "[WARN]     Could not parse $Label settings - writing OpenClaude keys fresh" "Yellow"
            $settings = [ordered]@{}
        }
    }

    $settings["openclaude.launchCommand"] = $LaunchPath
    $settings["openclaude.useOpenAIShim"] = $true
    $settings["openclaude.permissionMode"] = "bypassPermissions"
    $settings["openclaude.terminalName"] = "OpenClaude"

    $copilotEnable = New-Object PSObject
    $copilotEnable | Add-Member -NotePropertyName "*" -NotePropertyValue $false
    $settings["github.copilot.enable"] = $copilotEnable
    $settings["github.copilot.editor.enableAutoCompletions"] = $false
    $settings["github.copilot.editor.enableCodeActions"] = $false
    # Hide built-in Agents / Copilot Chat windows (they are NOT OpenClaude)
    $settings["chat.agent.enabled"] = $false
    $settings["chat.commandCenter.enabled"] = $false
    $settings["workbench.secondarySideBar.defaultVisibility"] = "hidden"

    $json = $settings | ConvertTo-Json -Depth 20
    [System.IO.File]::WriteAllText($SettingsPath, $json + "`n", [System.Text.UTF8Encoding]::new($false))
    Log "[OK]      Wrote OpenClaude keys to $SettingsPath" "Green"
}

function Install-IntoIde {
    param(
        [string]$Cli,
        [string]$VsixPath,
        [string]$SettingsPath,
        [string]$Label,
        [string]$LaunchPath,
        [switch]$RemoveCopilot
    )
    if (-not $Cli) {
        Log "[SKIP]     $Label CLI not found" "Yellow"
        return
    }
    Log "[INFO] Installing into $Label via $Cli ..." "Cyan"
    & $Cli --install-extension $VsixPath --force
    if ($LASTEXITCODE -ne 0) {
        Log "[FAIL]     $Label install-extension failed" "Red"
        return
    }
    Log "[OK]      Extension installed in $Label" "Green"

    if ($RemoveCopilot) {
        foreach ($extId in @("GitHub.copilot", "GitHub.copilot-chat")) {
            $prev = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            & $Cli --uninstall-extension $extId 2>&1 | Out-Null
            $ErrorActionPreference = $prev
            Log "[OK]      $Label Copilot cleared: $extId" "Green"
        }
    }

    Write-OpenClaudeSettings -SettingsPath $SettingsPath -LaunchPath $LaunchPath -Label $Label
}

Log "" "Cyan"
Log "=== Install OpenClaude for VS Code + Cursor (fast IDE) ===" "Cyan"
Log ""

if (-not (Test-Path $launchFast)) {
    Log "[FAIL] Missing fast launcher: $launchFast" "Red"
    exit 1
}
if (-not (Test-Path $launchStrong)) {
    Log "[FAIL] Missing strong launcher: $launchStrong" "Red"
    exit 1
}
if (-not (Test-Path $extDir)) {
    Log "[FAIL] Missing extension folder: $extDir" "Red"
    exit 1
}

Log "[OK]      IDE launcher: $launchBat" "Green"
if ($Strong) {
    Log "[INFO] Mode: STRONG (qwen3-coder:30b)" "Cyan"
} else {
    Log "[INFO] Mode: FAST (qwen2.5-coder:7b). Use -Strong for 30b in IDE." "Cyan"
}

if (-not $SkipPackage) {
    Push-Location $extDir
    try {
        if (-not (Test-Path (Join-Path $extDir "node_modules"))) {
            Log "[INFO] npm install in extension folder..." "Cyan"
            npm install --no-fund --no-audit
            if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        }
        Log "[INFO] Packaging extension..." "Cyan"
        npm run package
        if ($LASTEXITCODE -ne 0) { throw "npm run package failed" }
    } finally {
        Pop-Location
    }
}

$vsix = Get-ChildItem -Path $extDir -Filter "*.vsix" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $vsix) {
    Log "[FAIL] No .vsix found in $extDir" "Red"
    exit 1
}
Log "[OK]      VSIX: $($vsix.FullName)" "Green"

$removeCopilot = -not $SkipCopilotRemoval

if (-not $SkipVSCode) {
    $codeCli = Find-IdeCli -Name "code"
    Install-IntoIde -Cli $codeCli -VsixPath $vsix.FullName `
        -SettingsPath (Join-Path $env:APPDATA "Code\User\settings.json") `
        -Label "VS Code" -LaunchPath $launchBat -RemoveCopilot:$removeCopilot
}

if (-not $SkipCursor) {
    $cursorCli = Find-IdeCli -Name "cursor"
    Install-IntoIde -Cli $cursorCli -VsixPath $vsix.FullName `
        -SettingsPath (Join-Path $env:APPDATA "Cursor\User\settings.json") `
        -Label "Cursor" -LaunchPath $launchBat -RemoveCopilot:$removeCopilot
}

try {
    if ($Strong) {
        $model = "qwen3-coder:30b"
    } else {
        $model = "qwen2.5-coder:7b"
    }
    Log "[INFO] Warming $model in Ollama..." "Cyan"
    $bodyObj = @{
        model      = $model
        prompt     = "ok"
        stream     = $false
        options    = @{ num_ctx = 1024; num_predict = 8 }
        keep_alive = "120m"
    }
    $body = $bodyObj | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/generate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 120 | Out-Null
    Log "[OK]      Model warm" "Green"
} catch {
    Log "[WARN]     Could not warm model (is Ollama running?): $($_.Exception.Message)" "Yellow"
}

Log ""
Log "DONE. Important:" "Cyan"
Log "  The 'with Copilot' dropdown is NOT OpenClaude - you cannot pick OpenClaude there." "Yellow"
Log "  Use the OpenClaude icon on the left Activity Bar (or Ctrl+Shift+P -> OpenClaude)." "Yellow"
Log ""
Log "  1. Fully quit Cursor / VS Code and reopen" "DarkGray"
Log "  2. Start Ollama (tray)" "DarkGray"
Log "  3. File -> Open Folder on your project" "DarkGray"
Log "  4. Left bar -> OpenClaude -> Launch in Workspace Root  OR  Open Chat Panel" "DarkGray"
Log "  5. Daily full power still uses Desktop run.bat (unchanged)" "DarkGray"
Log ""
