# CQM Tracking System - Setup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CQM Tracking System" -ForegroundColor Green
Write-Host "  Initial Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is running
Write-Host "Checking PostgreSQL service..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -eq "Running") {
    Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL is not running. Please start it first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Installing root dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Failed to install root dependencies" -ForegroundColor Red; exit 1 }
Write-Host "✅ Root dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red; exit 1 }
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Set-Location ..

Write-Host ""
Write-Host "Step 3: Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red; exit 1 }
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Set-Location ..

Write-Host ""
Write-Host "Step 4: Running database migrations..." -ForegroundColor Yellow
Set-Location backend
npm run migrate
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Failed to run migrations" -ForegroundColor Red; exit 1 }
Write-Host "✅ Database migrations completed" -ForegroundColor Green
Set-Location ..

Write-Host ""
Write-Host "Step 5: Creating admin user..." -ForegroundColor Yellow
Set-Location backend
node create-admin.js
Write-Host "✅ Admin user created" -ForegroundColor Green
Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor White
Write-Host "  Email: admin@cqm.com" -ForegroundColor Yellow
Write-Host "  Password: admin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "To start the application:" -ForegroundColor White
Write-Host "  Run: .\start-dev.ps1" -ForegroundColor Yellow
Write-Host "  Or visit: http://localhost:3000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

