# Frontend Dockerfile
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (includes devDependencies needed for build)
# Set longer timeout and disable strict SSL for corporate networks
RUN npm config set fetch-timeout 60000 && \
    npm config set strict-ssl false && \
    npm ci

# Copy all source files (.dockerignore will exclude unnecessary files)
COPY . .

# Build the application - no build-time env vars needed anymore
RUN ./node_modules/.bin/tsc -b && ./node_modules/.bin/vite build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy config template and entrypoint script for runtime configuration
COPY config.template.js /usr/share/nginx/html/config.template.js
COPY env.sh /docker-entrypoint.d/env.sh

# Make entrypoint script executable
RUN chmod +x /docker-entrypoint.d/env.sh

# Expose port
EXPOSE 80

# Environment variables will be injected at runtime
ENV VITE_API_URL=http://localhost:3001
ENV VITE_WS_URL=ws://localhost:3001

# Start nginx (entrypoint script runs automatically via /docker-entrypoint.d/)
CMD ["nginx", "-g", "daemon off;"]
