import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base relativo: o mesmo build funciona no Netlify, no GitHub Pages (subpasta) e no preview local.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
    // bibliotecas em pedaços separados: o navegador guarda em cache e baixa em paralelo; o Supabase só carrega ao conectar
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'fisica', test: /node_modules[\\/]@dimforge/ },
            { name: 'three', test: /node_modules[\\/](three|three-stdlib)[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'r3f', test: /node_modules[\\/](@react-three|postprocessing|zustand)/ },
          ],
        },
      },
    },
  },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
