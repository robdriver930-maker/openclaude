@echo off
setlocal EnableExtensions EnableDelayedExpansion
rem ============================================================
rem  OpenClaude ELITE Launcher - Bobby's Tech Services
rem  Usage: elite-launch.bat [model-name]
rem  Default model: qwen3.8-oc-code:27b
rem  --bare flag: skip auto-discovery, skills on demand only
rem ============================================================

title OpenClaude ELITE
set "ROOT=%~dp0"
cd /d "%ROOT%" || (
  echo ERROR: Cannot open folder: %ROOT%
  pause
  exit /b 1
)

rem Portable prerequisites belong to this restored copy only.
set "PATH=%ROOT%tools\runtime\node-v22.23.3-win-x64;%ROOT%tools\runtime\bun-windows-x64;%ROOT%tools\runtime\PortableGit\cmd;%LOCALAPPDATA%\Programs\Ollama;%PATH%"
set "CLAUDE_CODE_GIT_BASH_PATH=%ROOT%tools\runtime\PortableGit\bin\bash.exe"
set "CLAUDE_CODE_USE_POWERSHELL_TOOL=1"
set "USE_BUILTIN_RIPGREP=1"
rem --- Parse args ---
set "MODEL=%~1"
set "BARE="

if /I "%~1"=="--bare" (
  set "BARE=--bare"
  set "MODEL=%~2"
  shift
  shift
)

if /I "%~1"=="--help" (
  echo.
  echo OpenClaude ELITE Launcher
  echo.
  echo Usage: elite-launch.bat [model-name] [--bare]
  echo.
  echo Examples:
  echo   elite-launch.bat qwen3.6:27b
  echo   elite-launch.bat uncensored:latest --bare
  echo   elite-launch.bat --help
  echo.
  echo Available models ^(ollama list^):
  ollama list 2>nul || echo   ^(Ollama not running^)
  exit /b 0
)

if /I "%~2"=="--bare" set "BARE=--bare"
if "%MODEL%"=="" set "MODEL=qwen3.8-oc-code:27b"

rem --- Ollama health check ---
ollama list > nul 2>&1
if errorlevel 1 (
  echo ERROR: Ollama is not running. Start it first.
  pause
  exit /b 1
)

ollama show "%MODEL%" >nul 2>&1
if errorlevel 1 (
  echo ERROR: Model %MODEL% is not available in Ollama.
  exit /b 1
)
set "ALREADY_LOADED="
rem --- Warm the model if not already loaded ---
for /f "tokens=*" %%a in ('curl -s http://127.0.0.1:11434/api/ps ^| findstr "%MODEL%"') do (
  set "ALREADY_LOADED=1"
)
if not defined ALREADY_LOADED (
  echo Warming model %MODEL%...
  curl --fail --connect-timeout 5 --max-time 180 -s -X POST http://127.0.0.1:11434/api/generate -H "Content-Type: application/json" -d "{\"model\":\"%MODEL%\",\"keep_alive\":\"24h\",\"prompt\":\"\"}" > nul 2>&1
  if errorlevel 1 (
    echo ERROR: Model warmup failed. Check Ollama before retrying.
    exit /b 1
  )
  echo READY.
) else (
  echo Model %MODEL% already loaded.
)

rem --- Read context window from settings ---
set "CTX_SIZE=153600"
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "try{ $s=Get-Content '%USERPROFILE%\.openclaude\settings.json' -Raw | ConvertFrom-Json; $m=$s.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS | ConvertFrom-Json; Write-Host $m.'%MODEL%' }catch{}"') do (
  if not "%%a"=="" set "CTX_SIZE=%%a"
)

rem --- Calculate derived values ---
for /f %%a in ('powershell -NoProfile -Command "[math]::Floor(%CTX_SIZE% * 0.80)"') do set "AUTO_COMPACT=%%a"
for /f %%a in ('powershell -NoProfile -Command "[math]::Min(16384, [math]::Floor(%CTX_SIZE% * 0.10))"') do set "MAX_OUTPUT=%%a"

rem --- Show banner ---
echo.
echo ============================================================
echo  OpenClaude ELITE - Bobby's Tech Services
echo ============================================================
echo  Model:      %MODEL%
echo  Context:    %CTX_SIZE% tokens
echo  Compact:    %AUTO_COMPACT%
echo  Max output: %MAX_OUTPUT% tokens
if defined BARE echo  Mode:       BARE ^(skills on-demand, no auto-scan^)
echo ============================================================
echo.

rem --- Build environment ---
set "OPENAI_API_KEY=x"
set "OPENAI_BASE_URL=http://127.0.0.1:11434/v1"
set "CLAUDE_CODE_USE_OPENAI=1"
set "OPENAI_MODEL=%MODEL%"
rem Context map now lives in settings.json (valid JSON, per-model true windows).
rem The old "%MODEL%=%CTX_SIZE%" format failed JSON.parse and WIPED the whole map.
rem Do NOT set CLAUDE_CODE_AUTO_COMPACT_WINDOW here: in cli.mjs it CLAMPS the
rem context window (Math.min), so 0.8x shrank every model to 80 percent.
set "CLAUDE_CODE_MAX_OUTPUT_TOKENS=%MAX_OUTPUT%"
set "CLAUDE_CODE_OLLAMA_ONLY=1"
rem Medium effort avoids forcing maximum thinking on every small request.
if not defined OPENCLAUDE_ELITE_EFFORT set "OPENCLAUDE_ELITE_EFFORT=medium"
if defined BARE set "CLAUDE_CODE_SIMPLE=1"

rem --- Launch ---
set "NODE_EXE=%ROOT%tools\runtime\node-v22.23.3-win-x64\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

"%NODE_EXE%" --max-old-space-size=32768 "%ROOT%\dist\cli.mjs" --model %MODEL% --effort %OPENCLAUDE_ELITE_EFFORT% --dangerously-skip-permissions --permission-mode bypassPermissions %BARE%

set "EXITCODE=%ERRORLEVEL%"
if "%EXITCODE%"=="0" (
  echo.
  echo OpenClaude closed normally.
) else (
  echo.
  echo OpenClaude exited with error %EXITCODE%.
)
pause
exit /b %EXITCODE%
