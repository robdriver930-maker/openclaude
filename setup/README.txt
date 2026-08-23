OpenClaude setup
================

Daily use: double-click ..\run.bat

Sync Cursor + find-skills into OpenClaude:
  powershell -ExecutionPolicy Bypass -File setup\sync-from-cursor.ps1

Other one-time scripts:
  install-openclaude-full.ps1   — hardware tune
  install-openclaude-vscode.ps1 — VS Code extension
  install-openclaude-ide.ps1    — IDE wiring

Skills live in:
  %USERPROFILE%\.openclaude\skills
  ..\.openclaude\skills   (project mirror)

find-skills source of truth:
  C:\Users\GoldenBoy\Desktop\find skills\find skills.txt
