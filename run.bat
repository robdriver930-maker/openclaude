@echo off
setlocal EnableExtensions
rem ============================================================
rem  OPENCLAUDE — one launcher, cloud MAX, picks your model
rem  Double-click: run.bat
rem  Weights: official Qwen3.8-27B + 160k OpenClaude tag + effort max + thinking
rem ============================================================
title OpenClaude - MAX (Ollama)
set "ROOT=C:\Users\robdr\Desktop\openclaude\openclaude-main"
cd /d "%ROOT%" || (
  echo ERROR: Cannot open folder:
  echo   %ROOT%
  pause
  exit /b 1
)

set "MODEL="
set "SOURCE=qwen3.8:27b"
set "PASSTHRU=%*"

:: Allow command-line override: run.bat --model glm-5.3-flash:cloud
:parse_args
if /I "%~1"=="--model" (
  if "%~2"=="" (
    echo ERROR: --model requires a value, e.g. --model glm-5.3-flash:cloud
    pause
    exit /b 1
  )
  set "MODEL=%~2"
  shift
  shift
  goto parse_args
)
if /I "%~1"=="-m" (
  if "%~2"=="" (
    echo ERROR: -m requires a value, e.g. -m glm-5.3-flash:cloud
    pause
    exit /b 1
  )
  set "MODEL=%~2"
  shift
  shift
  goto parse_args
)

echo.
echo ============================================================
echo  OpenClaude — MAX CLOUD DEFAULT
echo  160k + think max + official sampling + GPU + Ollama-only
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

echo Waiting for Ollama...
echo (Stopping any duplicate Ollama processes to keep port 11434 clean...)
powershell -NoProfile -Command "Get-Process ollama -ErrorAction SilentlyContinue | Stop-Process -Force" >nul 2>&1
timeout /t 2 /nobreak >nul

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
  echo ERROR: Ollama is not running.
  echo Start the Ollama app from the Start menu, wait 10 seconds, then run this again.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $h=@{Authorization='Bearer ollama'}; Invoke-RestMethod 'http://127.0.0.1:11434/v1/models' -Headers $h -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo ERROR: Ollama API not ready for OpenClaude.
  echo Quit Ollama from the tray, start it once, wait 10s, try again.
  echo.
  pause
  exit /b 1
)

echo Applying local MAX settings...
"C:\Program Files\nodejs\node.exe" "%ROOT%\setup\apply-local-model-settings.mjs"
if errorlevel 1 (
  echo ERROR: Could not write local MAX settings.
  pause
  exit /b 1
)

:: If no --model was supplied, adopt the model last picked via /model.
if "%MODEL%"=="" (
  for /f "usebackq delims=" %%m in (`powershell -NoProfile -Command "(Get-Content '%USERPROFILE%\.openclaude\settings.json' | ConvertFrom-Json).model" 2^>nul`) do set "MODEL=%%m"
  if "%MODEL%"=="" set "MODEL=qwen3.6:27b"
)

echo Current model: %MODEL%
echo.

echo Ensuring model is available in Ollama...
ollama show "%MODEL%" >nul 2>&1
if errorlevel 1 (
  :: Local custom tags are baked from SOURCE; Ollama's cloud models just need a pull.
  echo %MODEL% | findstr /I ":cloud" >nul && (
    echo Pulling cloud model %MODEL% ^(first time can take a minute^)...
    ollama pull "%MODEL%"
    if errorlevel 1 (
      echo ERROR: Could not pull %MODEL%
      echo Fix: check Ollama cloud sign-in, then: ollama pull %MODEL%
      echo.
      pause
      exit /b 1
    )
  ) || (
    echo First-time bake of %MODEL% from %SOURCE% ^(pull can take several minutes^)...
    "C:\Program Files\nodejs\node.exe" "%ROOT%\setup\create-coding-model.mjs"
    if errorlevel 1 (
      echo ERROR: Could not create %MODEL% from %SOURCE%
      echo Fix: ollama pull %SOURCE%
      echo      then: node setup\create-coding-model.mjs
      echo If pull says a newer Ollama is required, upgrade Ollama then retry.
      echo.
      pause
      exit /b 1
    )
  )
)

echo Proving chat link to Ollama...
"C:\Program Files\nodejs\node.exe" "%ROOT%\setup\prove-ollama-chat.mjs" "%MODEL%"
if errorlevel 1 (
  echo ERROR: Ollama chat failed — OpenClaude would Hyperspace with no reply.
  echo Fix: close OpenClaude, run: node setup\verify-local-stack.mjs
  echo Or reconnect: node setup\max-local-connected.mjs
  echo.
  pause
  exit /b 1
)

echo [OK] Folder, Node, Ollama, chat
echo Model: %MODEL%
echo.

:: ----------------------------------------------------------------
:: OLLAMA / GPU / LOCAL AI — UNLOCKED FOR RTX 5090
:: ----------------------------------------------------------------
set "OLLAMA_HOST=127.0.0.1:11434"
set "OLLAMA_KEEP_ALIVE=120m"
set "OLLAMA_FLASH_ATTENTION=1"
set "OLLAMA_MAX_VRAM=32768"
set "OLLAMA_NUM_THREAD=24"
set "OLLAMA_NUM_GPU=1"
set "OLLAMA_MAX_LOADED_MODELS=1"
set "OLLAMA_NUM_PARALLEL=1"
set "OLLAMA_CONTEXT_LENGTH=163840"

