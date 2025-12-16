@echo off
echo ========================================
echo   PMBOK Project Management System
echo   Starting Development Servers
echo ========================================
echo.

echo Starting Backend Server (Port 5000)...
start "PMBOK Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server (Port 3000)...
start "PMBOK Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:5000/api-docs
echo ========================================
echo.
echo Press any key to exit this window...
pause > nul

