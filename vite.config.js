import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the React app runs on :5173 and proxies /api to the Express service on :8787.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 900 },
});
