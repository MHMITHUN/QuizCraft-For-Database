# 🚀 Start QuizCraft Script
# This script starts your QuizCraft application

Write-Host "🚀 Starting QuizCraft..." -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

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

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    if (Test-Path ".env.template") {
        Copy-Item ".env.template" ".env"
        Write-Host "📝 Created .env file from template" -ForegroundColor Green
        Write-Host "⚠️  Please edit .env file and add your GEMINI_API_KEY" -ForegroundColor Yellow
        Write-Host "   Get your API key from: https://makersuite.google.com/app/apikey" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Press any key after editing .env file..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    else {
        Write-Host "❌ .env.template file not found!" -ForegroundColor Red
        exit 1
    }
}

# Start the application
Write-Host "🏗️  Starting QuizCraft services..." -ForegroundColor Yellow
docker-compose up -d

# Wait a moment for services to start
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if services are running
Write-Host "🔍 Checking service status..." -ForegroundColor Yellow
docker-compose ps

# Show access URLs
Write-Host ""
Write-Host "🎉 QuizCraft is now running!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "📱 Frontend (Web App): http://localhost:19006" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "🗄️  Database: localhost:27017" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Yellow
Write-Host "   View logs: docker-compose logs -f" -ForegroundColor White
Write-Host "   Stop app: docker-compose down" -ForegroundColor White
Write-Host "   Restart: docker-compose restart" -ForegroundColor White
Write-Host ""
Write-Host "✨ Happy coding!" -ForegroundColor Green
