import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API defaults to :8000 (see README). Override when another local project
// (e.g. a second backend) already holds that port: VITE_API_PROXY_TARGET=http://localhost:8010
const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
