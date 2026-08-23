@echo off
setlocal EnableExtensions
rem ============================================================
rem  OPENCLAUDE MAIN — Opus 4.8 (Anthropic API provider)
rem  Local Qwen launcher is still: run.bat
rem ============================================================
title OpenClaude - Opus 4.8
set "ROOT=C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main"
cd /d "%ROOT%" || (
  echo ERROR: Cannot open folder:
  echo   %ROOT%
  pause
  exit /b 1
)

set "MODEL=claude-opus-4-8"
set "PASSTHRU=%*"

echo.
echo ============================================================
echo  OpenClaude MAIN — Opus 4.8
echo  Provider: anthropic
echo  Model: %MODEL%
echo  Effort max + thinking on + 64k output
echo ============================================================
echo.

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

rem Kill Ollama/OpenAI routing for this window only — do not wipe settings.env Ollama block
set "CLAUDE_CODE_USE_OPENAI="
set "OPENAI_BASE_URL="
set "OPENAI_API_KEY="
set "OPENAI_MODEL="
set "OPENAI_API_BASE="
set "ANTHROPIC_MODEL=%MODEL%"
set "CLAUDE_CODE_EFFORT_LEVEL=max"

rem Pull User-level ANTHROPIC_API_KEY into this window if not already set
if not defined ANTHROPIC_API_KEY (
  for /f "usebackq delims=" %%K in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('ANTHROPIC_API_KEY','User')"`) do set "ANTHROPIC_API_KEY=%%K"
)
if not defined ANTHROPIC_API_KEY (
  echo ERROR: ANTHROPIC_API_KEY is not set.
  echo Set it in Windows User environment variables, then reopen this launcher.
  echo Or inside OpenClaude run: /login
  echo.
  pause
  exit /b 1
)
echo [OK] Anthropic API key found for this session.

set "CLAUDE_CODE_NO_FLICKER=0"
set "CLAUDE_CODE_DISABLE_MOUSE=1"
set "CLAUDE_CODE_DISABLE_MOUSE_CLICKS=1"
set "CLAUDE_CODE_FORCE_FULL_LOGO=1"
set "CLAUDE_CODE_MAX_OUTPUT_TOKENS=64000"
set "API_TIMEOUT_MS=900000"
set "CLAUDE_STREAM_IDLE_TIMEOUT_MS=180000"
set "OPENCLAUDE_MAX_RETRIES=10"
set "USE_BUILTIN_RIPGREP=0"
set "OPENCLAUDE_DISABLE_TOOL_REMINDERS=1"
set "OPENCLAUDE_INSTALL_ROOT=%ROOT%"
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%LOCALAPPDATA%\Programs\cursor\resources\app\node_modules\@vscode\ripgrep\bin;%PATH%"

if exist "C:\Program Files\Git\bin\bash.exe" set "CLAUDE_CODE_GIT_BASH_PATH=C:\Program Files\Git\bin\bash.exe"

rem Set model + Opus quality knobs only — keep local Ollama env keys intact for run.bat
"C:\Program Files\nodejs\node.exe" -e "const fs=require('fs');const p=require('path').join(process.env.USERPROFILE,'.openclaude','settings.json');const s=JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));s.model='claude-opus-4-8';s.effortLevel='max';s.alwaysThinkingEnabled=true;s.enabledPlugins={};delete s.statusLine;s.env=s.env||{};s.env.ANTHROPIC_MODEL='claude-opus-4-8';delete s.env.OPENCLAUDE_TTS;fs.writeFileSync(p,JSON.stringify(s,null,4)+'\n');console.log('[OK] settings: model=claude-opus-4-8 effort=max thinking=on');"
"C:\Program Files\nodejs\node.exe" "%~dp0setup\install-tts-hooks.mjs"

echo.
echo Starting OpenClaude with Opus 4.8...
echo Local Qwen is still available via run.bat
echo.

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

"%NODE_EXE%" --max-old-space-size=8192 "%ROOT%\dist\cli.mjs" --provider anthropic --model %MODEL% --dangerously-skip-permissions --permission-mode bypassPermissions %PASSTHRU%
set "EXITCODE=%ERRORLEVEL%"

if "%EXITCODE%"=="0" (
  echo.
  echo OpenClaude closed normally.
  exit /b 0
)

echo.
echo OpenClaude exited with error %EXITCODE%.
echo Checks:
echo   1. Anthropic login: open OpenClaude and run /login
echo   2. Or set User env var ANTHROPIC_API_KEY
echo   3. Build present: dist\cli.mjs
echo   4. API credits: platform.claude.com/settings/billing
echo.
pause
exit /b %EXITCODE%
