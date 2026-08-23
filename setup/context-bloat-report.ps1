$ErrorActionPreference = 'Continue'
$oc = Join-Path $env:USERPROFILE '.openclaude'
$skills = Join-Path $oc 'skills'
$agents = Join-Path $oc 'agents'
$plugins = Join-Path $oc 'plugins'
$settingsPath = Join-Path $oc 'settings.json'
$claudeMd = Join-Path $oc 'CLAUDE.md'

Write-Host '=== PROFILE BLOAT ==='
Write-Host ("skill_dirs=" + @(Get-ChildItem -LiteralPath $skills -Directory -EA SilentlyContinue).Count)
Write-Host ("skill_files=" + @(Get-ChildItem -LiteralPath $skills -Recurse -File -EA SilentlyContinue).Count)
Write-Host ("agent_mds=" + @(Get-ChildItem -LiteralPath $agents -Filter '*.md' -EA SilentlyContinue).Count)
Write-Host ("plugin_files=" + @(Get-ChildItem -LiteralPath $plugins -Recurse -File -EA SilentlyContinue).Count)
if (Test-Path $claudeMd) {
  Write-Host ("CLAUDE.md_bytes=" + (Get-Item $claudeMd).Length)
}

if (Test-Path $settingsPath) {
  $raw = Get-Content -LiteralPath $settingsPath -Raw
  if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 0xFEFF) { $raw = $raw.Substring(1) }
  $s = $raw | ConvertFrom-Json
  Write-Host ''
  Write-Host '=== SETTINGS ==='
  Write-Host ("model=" + $s.model)
  Write-Host ("effort=" + $s.effortLevel)
  Write-Host ("thinking=" + $s.alwaysThinkingEnabled)
  $mcpCount = 0
  if ($s.mcpServers) { $mcpCount = @($s.mcpServers.PSObject.Properties).Count }
  Write-Host ("mcpServers=" + $mcpCount)
  Write-Host ("OLLAMA_CONTEXT_LENGTH=" + $s.env.OLLAMA_CONTEXT_LENGTH)
  Write-Host ("AUTO_COMPACT_WINDOW=" + $s.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW)
  Write-Host ("FALLBACK_CTX=" + $s.env.CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW)
}

Write-Host ''
Write-Host '=== TOP SKILL DIRS ==='
Get-ChildItem -LiteralPath $skills -Directory -EA SilentlyContinue |
  Sort-Object Name |
  Select-Object -First 20 -ExpandProperty Name
