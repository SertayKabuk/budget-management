# Backend Dockerfile
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with SSL workaround for corporate networks
RUN npm config set fetch-timeout 60000 && \
    npm config set strict-ssl false && \
    npm ci

# Copy prisma schema
COPY prisma ./prisma

# Generate Prisma Client (with SSL workaround for corporate networks)
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only with SSL workaround
RUN npm config set fetch-timeout 60000 && \
    npm config set strict-ssl false && \
    npm ci --only=production

# Copy prisma schema and generated client
COPY prisma ./prisma
RUN NODE_TLS_REJECT_UNAUTHORIZED=0 npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]
