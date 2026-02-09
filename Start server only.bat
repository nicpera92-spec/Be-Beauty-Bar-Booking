@echo off
cd /d "%~dp0"
title Be Beauty Bar - Server

echo.
echo  ========================================
echo   Be Beauty Bar - Starting server only
echo  ========================================
echo.
echo  Use this if you already ran "Run the app.bat" at least once.
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  Node.js not found. Run "Run the app.bat" first.
    pause
    exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
    echo  Dependencies missing. Run "Run the app.bat" first.
    pause
    exit /b 1
)

echo  Starting server on http://localhost:3001
echo.
echo  *** KEEP THIS WINDOW OPEN ***
echo  If you close it, localhost will stop working!
echo.
echo  Wait for "Ready" or "compiled", then open:
echo    http://localhost:3001
echo.
echo  ========================================
echo.

node "%~dp0node_modules\next\dist\bin\next" dev -p 3001
if %ERRORLEVEL% neq 0 (
    echo.
    echo  Server failed. Try "Run the app.bat" instead.
    call npm run dev
)
pause
