@echo off
REM ============================================
REM  Sayfit Studio - Local Preview Server
REM  Double-click this file to preview the site
REM ============================================
cd /d "%~dp0"

REM "python" alone does not resolve here: the Microsoft Store Python
REM Manager installs it as an App Execution Alias under WindowsApps, and
REM that folder is missing from this machine's PATH, so a double-clicked
REM .bat (which inherits the same PATH) silently found nothing. Call the
REM alias by its stable full path instead - it survives Python version
REM updates because WindowsApps\python.exe always points at whichever
REM version Python Manager has active.
set "PY=%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
if not exist "%PY%" set "PY=python"

echo.
echo   Starting Sayfit Studio local server...
echo   ----------------------------------------
echo   Open this address in your browser:
echo.
echo       http://localhost:8000
echo.
echo   Press Ctrl+C to stop the server.
echo   ----------------------------------------
echo.
start "" "http://localhost:8000"
"%PY%" -m http.server 8000
if errorlevel 1 (
  echo.
  echo   Could not start Python. Is it installed? Press any key to close.
  pause >nul
)
