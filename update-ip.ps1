# QuizCraft IP Auto-Update Script
# ================================
# This script automatically detects your current Wi-Fi IP and updates the .env file

Write-Host "🔍 Detecting your current Wi-Fi IP address..." -ForegroundColor Cyan

# Get current Wi-Fi IP address
$wifiAdapter = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -like "*Wi-Fi*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.IPAddress -ne "127.0.0.1"
} | Select-Object -First 1

if ($null -eq $wifiAdapter) {
    Write-Host "❌ Could not detect Wi-Fi IP address!" -ForegroundColor Red
    Write-Host "💡 Please check your Wi-Fi connection and try again." -ForegroundColor Yellow
    exit 1
}

$currentIP = $wifiAdapter.IPAddress
Write-Host "✅ Detected Wi-Fi IP: $currentIP" -ForegroundColor Green

# Path to .env file
$envFile = ".\.env"

if (Test-Path $envFile) {
    # Read current .env file
    $content = Get-Content $envFile
    
    # Update the SERVER_IP line
    $updatedContent = $content | ForEach-Object {
        if ($_ -match "^SERVER_IP=") {
            "SERVER_IP=$currentIP"
        } else {
            $_
        }
    }
    
    # Write back to file
    $updatedContent | Set-Content $envFile
    
    Write-Host "🎉 Successfully updated .env file!" -ForegroundColor Green
    Write-Host "📝 SERVER_IP is now set to: $currentIP" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Restart your backend server (npm start in backend folder)" -ForegroundColor White
    Write-Host "   2. Restart your frontend app (npx expo start in frontend folder)" -ForegroundColor White
} else {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "💡 Please make sure you're running this script from the QuizCraft New directory." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")