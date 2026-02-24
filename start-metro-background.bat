@echo off
REM Check if Metro is already running on port 8081
netstat -ano | findstr :8081 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo Metro already running on port 8081
    exit /b 0
) else (
    echo Starting Metro in background...
    REM Start Metro in a new detached window that stays open
    start "Metro Bundler" cmd /k npm start
    REM Wait 3 seconds for Metro to initialize
    timeout /t 3 /nobreak >nul
    echo Metro started successfully
    exit /b 0
)
