#!/bin/sh

# Generate config.js from template with environment variables
# This runs at container startup, allowing runtime configuration

# Set defaults if environment variables are not provided
VITE_API_URL=${VITE_API_URL:-http://localhost:3001}
VITE_WS_URL=${VITE_WS_URL:-ws://localhost:3001}

echo "Generating runtime configuration..."
echo "VITE_API_URL: $VITE_API_URL"
echo "VITE_WS_URL: $VITE_WS_URL"

# Use sed to replace placeholders in template and output to config.js
sed "s|__VITE_API_URL__|${VITE_API_URL}|g; s|__VITE_WS_URL__|${VITE_WS_URL}|g" \
  /usr/share/nginx/html/config.template.js > /usr/share/nginx/html/config.js

echo "Runtime configuration generated successfully"

# Start nginx
exec "$@"