:: Override with per-model context from settings map if known
:: (cloud models: true windows from ollama.com live probe 2026-09-21; fallback raised 32768 -> 153600
::  so unknown models no longer get a 33K ceiling - matches CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW)
:: NB: ConvertFrom-Json yields a PSCustomObject - $w['key'] indexer returns null, dot syntax works.
for /f "usebackq delims=" %%c in (`powershell -NoProfile -Command "try { $w=(Get-Content '%USERPROFILE%\.openclaude\settings.json' -Raw | ConvertFrom-Json).env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS ` | ConvertFrom-Json; $v=$w.'%MODEL%'; if ($v) { $v } else { 153600 } } catch { 153600 }" 2^>nul`) do set "OLLAMA_CONTEXT_LENGTH=%%c"

:: ----------------------------------------------------------------
:: OPENCLAUDE — OPENAI-COMPATIBLE ROUTE TO OLLAMA
:: ----------------------------------------------------------------
set "CLAUDE_CODE_NO_FLICKER=0"
set "CLAUDE_CODE_DISABLE_MOUSE=1"
set "CLAUDE_CODE_DISABLE_MOUSE_CLICKS=1"
set "CLAUDE_CODE_FORCE_FULL_LOGO=1"
set "CLAUDE_CODE_USE_OPENAI=1"
set "OPENAI_BASE_URL=http://127.0.0.1:11434/v1"
set "OPENAI_API_KEY=ollama"
set "OPENAI_MODEL=%MODEL%"
set "CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW=153600"
set "CLAUDE_CODE_AUTO_COMPACT_WINDOW=143360"
set "CLAUDE_CODE_MAX_OUTPUT_TOKENS=65536"
set "CLAUDE_CODE_EFFORT_LEVEL=max"

:: ----------------------------------------------------------------
:: TIMEOUTS / RETRIES / AGENT ARMY — UNLOCKED
:: ----------------------------------------------------------------
set "API_TIMEOUT_MS=1200000"
set "CLAUDE_STREAM_IDLE_TIMEOUT_MS=600000"
set "OPENCLAUDE_QUERY_IDLE_TIMEOUT_MS=1200000"
set "OPENCLAUDE_QUERY_HARD_MAX_MS=14400000"
set "OPENCLAUDE_AGENT_TIMEOUT_MS=600000"
set "OPENCLAUDE_AGENT_MAX_TURNS=32"
set "OPENCLAUDE_LOCAL_AGENT_WATCHDOG=1"
set "OPENCLAUDE_MAX_RETRIES=20"
set "OPENCLAUDE_AUTOCOMPACT_FAILURE_COOLDOWN_MS=10000"
set "CLAUDE_ENABLE_STREAM_WATCHDOG=1"

:: ----------------------------------------------------------------
:: TOOLING / SEARCH / PERFORMANCE
:: ----------------------------------------------------------------
set "USE_BUILTIN_RIPGREP=0"
set "OPENCLAUDE_PERFORMANCE_MODE=max5090"
set "CLAUDE_CODE_USE_POWERSHELL_TOOL=1"
set "OPENCLAUDE_DISABLE_TOOL_REMINDERS=1"
set "OPENCLAUDE_TTS="
set "OPENCLAUDE_INSTALL_ROOT=%ROOT%"
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%LOCALAPPDATA%\Programs\cursor\resources\app\node_modules\@vscode\ripgrep\bin;%PATH%"

if exist "C:\Program Files\Git\bin\bash.exe" set "CLAUDE_CODE_GIT_BASH_PATH=C:\Program Files\Git\bin\bash.exe"

if exist "%ROOT%\setup\stable-preflight.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\setup\stable-preflight.ps1" -Model "%MODEL%" -NumCtx %OLLAMA_CONTEXT_LENGTH% -Warm
) else if exist "%ROOT%\warm-coder.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\warm-coder.ps1" -Quiet -Model "%MODEL%" -NumCtx %OLLAMA_CONTEXT_LENGTH%
)

echo.
echo Starting OpenClaude POWER MAX UNLOCKED ^(160k + think max + official sampling + agent army^)...
echo Model: %MODEL%
echo Perf: %OPENCLAUDE_PERFORMANCE_MODE%
echo After tools it continues automatically. If context fills: /clear then continue.
echo Press Esc to cancel a stuck reply.
echo.

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

:: 32 GB system RAM budget for Node; Ollama owns the GPU.
"%NODE_EXE%" --max-old-space-size=32768 "%ROOT%\dist\cli.mjs" --bare --model %MODEL% --effort max --dangerously-skip-permissions --permission-mode bypassPermissions %PASSTHRU%
set "EXITCODE=%ERRORLEVEL%"

if "%EXITCODE%"=="0" (
  echo.
  echo OpenClaude closed normally.
  exit /b 0
)
echo.
echo OpenClaude exited with error %EXITCODE%.
echo Checks:
echo   1. Ollama tray app running
echo   2. Model installed: ollama list
echo   3. Build present: dist\cli.mjs
echo   4. Health: openclaude-health.bat
echo.
pause
exit /b %EXITCODE%
