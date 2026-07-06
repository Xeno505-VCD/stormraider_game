import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/node_modules/three/examples/') ||
            id.includes('\\node_modules\\three\\examples\\')
          ) {
            return 'vendor-three-loaders';
          }

          if (id.includes('/node_modules/three/') || id.includes('\\node_modules\\three\\')) {
            return 'vendor-three';
          }

          if (id.includes('/node_modules/') || id.includes('\\node_modules\\')) {
            return 'vendor';
          }

          return undefined;
        }
      }
    }
  }
});
