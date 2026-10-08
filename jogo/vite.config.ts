import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base relativo: o mesmo build funciona no Netlify, no GitHub Pages (subpasta) e no preview local.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
