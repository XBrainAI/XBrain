@echo off
chcp 65001 >nul 2>&1
echo ============================================================
echo   Guangzhou High School Query System - Dev Server
echo ============================================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Starting dev server...
echo [INFO] Press Ctrl+C to stop the server.
echo.
npx vite --host
