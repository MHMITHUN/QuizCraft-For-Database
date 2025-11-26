# 🔍 Check QuizCraft Status Script
# This script checks the status of your QuizCraft application

Write-Host "🔍 QuizCraft Status Check" -ForegroundColor Cyan
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

# Check service status
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow
docker-compose ps

# Check if services are healthy
Write-Host ""
Write-Host "🏥 Health Checks:" -ForegroundColor Yellow
Write-Host "=================" -ForegroundColor Yellow

# Check backend health
try {
    $backendHealth = docker inspect --format='{{.State.Health.Status}}' quizcraft-backend 2>$null
    if ($backendHealth -eq "healthy") {
        Write-Host "✅ Backend: Healthy" -ForegroundColor Green
    }
    elseif ($backendHealth -eq "unhealthy") {
        Write-Host "❌ Backend: Unhealthy" -ForegroundColor Red
    }
    else {
        Write-Host "⏳ Backend: Starting..." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❓ Backend: Status unknown" -ForegroundColor Gray
}

# Check frontend health
try {
    $frontendHealth = docker inspect --format='{{.State.Health.Status}}' quizcraft-frontend 2>$null
    if ($frontendHealth -eq "healthy") {
        Write-Host "✅ Frontend: Healthy" -ForegroundColor Green
    }
    elseif ($frontendHealth -eq "unhealthy") {
        Write-Host "❌ Frontend: Unhealthy" -ForegroundColor Red
    }
    else {
        Write-Host "⏳ Frontend: Starting..." -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❓ Frontend: Status unknown" -ForegroundColor Gray
}

# Check MongoDB
try {
    $mongoStatus = docker inspect --format='{{.State.Status}}' quizcraft-mongodb 2>$null
    if ($mongoStatus -eq "running") {
        Write-Host "✅ Database: Running" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Database: Not running" -ForegroundColor Red
    }
}
catch {
    Write-Host "❓ Database: Status unknown" -ForegroundColor Gray
}

# Test API endpoint
Write-Host ""
Write-Host "🌐 API Test:" -ForegroundColor Yellow
Write-Host "============" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API: Responding (Status: $($response.StatusCode))" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  API: Responding but status is $($response.StatusCode)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ API: Not responding" -ForegroundColor Red
}

# Test Frontend
Write-Host ""
Write-Host "🌐 Frontend Test:" -ForegroundColor Yellow
Write-Host "=================" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:19006" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend: Responding (Status: $($response.StatusCode))" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Frontend: Responding but status is $($response.StatusCode)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Frontend: Not responding" -ForegroundColor Red
}

# Show access URLs
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow
Write-Host "📱 Frontend (Web App): http://localhost:19006" -ForegroundColor Cyan
Write-Host "🔧 Backend API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "🗄️  Database: localhost:27017" -ForegroundColor Cyan

# Show useful commands
Write-Host ""
Write-Host "📋 Useful Commands:" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow
Write-Host "Start: .\start-quizcraft.ps1" -ForegroundColor White
Write-Host "Stop: .\stop-quizcraft.ps1" -ForegroundColor White
Write-Host "Restart: .\restart-quizcraft.ps1" -ForegroundColor White
Write-Host "Rebuild: .\rebuild-quizcraft.ps1" -ForegroundColor White
Write-Host "Logs: .\view-logs.ps1" -ForegroundColor White
Write-Host ""
Write-Host "✨ Status check complete!" -ForegroundColor Green
