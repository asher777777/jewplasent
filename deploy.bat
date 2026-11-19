@echo off
cd /d C:\jewplasent
echo Starting Vite Build...
call npx vite build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed with error %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
echo Build succeeded! Starting Firebase Hosting Deploy...
call npx firebase-tools deploy --only hosting
echo Done!
