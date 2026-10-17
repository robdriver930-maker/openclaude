param()
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$failures=0
function Check($label,$ok){if($ok){Write-Host "[PASS] $label"}else{Write-Host "[FAIL] $label";$script:failures++}}
Write-Host 'Elite diagnostics (no model generation, installs or system changes)'
foreach($relative in @('elite-launch.bat','dist\cli.mjs','tools\runtime\node-v22.23.3-win-x64\node.exe','tools\runtime\bun-windows-x64\bun.exe','tools\runtime\PortableGit\bin\bash.exe','node_modules\@vscode\ripgrep-win32-x64\bin\rg.exe')){Check $relative (Test-Path -LiteralPath (Join-Path $root $relative))}
try{
 $settings=Get-Content -LiteralPath "$env:USERPROFILE\.openclaude\settings.json" -Raw | ConvertFrom-Json
 Check 'Ollama endpoint' ($settings.env.OPENAI_BASE_URL -eq 'http://127.0.0.1:11434/v1')
 $map=$settings.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS | ConvertFrom-Json
 Check 'Model context map' ($map.'qwen3.8-oc-code:27b' -gt 0)
}catch{Check 'Readable settings' $false}
try{
 $version=Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 5
 Write-Host "Ollama version: $($version.version)"
 $tags=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5
 foreach($name in @('qwen3.8-oc-code:27b','kimi-k2.7-code:cloud','glm-5.3:cloud','glm-5.3-flash:cloud')){Check "Model registered: $name" ($name -in $tags.models.name)}
 $resident=Invoke-RestMethod 'http://127.0.0.1:11434/api/ps' -TimeoutSec 5
 Write-Host "Loaded models: $(@($resident.models).Count)"
}catch{Check 'Ollama reachable' $false}
Write-Host "Project skill folders: $(@(Get-ChildItem "$root\.openclaude\skills" -Directory).Count)"
Write-Host "Project agent definitions: $(@(Get-ChildItem "$root\.openclaude\agents" -File -Filter '*.md').Count)"
Write-Host 'Voice hooks and parked external MCP services are not enabled; their dependencies/authentication are absent.'
Write-Host 'This check does not prove model responses, cloud account quota, every skill helper, or PC stability.'
exit ([int]($failures -gt 0))