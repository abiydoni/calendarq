@echo off
title CalendarQ License Server
echo ======================================================
echo    Starting CalendarQ License Server...
echo ======================================================
echo.

set ELECTRON_RUN_AS_NODE=1

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    node server/server.js
) else (
    "%~dp0node_modules\electron\dist\electron.exe" "%~dp0server\server.js"
)

pause
