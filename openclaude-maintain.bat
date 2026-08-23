@echo off
title OpenClaude Maintenance
cd /d "C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main"
echo.
echo OpenClaude weekly maintenance — keeps him fast for months of use.
echo This takes 1-3 minutes (model warm + Playwright check).
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0openclaude-maintain.ps1"
echo.
pause
