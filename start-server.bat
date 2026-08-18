@echo off
REM ============================================
REM  Sayfit Studio - Local Preview Server
REM  Double-click this file to preview the site
REM ============================================
cd /d "%~dp0"
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
python -m http.server 8000
