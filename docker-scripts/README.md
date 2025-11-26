# 🐳 QuizCraft Docker Scripts

This folder contains helpful PowerShell scripts to manage your QuizCraft Docker setup easily.

## 📋 Available Scripts

### 🚀 `start-quizcraft.ps1`

**Purpose**: Start your QuizCraft application
**Usage**: `.\start-quizcraft.ps1`
**What it does**:

- Checks if Docker is running
- Creates .env file if missing
- Starts all QuizCraft services
- Shows access URLs

### 🛑 `stop-quizcraft.ps1`

**Purpose**: Stop your QuizCraft application
**Usage**: `.\stop-quizcraft.ps1`
**What it does**:

- Stops all QuizCraft services
- Shows confirmation

### 🔄 `restart-quizcraft.ps1`

**Purpose**: Restart your QuizCraft application
**Usage**: `.\restart-quizcraft.ps1`
**What it does**:

- Restarts all services without rebuilding
- Faster than full rebuild

### 🔨 `rebuild-quizcraft.ps1`

**Purpose**: Rebuild QuizCraft with your latest changes
**Usage**: `.\rebuild-quizcraft.ps1`
**What it does**:

- Stops services
- Rebuilds containers with latest code
- Starts services again
- Use this when you make code changes

### 📋 `view-logs.ps1`

**Purpose**: View logs for debugging
**Usage**: `.\view-logs.ps1`
**What it does**:

- Shows menu to choose which logs to view
- Options: All services, Backend, Frontend, Database

### 🔍 `check-status.ps1`

**Purpose**: Check if everything is working
**Usage**: `.\check-status.ps1`
**What it does**:

- Shows service status
- Tests API endpoints
- Shows access URLs
- Health checks

## 🚀 Quick Start Guide

### First Time Setup

```powershell
# 1. Make sure Docker Desktop is running
# 2. Run the start script
.\start-quizcraft.ps1
```

### Daily Development Workflow

```powershell
# Start QuizCraft
.\start-quizcraft.ps1

# Make your code changes...

# When you make changes, rebuild
.\rebuild-quizcraft.ps1

# Check if everything is working
.\check-status.ps1

# View logs if something is wrong
.\view-logs.ps1

# Stop when done
.\stop-quizcraft.ps1
```

### When You Make Code Changes

```powershell
# After making changes to your code:
.\rebuild-quizcraft.ps1
```

### Troubleshooting

```powershell
# Check what's wrong
.\check-status.ps1

# View logs to see errors
.\view-logs.ps1

# If still broken, try restart
.\restart-quizcraft.ps1
```

## 🔧 Manual Commands (Alternative)

If you prefer manual commands:

```powershell
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Rebuild with changes
docker-compose down
docker-compose up --build -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

## 📱 Access Your Application

After starting QuizCraft:

- **Frontend (Web App)**: http://localhost:19006
- **Backend API**: http://localhost:5000
- **Database**: localhost:27017

## 🆘 Troubleshooting

### "Docker is not running"

- Start Docker Desktop
- Wait for Docker to fully load
- Try again

### "Port already in use"

- Check what's using the ports: `netstat -ano | findstr :19006`
- Kill the process or change ports in docker-compose.yml

### "Permission denied"

- Run PowerShell as Administrator
- Or fix Docker permissions

### Services not starting

- Check logs: `.\view-logs.ps1`
- Try rebuild: `.\rebuild-quizcraft.ps1`
- Check Docker Desktop is running

## 📋 Environment Setup

Make sure you have:

1. **Docker Desktop** installed and running
2. **GEMINI_API_KEY** in your .env file
3. **PowerShell** (comes with Windows)

## 🎯 Pro Tips

1. **Always use rebuild after code changes** - `.\rebuild-quizcraft.ps1`
2. **Check status first** - `.\check-status.ps1` before debugging
3. **View logs for errors** - `.\view-logs.ps1` when something's wrong
4. **Keep Docker Desktop running** - Don't close it while using QuizCraft

## 📞 Need Help?

1. Check the logs: `.\view-logs.ps1`
2. Check status: `.\check-status.ps1`
3. Try rebuild: `.\rebuild-quizcraft.ps1`
4. Check Docker Desktop is running
5. Verify .env file has GEMINI_API_KEY

---

**Happy coding with QuizCraft! 🎉**
