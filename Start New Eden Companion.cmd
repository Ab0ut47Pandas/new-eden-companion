@echo off
setlocal
cd /d "%~dp0"

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo New Eden Companion needs Windows PowerShell, but it was not found.
  echo Open README.md for manual startup instructions.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-companion.ps1"
set "companion_exit=%ERRORLEVEL%"

if not "%companion_exit%"=="0" (
  echo.
  echo The companion could not start. The message above explains what to fix.
  pause
)

exit /b %companion_exit%
