$ErrorActionPreference = 'Continue'
$root = 'C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main'
$node = 'C:\Program Files\nodejs\node.exe'
$dbg = Join-Path $env:TEMP 'oc_print_debug.log'
$o = Join-Path $env:TEMP 'oc_print_out.txt'
$e = Join-Path $env:TEMP 'oc_print_err.txt'
foreach ($p in @($dbg, $o, $e)) { if (Test-Path $p) { Remove-Item $p -Force } }

$env:CLAUDE_CODE_USE_OPENAI = '1'
$env:OPENAI_BASE_URL = 'http://127.0.0.1:11434/v1'
$env:OPENAI_API_KEY = 'ollama'
$env:OPENAI_MODEL = 'qwen3.6-oc:27b'
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:CLAUDE_CODE_PROFILE_QUERY = '1'
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1'
$env:DISABLE_TELEMETRY = '1'
$env:CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY = '1'
$env:OPENCLAUDE_PERFORMANCE_MODE = 'snappy5090'

$argsList = @(
  (Join-Path $root 'dist\cli.mjs'),
  '--print',
  '--bare',
  '--model', 'qwen3.6-oc:27b',
  '--effort', 'low',
  '--dangerously-skip-permissions',
  '--permission-mode', 'bypassPermissions',
  '--no-session-persistence',
  '--debug-file', $dbg,
  'PONG'
)

Write-Host 'Starting debug print...'
$sw = [Diagnostics.Stopwatch]::StartNew()
$p = Start-Process $node -ArgumentList $argsList -WorkingDirectory $root -NoNewWindow -PassThru -RedirectStandardOutput $o -RedirectStandardError $e
# Poll: if debug log grows, show last lines
$deadline = (Get-Date).AddSeconds(60)
while (-not $p.HasExited -and (Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 5
  if (Test-Path $dbg) {
    $len = (Get-Item $dbg).Length
    Write-Host ("t={0}s debug_bytes={1}" -f [int]$sw.Elapsed.TotalSeconds, $len)
  } else {
    Write-Host ("t={0}s no debug yet" -f [int]$sw.Elapsed.TotalSeconds)
  }
}
if (-not $p.HasExited) {
  Write-Host 'Still running after 60s — dumping debug tail then waiting 60s more'
  if (Test-Path $dbg) { Get-Content $dbg -Tail 40 }
  $null = $p.WaitForExit(60000)
}
if (-not $p.HasExited) {
  Write-Host 'TIMEOUT kill'
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
} else {
  Write-Host ("EXIT=" + $p.ExitCode)
}
$sw.Stop()
Write-Host ("ELAPSED_MS=" + $sw.ElapsedMilliseconds)
Write-Host '---OUT---'
if (Test-Path $o) { Get-Content $o -Raw }
Write-Host '---ERR---'
if (Test-Path $e) { Get-Content $e -Raw }
Write-Host '---DEBUG_TAIL---'
if (Test-Path $dbg) { Get-Content $dbg -Tail 100 }
