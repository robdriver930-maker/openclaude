@echo off
setlocal EnableExtensions
rem Windows entry for OpenClaude - launches the built CLI directly.
rem Prefer this over the ESM bin\openclaude shim (unreliable when package.json is CommonJS).

if /i not "%OPENCLAUDE_KEEP_CWD%"=="1" (
  if defined OPENCLAUDE_INSTALL_ROOT (
    cd /d "%OPENCLAUDE_INSTALL_ROOT%"
  ) else (
    cd /d "C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main"
  )
)

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."
for %%I in ("%REPO_ROOT%") do set "REPO_ROOT=%%~fI"

if not defined OPENCLAUDE_INSTALL_ROOT set "OPENCLAUDE_INSTALL_ROOT=%REPO_ROOT%"
if not defined CLAUDE_CODE_USE_OPENAI set "CLAUDE_CODE_USE_OPENAI=1"
if not defined OPENAI_BASE_URL set "OPENAI_BASE_URL=http://127.0.0.1:11434/v1"
if not defined OPENAI_API_KEY set "OPENAI_API_KEY=ollama"
if not defined USE_BUILTIN_RIPGREP set "USE_BUILTIN_RIPGREP=0"
if not defined CLAUDE_CODE_NO_FLICKER set "CLAUDE_CODE_NO_FLICKER=0"
if not defined OPENCLAUDE_DISABLE_TOOL_REMINDERS set "OPENCLAUDE_DISABLE_TOOL_REMINDERS=1"

set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%LOCALAPPDATA%\Programs\cursor\resources\app\node_modules\@vscode\ripgrep\bin;%PATH%"

if exist "C:\Program Files\nodejs\node.exe" (
  set "NODE_EXE=C:\Program Files\nodejs\node.exe"
) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
  set "NODE_EXE=C:\Program Files (x86)\nodejs\node.exe"
) else (
  where node >nul 2>&1
  if errorlevel 1 (
    echo openclaude: Node.js not found. Install from https://nodejs.org/
    exit /b 1
  )
  set "NODE_EXE=node"
)

if exist "C:\Program Files\Git\bin\bash.exe" (
  set "CLAUDE_CODE_GIT_BASH_PATH=C:\Program Files\Git\bin\bash.exe"
) else if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
  set "CLAUDE_CODE_GIT_BASH_PATH=C:\Program Files (x86)\Git\bin\bash.exe"
)

if not exist "%REPO_ROOT%\dist\cli.mjs" (
  echo openclaude: missing dist\cli.mjs
  echo Build first: bun run build
  exit /b 1
)

where rg >nul 2>&1
if errorlevel 1 (
  echo WARNING: ripgrep ^(rg^) not found - Glob/Grep may fail.
  echo Run: winget install BurntSushi.ripgrep.MSVC
  echo.
)

rem Heap + GC flags applied here so we do not depend on the broken ESM relaunch shim
"%NODE_EXE%" --max-old-space-size=8192 --expose-gc "%REPO_ROOT%\dist\cli.mjs" %*
exit /b %ERRORLEVEL%
