@echo off

echo ========================================
echo   CQM Tracking System
echo   Starting Development Servers
echo ========================================
echo.

echo Starting Backend Server (Port 5000)...
start "CQM Backend" cmd /k "cd /d C:\Users\Quali\CQM\backend && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server (Port 3000)...
start "CQM Frontend" cmd /k "cd /d C:\Users\Quali\CQM\frontend && npm run dev"

timeout /t 5 /nobreak > nul

echo Opening browser...
start http://localhost:3000

echo.
echo ========================================
echo   Servers Running!
echo ========================================
echo   App:      http://localhost:3000
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:5000/api-docs
echo ========================================
echo.
echo Browser opened. Press any key to exit this window...
pause > nul
