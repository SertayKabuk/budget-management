// Runtime configuration accessor
// Provides type-safe access to runtime environment variables

interface RuntimeConfig {
  VITE_API_URL: string;
  VITE_WS_URL: string;
}

// Extend Window interface to include ENV
declare global {
  interface Window {
    ENV?: RuntimeConfig;
  }
}

// Get configuration from window.ENV (runtime) or fallback to import.meta.env (dev mode)
export const config = {
  get apiUrl(): string {
    return window.ENV?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
  },
  get wsUrl(): string {
    return window.ENV?.VITE_WS_URL || import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
  }
};
