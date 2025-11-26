# 🔄 Restart QuizCraft Script
# This script restarts your QuizCraft application

Write-Host "🔄 Restarting QuizCraft..." -ForegroundColor Blue
Write-Host "=========================" -ForegroundColor Blue

# Check if Docker is running
Write-Host "🔍 Checking Docker status..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Restart the application
Write-Host "🔄 Restarting QuizCraft services..." -ForegroundColor Yellow
docker-compose restart

# Wait a moment for services to restart
Write-Host "⏳ Waiting for services to restart..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if services are running
Write-Host "🔍 Checking service status..." -ForegroundColor Yellow
docker-compose ps

# Show access URLs
Write-Host ""
Write-Host "🎉 QuizCraft has been restarted!" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host "📱 Frontend (Web App): http://localhost:19006" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "🗄️  Database: localhost:27017" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ QuizCraft restarted successfully!" -ForegroundColor Green
