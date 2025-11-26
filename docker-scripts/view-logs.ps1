# 📋 View QuizCraft Logs Script
# This script shows the logs for your QuizCraft application

Write-Host "📋 QuizCraft Logs Viewer" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

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

# Show menu
Write-Host ""
Write-Host "📋 Choose what logs to view:" -ForegroundColor Yellow
Write-Host "1. All services (recommended)" -ForegroundColor White
Write-Host "2. Backend only" -ForegroundColor White
Write-Host "3. Frontend only" -ForegroundColor White
Write-Host "4. Database only" -ForegroundColor White
Write-Host "5. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host "📋 Showing logs for all services..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop viewing logs" -ForegroundColor Yellow
        Write-Host ""
        docker-compose logs -f
    }
    "2" {
        Write-Host "📋 Showing backend logs..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop viewing logs" -ForegroundColor Yellow
        Write-Host ""
        docker-compose logs -f backend
    }
    "3" {
        Write-Host "📋 Showing frontend logs..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop viewing logs" -ForegroundColor Yellow
        Write-Host ""
        docker-compose logs -f frontend
    }
    "4" {
        Write-Host "📋 Showing database logs..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop viewing logs" -ForegroundColor Yellow
        Write-Host ""
        docker-compose logs -f mongodb
    }
    "5" {
        Write-Host "👋 Goodbye!" -ForegroundColor Green
        exit 0
    }
    default {
        Write-Host "❌ Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}
