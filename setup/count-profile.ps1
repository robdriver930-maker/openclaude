$oc = Join-Path $env:USERPROFILE '.openclaude'
$skills = Join-Path $oc 'skills'
$agents = Join-Path $oc 'agents'
$plugins = Join-Path $oc 'plugins'
Write-Host ("skills_files=" + @(Get-ChildItem -LiteralPath $skills -Recurse -File -EA SilentlyContinue).Count)
Write-Host ("agents_files=" + @(Get-ChildItem -LiteralPath $agents -File -EA SilentlyContinue).Count)
Write-Host ("plugins_files=" + @(Get-ChildItem -LiteralPath $plugins -Recurse -File -EA SilentlyContinue).Count)
