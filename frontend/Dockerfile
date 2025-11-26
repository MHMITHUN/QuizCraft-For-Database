# Frontend Dockerfile for QuizCraft (Web version)
FROM node:18-alpine AS base

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S quizcraft -u 1001

# Change ownership
RUN chown -R quizcraft:nodejs /app

# Switch to non-root user
USER quizcraft

# Expose port for Expo web
EXPOSE 19006

# Set environment variables
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:19006 || exit 1

# Start Expo web server
CMD ["dumb-init", "npx", "expo", "start", "--web", "--host", "0.0.0.0"]