import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5201, strictPort: true },
  preview: { host: '127.0.0.1', port: 4201, strictPort: true },
  build: { chunkSizeWarningLimit: 900, assetsInlineLimit: 0 },
});
