# 🐳 QuizCraft Docker Quick Commands

## Daily Development Workflow

### 1. Start Everything (First Time)

```bash
# Start all services
docker-compose up -d

# Check if everything is running
docker-compose ps
```

### 2. When You Make Code Changes

```bash
# Option A: Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Option B: Rebuild everything (safer)
docker-compose down
docker-compose up --build -d
```

### 3. View Logs (Debug Issues)

```bash
# See all logs
docker-compose logs -f

# See specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### 4. Stop Everything

```bash
# Stop all services
docker-compose down

# Stop and remove all data (⚠️ DESTRUCTIVE)
docker-compose down -v
```

### 5. Quick Health Check

```bash
# Check if services are running
docker-compose ps

# Test API
curl http://localhost:5000/api/health

# Test Frontend
# Open http://localhost:19006 in browser
```

## Common Scenarios

### Scenario 1: I Changed Backend Code

```bash
docker-compose build backend
docker-compose up -d backend
```

### Scenario 2: I Changed Frontend Code

```bash
docker-compose build frontend
docker-compose up -d frontend
```

### Scenario 3: I Changed Both Backend and Frontend

```bash
docker-compose down
docker-compose up --build -d
```

### Scenario 4: Something is Broken

```bash
# Check logs first
docker-compose logs -f

# If still broken, rebuild everything
docker-compose down
docker-compose up --build -d
```

### Scenario 5: Database Issues

```bash
# Reset database (⚠️ deletes all data)
docker-compose down -v
docker-compose up -d
```

## Access Points

- **Frontend**: http://localhost:19006
- **Backend API**: http://localhost:5000
- **Database**: localhost:27017

## Environment Setup

### First Time Setup

```bash
# Copy environment template
cp .env.template .env

# Edit .env file and add your GEMINI_API_KEY
# Then start services
docker-compose up -d
```

### Check Environment

```bash
# See what's in your .env
cat .env

# Check if environment is loaded
docker-compose exec backend env | grep GEMINI
```
