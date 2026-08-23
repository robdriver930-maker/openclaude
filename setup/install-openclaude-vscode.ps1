# Install OpenClaude VS Code extension, wire Ollama launch, remove GitHub Copilot.
# Run: powershell -ExecutionPolicy Bypass -File setup\install-openclaude-vscode.ps1

param(
    [switch]$SkipPackage,
    [switch]$SkipCopilotRemoval
)

$ErrorActionPreference = "Stop"
$root = "C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main"
$extDir = Join-Path $root "vscode-extension\openclaude-vscode"
$launchBat = Join-Path $root "bin\vscode-launch-openclaude.bat"
$codeUserSettings = Join-Path $env:APPDATA "Code\User\settings.json"

function Log {
    param([string]$Msg, [string]$Color = "White")
    Write-Host $Msg -ForegroundColor $Color
}

function Find-CodeCli {
    $fromPath = Get-Command code -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    $candidates = @(
        $fromPath,
        "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd",
        "$env:ProgramFiles\Microsoft VS Code\bin\code.cmd",
        "${env:ProgramFiles(x86)}\Microsoft VS Code\bin\code.cmd"
    ) | Where-Object { $_ -and (Test-Path $_) }
    if ($candidates.Count -gt 0) { return $candidates[0] }
    return $null
}

Log "" "Cyan"
Log "=== Install OpenClaude for VS Code ===" "Cyan"
Log ""

if (-not (Test-Path $launchBat)) {
    Log "[FAIL] Missing launcher: $launchBat" "Red"
    exit 1
}
if (-not (Test-Path $extDir)) {
    Log "[FAIL] Missing extension folder: $extDir" "Red"
    exit 1
}

$codeCli = Find-CodeCli
if (-not $codeCli) {
    Log "[FAIL] VS Code CLI (code) not found. Install VS Code and enable 'code' on PATH." "Red"
    exit 1
}
Log "[OK]      VS Code CLI: $codeCli" "Green"

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
    Log "[FAIL] No .vsix found in $extDir after package" "Red"
    exit 1
}
Log "[OK]      VSIX: $($vsix.FullName)" "Green"

& $codeCli --install-extension $vsix.FullName --force
if ($LASTEXITCODE -ne 0) {
    Log "[FAIL] code --install-extension failed" "Red"
    exit 1
}
Log "[OK]      Extension installed" "Green"

if (-not $SkipCopilotRemoval) {
    foreach ($extId in @("GitHub.copilot", "GitHub.copilot-chat")) {
        try {
            $prev = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            & $codeCli --uninstall-extension $extId 2>&1 | Out-Null
            $ErrorActionPreference = $prev
        } catch {
            # not installed is fine
        }
        Log "[OK]      Copilot extension cleared: $extId" "Green"
    }
}

$settingsDir = Split-Path $codeUserSettings -Parent
if (-not (Test-Path $settingsDir)) {
    New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
}

$settings = [ordered]@{}
if (Test-Path $codeUserSettings) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $bak = Join-Path $settingsDir "settings.backup.openclaude-vscode.$stamp.json"
    Copy-Item $codeUserSettings $bak -Force
    Log "[OK]      Backed up settings -> $bak" "Green"
    try {
        $raw = Get-Content $codeUserSettings -Raw -Encoding UTF8
        if ($raw -and $raw.Trim()) {
            $parsed = $raw | ConvertFrom-Json
            foreach ($prop in $parsed.PSObject.Properties) {
                $settings[$prop.Name] = $prop.Value
            }
        }
    } catch {
        Log "[WARN]     Could not parse existing settings.json - writing OpenClaude keys fresh" "Yellow"
        $settings = [ordered]@{}
    }
}

$settings["openclaude.launchCommand"] = $launchBat
$settings["openclaude.useOpenAIShim"] = $true
$settings["openclaude.permissionMode"] = "bypassPermissions"
$settings["openclaude.terminalName"] = "OpenClaude"

$copilotEnable = New-Object PSObject
$copilotEnable | Add-Member -NotePropertyName "*" -NotePropertyValue $false
$settings["github.copilot.enable"] = $copilotEnable
$settings["github.copilot.editor.enableAutoCompletions"] = $false
$settings["github.copilot.editor.enableCodeActions"] = $false

$json = $settings | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($codeUserSettings, $json + "`n", [System.Text.UTF8Encoding]::new($false))
Log "[OK]      Wrote OpenClaude + Copilot-off keys to $codeUserSettings" "Green"

Log ""
Log "DONE. Restart VS Code, then:" "Cyan"
Log "  1. Start Ollama (tray)" "DarkGray"
Log "  2. File -> Open Folder on your project" "DarkGray"
Log "  3. Activity Bar -> OpenClaude -> Launch in Workspace Root" "DarkGray"
Log "  4. Or Command Palette -> OpenClaude: Open Chat Panel" "DarkGray"
Log ""
