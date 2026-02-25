@echo off
setlocal

if "%WRAPPER_WS_PORT%"=="" set WRAPPER_WS_PORT=9001
if "%WRAPPER_TARGET_URL%"=="" set WRAPPER_TARGET_URL=http://localhost:8000/mcp

cd /d "%~dp0\.."

if not exist node_modules (
  call npm ci --no-fund --no-audit
)

start /B cmd /c "node wrapper.js > wrapper.log 2>&1"

timeout /t 2 >nul
powershell -Command "try { iwr -UseBasicParsing http://localhost:%WRAPPER_WS_PORT%/__health | Out-Null } catch {}"
