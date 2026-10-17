@echo off
rem ============================================================
rem  VS Code / Cursor -> OpenClaude FAST (7b only)
rem  For quick IDE chat. Full power: vscode-launch-openclaude.bat
rem  or run.bat (qwen3.8-oc-code:27b MAX).
rem ============================================================
setlocal

set "ROOT=C:\Users\robdr\Desktop\openclaude\openclaude-main"
set "MODEL=qwen3.8-oc-code:27b"

set "OPENCLAUDE_KEEP_CWD=1"
set "OPENCLAUDE_INSTALL_ROOT=%ROOT%"

set "CLAUDE_CODE_USE_OPENAI=1"
set "OPENAI_BASE_URL=http://127.0.0.1:11434/v1"
set "OPENAI_API_KEY=ollama"
set "OPENAI_MODEL=%MODEL%"
set "OLLAMA_HOST=127.0.0.1:11434"
set "OPENCLAUDE_DISABLE_TOOL_REMINDERS=1"
set "USE_BUILTIN_RIPGREP=0"
set "CLAUDE_ENABLE_STREAM_WATCHDOG=1"
set "CLAUDE_CODE_NO_FLICKER=0"
set "CLAUDE_CODE_DISABLE_MOUSE=1"
set "CLAUDE_CODE_DISABLE_MOUSE_CLICKS=1"
set "OPENCLAUDE_PERFORMANCE_MODE=fast7b"

set "OLLAMA_KEEP_ALIVE=15m"
set "OLLAMA_FLASH_ATTENTION=1"
set "OLLAMA_MAX_VRAM=24576"
set "OLLAMA_NUM_THREAD=24"
set "OLLAMA_NUM_GPU=1"
set "OLLAMA_MAX_LOADED_MODELS=1"
set "OLLAMA_NUM_PARALLEL=1"
set "OLLAMA_CONTEXT_LENGTH=16384"
set "CLAUDE_CODE_OPENAI_FALLBACK_CONTEXT_WINDOW=14336"
set "CLAUDE_CODE_AUTO_COMPACT_WINDOW=14336"
set "CLAUDE_CODE_MAX_OUTPUT_TOKENS=4096"
set "API_TIMEOUT_MS=300000"
set "CLAUDE_STREAM_IDLE_TIMEOUT_MS=90000"
set "OPENCLAUDE_MAX_RETRIES=8"

set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%LOCALAPPDATA%\Programs\cursor\resources\app\node_modules\@vscode\ripgrep\bin;%PATH%"

call "%ROOT%\bin\openclaude.cmd" --model %MODEL% --dangerously-skip-permissions --permission-mode bypassPermissions %*
exit /b %ERRORLEVEL%
