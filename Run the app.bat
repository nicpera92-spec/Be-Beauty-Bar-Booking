@echo off
cd /d "%~dp0"
title Be Beauty Bar

echo.
echo  ========================================
echo   Be Beauty Bar - Starting up
echo  ========================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  Node.js is not installed!
    echo.
    echo  Step 1: Go to https://nodejs.org
    echo  Step 2: Download the LTS version ^(green button^)
    echo  Step 3: Run the installer - just click Next through it
    echo  Step 4: Restart your computer, then double-click this file again
    echo.
    pause
    exit /b 1
)

echo  [1/4] Installing dependencies... ^(first time may take 1-2 minutes^)
call npm install --ignore-scripts
if %ERRORLEVEL% neq 0 (
    echo.
    echo  Something went wrong. Try closing Cursor, pausing OneDrive, then run again.
    echo  If the project is in OneDrive, move it to e.g. C:\dev\beauty-booking.
    echo.
    pause
    exit /b 1
)

echo.
echo  [2/4] Setting up the database...
REM Skip prisma generate if client already exists - avoids EPERM when file/folder is locked (e.g. synced folder)
if exist "node_modules\.prisma\client\query_engine-windows.dll.node" (
    echo  Prisma client already present - skipping generate.
    goto :prisma_done
)
call npx prisma generate
if %ERRORLEVEL% neq 0 (
    echo  First attempt failed - retrying after clearing Prisma cache...
    if exist "node_modules\.prisma" rd /s /q "node_modules\.prisma" 2>nul
    call npx prisma generate
)
if %ERRORLEVEL% neq 0 (
    if exist "node_modules\.prisma\client\query_engine-windows.dll.node" (
        echo  Generate failed but existing Prisma client found - continuing.
        goto :prisma_done
    )
    echo.
    echo  Prisma failed - file may be locked. Your project path contains OneDrive.
    echo  To fix permanently: copy the whole "Cursor test" folder to a local folder
    echo  that is NOT synced, e.g.  C:\dev\Cursor test   then run "Run the app.bat" from there.
    echo.
    echo  Or try: Pause OneDrive sync for this folder, reboot, then run again.
    echo.
    pause
    exit /b 1
)
:prisma_done
if not exist "prisma\dev.db" (
    echo  First run: creating database and default data...
    call npx prisma db push
    call npx prisma db seed 2>nul
) else (
    call npx prisma db push
    REM Seed only runs on first setup - your service edits are preserved on restart
)

echo.
echo  [3/4] Almost ready...
echo.

echo  [4/4] Starting the app!
echo.
REM Free port 3001 if already in use (e.g. from a previous run)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001"') do taskkill /F /PID %%a 2>nul
ping -n 2 127.0.0.1 >nul
echo.
echo  *** OPEN YOUR BROWSER AND GO TO: ***
echo.
echo       http://localhost:3001
echo.
echo  *** Also try:  http://127.0.0.1:3001  ***
echo.
echo  *** Admin: go to /admin, log in with ***
echo      Email: Svit.uk@hotmail.com
echo      Password: 123456789
echo      ^(Change password after logging in^)
echo.
echo  *** KEEP THIS WINDOW OPEN ***
echo  If you close it, localhost will stop and you'll get
echo  "This site can't be reached" / "refused to connect".
echo.
echo  Wait until you see "Ready" or "compiled", THEN open the link.
echo  To stop the app: close this window or press Ctrl+C
echo  ========================================
echo.

REM Use npm run dev which is already configured for port 3001
call npm run dev
if %ERRORLEVEL% neq 0 (
    echo.
    echo  Server failed to start.
    echo  If you see "address already in use", close any other terminal
    echo  windows running the app, then try again.
    echo.
)
pause
