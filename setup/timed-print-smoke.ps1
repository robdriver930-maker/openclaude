param(
  [int]$TimeoutSec = 180,
  [string]$Effort = 'low',
  [string]$Mode = 'normal'
)
$ErrorActionPreference = 'Continue'
$root = 'C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main'
$node = 'C:\Program Files\nodejs\node.exe'
$o = Join-Path $env:TEMP 'oc_timed_out.txt'
$e = Join-Path $env:TEMP 'oc_timed_err.txt'
$dbg = Join-Path $env:TEMP 'oc_timed_debug.log'
if (Test-Path $o) { Remove-Item $o -Force }
if (Test-Path $e) { Remove-Item $e -Force }
if (Test-Path $dbg) { Remove-Item $dbg -Force }

$env:CLAUDE_CODE_USE_OPENAI = '1'
$env:OPENAI_BASE_URL = 'http://127.0.0.1:11434/v1'
$env:OPENAI_API_KEY = 'ollama'
$env:OPENAI_MODEL = 'qwen3.6-oc:27b'
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:CLAUDE_CODE_PROFILE_QUERY = '1'
$env:OPENCLAUDE_PERFORMANCE_MODE = 'snappy5090'
$env:CLAUDE_CODE_SIMPLE = if ($Mode -eq 'bare') { '1' } else { $null }

$cli = Join-Path $root 'dist\cli.mjs'
$argsList = @($cli, '--print', '--model', 'qwen3.6-oc:27b', '--effort', $Effort, '--dangerously-skip-permissions', '--permission-mode', 'bypassPermissions', '--no-session-persistence')

if ($Mode -eq 'bare') {
  $argsList += '--bare'
}
if ($Mode -eq 'debug') {
  $argsList += @('--verbose', '--debug-file', $dbg)
}
if ($Mode -eq 'toolsOff') {
  $argsList += @('--tools', '')
}

$argsList += 'Reply with exactly: PONG'

Write-Host ("MODE=" + $Mode + " EFFORT=" + $Effort)
Write-Host ("ARGS=" + ($argsList -join ' '))
$sw = [Diagnostics.Stopwatch]::StartNew()
$p = Start-Process $node -ArgumentList $argsList -WorkingDirectory $root -NoNewWindow -PassThru -RedirectStandardOutput $o -RedirectStandardError $e
if ($p.WaitForExit($TimeoutSec * 1000)) {
  Write-Host ("EXIT=" + $p.ExitCode)
} else {
  try { Stop-Process -Id $p.Id -Force } catch {}
  Write-Host ("TIMEOUT_" + $TimeoutSec + "s")
}
$sw.Stop()
Write-Host ("ELAPSED_MS=" + $sw.ElapsedMilliseconds)
Write-Host '---OUT---'
if (Test-Path $o) { Get-Content $o -Raw }
Write-Host '---ERR---'
if (Test-Path $e) {
  $err = Get-Content $e -Raw
  if ($null -ne $err -and $err.Length -gt 3000) { $err.Substring(0, 3000) } else { $err }
}
if ((Test-Path $dbg) -and ((Get-Item $dbg).Length -gt 0)) {
  Write-Host '---DEBUG_TAIL---'
  Get-Content $dbg -Tail 80
}
