@echo off
rem ============================================================
rem  OpenClaude Quick Model Swaps
rem  Usage: swap-<name>.bat
rem ============================================================

@echo off
setlocal
set "MODEL=%~1"
if "%MODEL%"=="" (
  echo ERROR: No model specified
  echo Usage: swap.bat <model-name>
  echo.
  echo Quick aliases:
  echo   swap-qwen38      - qwen3.8-oc-code:27b ^(coding beast^)
  echo   swap-qwen36      - qwen3.6:27b ^(general purpose^)
  echo   swap-deepseek    - deepseek-coder-v2:16b ^(code specialist^)
  echo   swap-uncensored  - uncensored:latest ^(no restrictions^)
  echo   swap-glm         - glm-4.7-flash:latest ^(fast inference^)
  echo   swap-llama       - llama3.3:70b ^(large general^)
  echo   swap-mistral     - mistral-nemo:latest ^(efficient^)
  echo.
  echo Or use: node model-swap.mjs <model-name>
  exit /b 1
)

node "%~dp0model-swap.mjs" "%MODEL%"
