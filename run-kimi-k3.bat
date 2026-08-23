@echo off
setlocal EnableExtensions
rem ============================================================
rem  OPENCLAUDE — Kimi K3 via Ollama Cloud (no local 1.6TB weights)
rem  Double-click or: run-kimi-k3.bat
rem  Needs: Ollama running + Pro/Max + extra usage credits
rem ============================================================
title OpenClaude - Kimi K3 Cloud
set "ROOT=C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main"
cd /d "%ROOT%" || (
  echo ERROR: Cannot open folder:
  echo   %ROOT%
  pause
  exit /b 1
)

set "MODEL=kimi-k3:cloud"
set "PASSTHRU=%*"

echo.
echo ============================================================
echo  OpenClaude — Kimi K3 ^(Ollama Cloud^)
echo  Model: %MODEL%
echo  Runs on Ollama servers — no local VRAM / no 1.6TB download
echo  Needs Ollama Pro/Max + extra usage credits
echo ============================================================
echo.
echo Checking install...

if not exist "%ROOT%\dist\cli.mjs" (
  echo ERROR: Build missing: dist\cli.mjs
  echo Fix:  cd /d "%ROOT%"
  echo       bun run build
  echo.
  pause
  exit /b 1
)

if not exist "C:\Program Files\nodejs\node.exe" (
  where node >nul 2>&1
  if errorlevel 1 (
    echo ERROR: Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
  )
)

echo Waiting for Ollama on http://127.0.0.1:11434 ...
set "OLLAMA_READY=0"
for /L %%i in (1,1,20) do (
  powershell -NoProfile -Command "try { Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    set "OLLAMA_READY=1"
    goto ollama_ready
  )
  timeout /t 1 /nobreak >nul
)
:ollama_ready
if "%OLLAMA_READY%"=="0" (
  echo ERROR: Ollama is not running on http://127.0.0.1:11434
  echo Start the Ollama app from the Start menu, wait 10 seconds, then run this again.
  echo.
  pause
  exit /b 1
)

echo Ensuring cloud model is available: %MODEL%
ollama pull %MODEL%
if errorlevel 1 (
  echo ERROR: Could not pull %MODEL%
  echo Fix: sign in to Ollama ^(Pro/Max^), add extra usage credits, then retry.
  echo Docs: https://ollama.com/library/kimi-k3
  echo.
  pause
  exit /b 1
)

echo Checking Extra usage access for %MODEL%...
set "OPENAI_BASE_URL=http://127.0.0.1:11434/v1"
set "OPENAI_MODEL=%MODEL%"
"C:\Program Files\nodejs\node.exe" "%ROOT%\setup\check-kimi-k3-cloud.mjs"
set "KIMI_CHECK=%ERRORLEVEL%"
if not "%KIMI_CHECK%"=="0" (
  echo.
  echo OpenClaude will NOT start until Extra usage has credit.
  echo Working now without Extra $:  run-kimi.bat  ^(kimi-k2.7-code:cloud^)
  echo Local GPU:                   run.bat
  echo.
  pause
  exit /b %KIMI_CHECK%
)

echo [OK] Folder, Node, Ollama, Extra usage, model tag
echo Model: %MODEL%
echo Link: http://127.0.0.1:11434/v1
echo.

"C:\Program Files\nodejs\node.exe" -e "const fs=require('fs');const p=require('path').join(process.env.USERPROFILE,'.openclaude','settings.json');const s=JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));s.effortLevel='max';s.alwaysThinkingEnabled=true;s.model='kimi-k3:cloud';s.env=s.env||{};s.env.CLAUDE_CODE_USE_OPENAI='1';s.env.OPENAI_BASE_URL='http://127.0.0.1:11434/v1';s.env.OPENAI_API_KEY='ollama';s.env.OPENAI_MODEL='kimi-k3:cloud';s.enabledPlugins={};delete s.statusLine;delete s.env.OPENCLAUDE_TTS;s.env.OLLAMA_CONTEXT_LENGTH='131072';s.env.CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW='131072';s.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW='110592';s.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS='16384';try{const m=JSON.parse(s.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS||'{}');m['kimi-k3:cloud']=131072;m['kimi-k2.7-code:cloud']=m['kimi-k2.7-code:cloud']||120000;s.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS=JSON.stringify(m);}catch(_){}fs.writeFileSync(p,JSON.stringify(s,null,4)+'\n');console.log('[OK] settings: model=kimi-k3:cloud (Ollama Cloud)');"
"C:\Program Files\nodejs\node.exe" "%~dp0setup\install-tts-hooks.mjs"

set "CLAUDE_CODE_NO_FLICKER=0"
set "CLAUDE_CODE_DISABLE_MOUSE=1"
set "CLAUDE_CODE_DISABLE_MOUSE_CLICKS=1"
set "CLAUDE_CODE_FORCE_FULL_LOGO=1"
set "CLAUDE_CODE_USE_OPENAI=1"
set "OPENAI_BASE_URL=http://127.0.0.1:11434/v1"
set "OPENAI_API_KEY=ollama"
set "OPENAI_MODEL=%MODEL%"
set "OLLAMA_HOST=127.0.0.1:11434"
set "OLLAMA_KEEP_ALIVE=120m"
set "OLLAMA_NUM_PARALLEL=2"
set "OLLAMA_MAX_LOADED_MODELS=2"
set "OLLAMA_CONTEXT_LENGTH=131072"
set "CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW=131072"
set "CLAUDE_CODE_AUTO_COMPACT_WINDOW=110592"
set "CLAUDE_CODE_MAX_OUTPUT_TOKENS=16384"
set "API_TIMEOUT_MS=2400000"
set "CLAUDE_STREAM_IDLE_TIMEOUT_MS=900000"
set "OPENCLAUDE_MAX_RETRIES=20"
set "OPENCLAUDE_RETRY_DELAY_MS=3000"
set "USE_BUILTIN_RIPGREP=0"
set "CLAUDE_ENABLE_STREAM_WATCHDOG=1"
set "OPENCLAUDE_DISABLE_TOOL_REMINDERS=1"
set "OPENCLAUDE_TTS="
set "OPENCLAUDE_INSTALL_ROOT=%ROOT%"
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%LOCALAPPDATA%\Programs\cursor\resources\app\node_modules\@vscode\ripgrep\bin;%PATH%"

if exist "C:\Program Files\Git\bin\bash.exe" set "CLAUDE_CODE_GIT_BASH_PATH=C:\Program Files\Git\bin\bash.exe"

echo.
echo Starting OpenClaude with Kimi K3 Cloud...
echo Model: %MODEL%
echo Note: uses Ollama cloud credits ^(not your RTX 5090^).
echo Press Esc to cancel a stuck reply.
echo.

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

"%NODE_EXE%" --max-old-space-size=8192 "%ROOT%\dist\cli.mjs" --model %MODEL% --dangerously-skip-permissions --permission-mode bypassPermissions %PASSTHRU%
set "EXITCODE=%ERRORLEVEL%"

if "%EXITCODE%"=="0" (
  echo.
  echo OpenClaude closed normally.
  exit /b 0
)

echo.
echo OpenClaude exited with error %EXITCODE%.
echo Checks:
echo   1. Ollama tray app running + signed in
echo   2. Pro/Max + extra usage credits for kimi-k3:cloud
echo   3. ollama pull kimi-k3:cloud
echo   4. Build present: dist\cli.mjs
echo.
pause
exit /b %EXITCODE%
