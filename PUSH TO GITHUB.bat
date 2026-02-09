@echo off
cd /d "%~dp0"
title Push to GitHub

echo.
echo  ========================================
echo   Push Be Beauty Bar to GitHub
echo  ========================================
echo.

where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  Git is not installed!
    echo.
    echo  1. Go to: https://git-scm.com/download/win
    echo  2. Download and run the installer ^(use default options^)
    echo  3. Restart Cursor or open a NEW terminal
    echo  4. Double-click this file again
    echo.
    pause
    exit /b 1
)

if not exist .git (
    echo  Initializing Git...
    git init
    echo.
)

echo  Adding files ^(.env and node_modules are ignored^)...
git add .
echo.

echo  Checking what will be committed...
git status
echo.
echo  If you see .env or node_modules in the list above, STOP and tell someone.
echo  Otherwise press any key to commit and push...
pause >nul

git commit -m "Be Beauty Bar booking platform - ready for deploy"
if %ERRORLEVEL% neq 0 (
    echo.
    echo  Nothing to commit, or commit failed. Trying to push anyway...
)

git branch -M main 2>nul

echo.
echo  Connecting to GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/nicpera92-spec/Be-Beauty-Bar-Booking.git

echo.
echo  Pushing to GitHub...
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo  ========================================
    echo   SUCCESS! Your code is on GitHub.
    echo  ========================================
    echo.
    echo  Next: Go to Vercel.com, import this repo, add your
    echo  environment variables, then connect BBBar.co.uk.
    echo.
) else (
    echo.
    echo  Push failed. You may need to sign in to GitHub.
    echo  Try: run "git push -u origin main" in a terminal and
    echo  sign in when prompted, or use GitHub Desktop.
    echo.
)

pause
