@echo off
setlocal

if "%WRAPPER_WS_PORT%"=="" set WRAPPER_WS_PORT=9001

cd /d "%~dp0\.."

powershell -Command "try { irm -Method Post http://localhost:%WRAPPER_WS_PORT%/__shutdown | Out-Null } catch {}"
