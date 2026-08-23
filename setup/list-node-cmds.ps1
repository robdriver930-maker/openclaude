Get-Process node -ErrorAction SilentlyContinue |
  Select-Object Id, CPU, @{N='WS_MB';E={[math]::Round($_.WorkingSet64/1MB,1)}}, StartTime |
  Format-Table -AutoSize
Get-CimInstance Win32_Process -Filter "name='node.exe'" |
  Select-Object ProcessId, CommandLine |
  Format-List
