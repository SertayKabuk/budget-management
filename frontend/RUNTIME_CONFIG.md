# Frontend Runtime Configuration

This document describes how the frontend handles environment variables at runtime instead of build time.

## Overview

Previously, the frontend used Vite's `import.meta.env` to access environment variables, which were baked into the JavaScript bundle at build time. This meant that changing environment variables required rebuilding the Docker image.

Now, the frontend uses a **runtime configuration system** where environment variables are injected when the container starts, allowing the same Docker image to be used across different environments.

## How It Works

### 1. Configuration Template (`config.template.js`)

This file contains placeholders that will be replaced with actual environment variable values at container startup:

```javascript
window.ENV = {
  VITE_API_URL: '__VITE_API_URL__',
  VITE_WS_URL: '__VITE_WS_URL__'
};
```

### 2. Entrypoint Script (`env.sh`)

This shell script runs automatically when the container starts (via nginx's `/docker-entrypoint.d/` directory). It:

1. Reads environment variables from the container environment
2. Uses `sed` to replace placeholders in `config.template.js`
3. Outputs the result to `config.js` which is served by nginx

Example:
```bash
sed "s|__VITE_API_URL__|${VITE_API_URL}|g" config.template.js > config.js
```

### 3. Runtime Configuration Access (`src/config/runtime.ts`)

A TypeScript utility module provides type-safe access to runtime configuration:

```typescript
import { config } from '../config/runtime';

// Access API URL
const apiUrl = config.apiUrl;  // Falls back to import.meta.env in dev mode

// Access WebSocket URL
const wsUrl = config.wsUrl;
```

The module checks `window.ENV` first (runtime config) and falls back to `import.meta.env` for local development.

### 4. HTML Integration (`index.html`)

The generated `config.js` file is loaded before the main application bundle:

```html
<script src="/config.js"></script>
<script type="module" src="/src/main.tsx"></script>
```

## Usage

### Local Development

When running the frontend with `npm run dev`, the configuration uses Vite's standard environment variables from `.env.local`:

```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### Docker Deployment

When deploying with Docker, pass environment variables at runtime:

#### Using Docker Run

```bash
docker run -p 80:80 \
  -e VITE_API_URL=https://api.example.com \
  -e VITE_WS_URL=wss://api.example.com \
  budget-frontend
```

#### Using Docker Compose

In `docker-compose.yml`:

```yaml
frontend:
  build: ./frontend
  environment:
    - VITE_API_URL=https://api.example.com
    - VITE_WS_URL=wss://api.example.com
```

Or using environment variables from the host:

```yaml
frontend:
  build: ./frontend
  environment:
    - VITE_API_URL=${BACKEND_URL}
    - VITE_WS_URL=${BACKEND_WS_URL}
```

### Kubernetes Deployment

In your Kubernetes deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: budget-frontend
spec:
  template:
    spec:
      containers:
      - name: frontend
        image: budget-frontend:latest
        env:
        - name: VITE_API_URL
          value: "https://api.example.com"
        - name: VITE_WS_URL
          value: "wss://api.example.com"
```

Or using ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
data:
  VITE_API_URL: "https://api.example.com"
  VITE_WS_URL: "wss://api.example.com"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: budget-frontend
spec:
  template:
    spec:
      containers:
      - name: frontend
        image: budget-frontend:latest
        envFrom:
        - configMapRef:
            name: frontend-config
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3001` |
| `VITE_WS_URL` | WebSocket server URL | `ws://localhost:3001` |

## Benefits

1. **Single Docker Image**: Build once, deploy anywhere with different configurations
2. **Environment Flexibility**: Easily switch between dev, staging, and production
3. **No Rebuild Required**: Change configuration without rebuilding the image
4. **Kubernetes-Friendly**: Works seamlessly with ConfigMaps and Secrets
5. **DevOps Best Practice**: Follows the 12-factor app principle of configuration

## Migration Notes

For developers updating existing code:

- Replace `import.meta.env.VITE_API_URL` with `config.apiUrl`
- Replace `import.meta.env.VITE_WS_URL` with `config.wsUrl`
- Import the config utility: `import { config } from '../config/runtime'`

The utility automatically handles both runtime and development scenarios, so code works in both environments without changes.
