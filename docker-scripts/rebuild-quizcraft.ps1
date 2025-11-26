# 🔨 Rebuild QuizCraft Script
# This script rebuilds your QuizCraft application with latest changes

Write-Host "🔨 Rebuilding QuizCraft..." -ForegroundColor Magenta
Write-Host "==========================" -ForegroundColor Magenta

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

# Stop the application
Write-Host "🛑 Stopping QuizCraft services..." -ForegroundColor Yellow
docker-compose down

# Rebuild and start the application
Write-Host "🔨 Rebuilding QuizCraft with latest changes..." -ForegroundColor Yellow
Write-Host "⏳ This may take a few minutes..." -ForegroundColor Yellow
docker-compose up --build -d

# Wait a moment for services to start
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check if services are running
Write-Host "🔍 Checking service status..." -ForegroundColor Yellow
docker-compose ps

# Show access URLs
Write-Host ""
Write-Host "🎉 QuizCraft has been rebuilt and started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "📱 Frontend (Web App): http://localhost:19006" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "🗄️  Database: localhost:27017" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Yellow
Write-Host "   View logs: docker-compose logs -f" -ForegroundColor White
Write-Host "   Stop app: docker-compose down" -ForegroundColor White
Write-Host "   Restart: docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "✨ QuizCraft rebuilt successfully with your latest changes!" -ForegroundColor Green
