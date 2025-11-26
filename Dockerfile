# Multi-stage Dockerfile for QuizCraft Full Stack
# This builds both frontend and backend in a single container

# Stage 1: Build Backend
FROM node:18-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

# Stage 2: Build Frontend  
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./

# Stage 3: Production Runtime
FROM node:18-alpine AS production

# Install dumb-init and required packages
RUN apk add --no-cache dumb-init nginx

# Create app directories
WORKDIR /app
RUN mkdir -p /app/backend /app/frontend

# Copy backend
COPY --from=backend-build /app/backend /app/backend
COPY --from=frontend-build /app/frontend /app/frontend

# Copy docker-compose and scripts
COPY docker-compose.yml /app/
COPY scripts/ /app/scripts/
COPY .env.template /app/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S quizcraft -u 1001 && \
    chown -R quizcraft:nodejs /app

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Starting QuizCraft Development Environment..."' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Copy environment template if .env does not exist' >> /app/start.sh && \
    echo 'if [ ! -f .env ]; then' >> /app/start.sh && \
    echo '    echo "📋 Creating .env from template..."' >> /app/start.sh && \
    echo '    cp .env.template .env' >> /app/start.sh && \
    echo '    echo "⚠️  Please edit .env file and add your GEMINI_API_KEY"' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# Start with docker-compose' >> /app/start.sh && \
    echo 'exec docker-compose up' >> /app/start.sh

RUN chmod +x /app/start.sh

# Switch to non-root user
USER quizcraft

# Expose ports
EXPOSE 5000 19006 27017

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["dumb-init", "/app/start.sh"]