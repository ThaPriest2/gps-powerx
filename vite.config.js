
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Vercel serves the production frontend from this directory.
  publicDir: false,

  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },

  build: {
    outDir: 'public',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
});
