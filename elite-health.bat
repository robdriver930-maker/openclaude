@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0elite-health.ps1"
set "result=%ERRORLEVEL%"
pause
exit /b %result%
