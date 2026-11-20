import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Env files (.env, .env.local) live at the repository root so the web app
// and the API share one configuration source.
const envDir = path.resolve(__dirname, '../..');

// Only VITE_-prefixed variables are exposed to client code (Vite's default).
// Provider credentials are read exclusively by apps/api.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');
  return {
    envDir,
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Forward API calls to the backend during development (apps/api).
        '/api': `http://localhost:${env.API_PORT || 8787}`,
      },
    },
    plugins: [react()],
  };
});
