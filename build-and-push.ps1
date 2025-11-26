# QuizCraft Docker Build and Push Script
# This script builds all Docker images and pushes them to Docker Hub

Write-Host "🚀 QuizCraft Docker Build and Push Script" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Check if Docker is running
Write-Host "🔍 Checking Docker status..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Check if user is logged into Docker Hub
Write-Host "🔍 Checking Docker Hub login..." -ForegroundColor Yellow
$dockerLogin = docker info 2>&1 | Select-String "Username"
if (-not $dockerLogin) {
    Write-Host "⚠️  Please login to Docker Hub first:" -ForegroundColor Yellow
    Write-Host "   docker login" -ForegroundColor Cyan
    Write-Host "Press any key to continue after logging in..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Build backend image
Write-Host "🏗️  Building backend image..." -ForegroundColor Yellow
docker build -t mahamudulhasan0/quizcraft-devlopment-environment:backend ./backend
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend image built successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Backend build failed!" -ForegroundColor Red
    exit 1
}

# Build frontend image
Write-Host "🏗️  Building frontend image..." -ForegroundColor Yellow
docker build -t mahamudulhasan0/quizcraft-devlopment-environment:frontend ./frontend
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend image built successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}

# Build full stack image
Write-Host "🏗️  Building full stack image..." -ForegroundColor Yellow
docker build -t mahamudulhasan0/quizcraft-devlopment-environment:latest .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Full stack image built successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Full stack build failed!" -ForegroundColor Red
    exit 1
}

# Push backend image
Write-Host "📤 Pushing backend image..." -ForegroundColor Yellow
docker push mahamudulhasan0/quizcraft-devlopment-environment:backend
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend image pushed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Backend push failed!" -ForegroundColor Red
    exit 1
}

# Push frontend image
Write-Host "📤 Pushing frontend image..." -ForegroundColor Yellow
docker push mahamudulhasan0/quizcraft-devlopment-environment:frontend
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend image pushed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend push failed!" -ForegroundColor Red
    exit 1
}

# Push full stack image
Write-Host "📤 Pushing full stack image..." -ForegroundColor Yellow
docker push mahamudulhasan0/quizcraft-devlopment-environment:latest
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Full stack image pushed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Full stack push failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 All images built and pushed successfully!" -ForegroundColor Green
Write-Host "📝 Available images:" -ForegroundColor Cyan
Write-Host "   mahamudulhasan0/quizcraft-devlopment-environment:backend" -ForegroundColor White
Write-Host "   mahamudulhasan0/quizcraft-devlopment-environment:frontend" -ForegroundColor White
Write-Host "   mahamudulhasan0/quizcraft-devlopment-environment:latest" -ForegroundColor White
Write-Host ""
Write-Host "✨ Your Docker images are now available on Docker Hub!" -ForegroundColor Green