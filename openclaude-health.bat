@echo off
title OpenClaude Health Check
cd /d "C:\Users\robdr\Desktop\openclaude\openclaude-main"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0openclaude-health.ps1"
echo.
pause
