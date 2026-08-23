@echo off
setlocal EnableExtensions
rem ============================================================
rem  OPENCLAUDE — Kimi K2.7 Code via Ollama Cloud (included on Pro)
rem  Use this when kimi-k3:cloud needs Extra usage $ you do not have yet.
rem ============================================================
title OpenClaude - Kimi K2.7 Cloud
set "ROOT=C:\Users\GoldenBoy\Desktop\openclaude\openclaude-main"
cd /d "%ROOT%" || (
  echo ERROR: Cannot open folder:
  echo   %ROOT%
  pause
  exit /b 1
)

set "MODEL=kimi-k2.7-code:cloud"
set "PASSTHRU=%*"

echo.
echo ============================================================
echo  OpenClaude — Kimi K2.7 Code ^(Ollama Cloud / Pro included^)
echo  Model: %MODEL%
echo  For Kimi K3 ^(Extra usage $^): use run-kimi-k3.bat after topping up
echo ============================================================
echo.

if not exist "%ROOT%\dist\cli.mjs" (
  echo ERROR: Build missing: dist\cli.mjs
  pause
  exit /b 1
)

echo Waiting for Ollama...
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
  pause
  exit /b 1
)

ollama pull %MODEL% >nul 2>&1

"C:\Program Files\nodejs\node.exe" -e "const fs=require('fs');const p=require('path').join(process.env.USERPROFILE,'.openclaude','settings.json');const s=JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));s.effortLevel='max';s.alwaysThinkingEnabled=true;s.enabledPlugins={};delete s.statusLine;s.model='kimi-k2.7-code:cloud';s.env=s.env||{};s.env.CLAUDE_CODE_USE_OPENAI='1';s.env.OPENAI_BASE_URL='http://127.0.0.1:11434/v1';s.env.OPENAI_API_KEY='ollama';s.env.OPENAI_MODEL='kimi-k2.7-code:cloud';delete s.env.OPENCLAUDE_TTS;s.env.OLLAMA_CONTEXT_LENGTH='120000';s.env.CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW='120000';s.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW='100000';s.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS='16384';try{const m=JSON.parse(s.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS||'{}');m['kimi-k2.7-code:cloud']=120000;s.env.CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS=JSON.stringify(m);}catch(_){}fs.writeFileSync(p,JSON.stringify(s,null,4)+'\n');console.log('[OK] settings: model=kimi-k2.7-code:cloud');"
"C:\Program Files\nodejs\node.exe" "%~dp0setup\install-tts-hooks.mjs"

set "CLAUDE_CODE_USE_OPENAI=1"
set "OPENAI_BASE_URL=http://127.0.0.1:11434/v1"
set "OPENAI_API_KEY=ollama"
set "OPENAI_MODEL=%MODEL%"
set "OLLAMA_HOST=127.0.0.1:11434"
set "OLLAMA_CONTEXT_LENGTH=120000"
set "CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW=120000"
set "CLAUDE_CODE_AUTO_COMPACT_WINDOW=100000"
set "CLAUDE_CODE_MAX_OUTPUT_TOKENS=16384"
set "API_TIMEOUT_MS=2400000"
set "CLAUDE_STREAM_IDLE_TIMEOUT_MS=900000"
set "OPENCLAUDE_MAX_RETRIES=20"
set "USE_BUILTIN_RIPGREP=0"
set "OPENCLAUDE_DISABLE_TOOL_REMINDERS=1"
set "OPENCLAUDE_INSTALL_ROOT=%ROOT%"
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%LOCALAPPDATA%\Programs\cursor\resources\app\node_modules\@vscode\ripgrep\bin;%PATH%"

echo Starting OpenClaude with %MODEL%...
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
"%NODE_EXE%" --max-old-space-size=8192 "%ROOT%\dist\cli.mjs" --model %MODEL% --dangerously-skip-permissions --permission-mode bypassPermissions %PASSTHRU%
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" pause
exit /b %EXITCODE%
