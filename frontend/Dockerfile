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

# Accept build arguments for environment variables
ARG VITE_API_URL
ARG VITE_WS_URL

# Set environment variables for Vite build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Build the application - use node_modules/.bin for reliable paths
RUN ./node_modules/.bin/tsc -b && ./node_modules/.bin/vite build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
