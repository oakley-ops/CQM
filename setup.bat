@echo off
echo ========================================
echo   CQM Tracking System
echo   Initial Setup
echo ========================================
echo.

echo Step 1: Installing root dependencies...
call npm install
echo.

echo Step 2: Installing backend dependencies...
cd backend
call npm install
cd ..
echo.

echo Step 3: Installing frontend dependencies...
cd frontend
call npm install
cd ..
echo.

echo Step 4: Running database migrations...
cd backend
call npm run migrate
cd ..
echo.

echo Step 5: Creating admin user...
cd backend
call node create-admin.js
cd ..
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Login credentials:
echo   Email: admin@cqm.com
echo   Password: admin123
echo.
echo To start the application:
echo   Run: start-dev.bat
echo.
echo Or visit: http://localhost:3000
echo ========================================
pause

