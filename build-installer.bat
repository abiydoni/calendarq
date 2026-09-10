@echo off
title CalendarQ - Build Installer
echo ======================================================
echo    CalendarQ Desktop App - Installer Packaging
echo ======================================================
echo.

set ELECTRON_RUN_AS_NODE=1
set ELECTRON_NO_ASAR=1
set PATH=%~dp0node_modules\electron\dist;%PATH%

echo [1/2] Building Vite Frontend (dist/)...
node "%~dp0node_modules\vite\bin\vite.js" build
if %errorlevel% neq 0 (
    echo [ERROR] Vite build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Packaging with electron-builder...
node "%~dp0scripts\build.cjs"
if %errorlevel% neq 0 (
    echo [ERROR] Packaging failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================
echo  Installer berhasil dibuat di folder: dist-electron/
echo ======================================================
pause
