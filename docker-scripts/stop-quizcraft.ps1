# 🛑 Stop QuizCraft Script
# This script stops your QuizCraft application

Write-Host "🛑 Stopping QuizCraft..." -ForegroundColor Red
Write-Host "=======================" -ForegroundColor Red

# Check if Docker is running
Write-Host "🔍 Checking Docker status..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker is not running." -ForegroundColor Red
    exit 1
}

# Stop the application
Write-Host "🛑 Stopping QuizCraft services..." -ForegroundColor Yellow
docker-compose down

# Show status
Write-Host "🔍 Checking if services are stopped..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "✅ QuizCraft has been stopped!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 To start again: .\start-quizcraft.ps1" -ForegroundColor Yellow
Write-Host "📋 To remove all data: docker-compose down -v" -ForegroundColor Yellow
Write-Host ""
Write-Host "✨ QuizCraft stopped successfully!" -ForegroundColor Green
