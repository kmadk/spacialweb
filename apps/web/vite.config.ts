import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@fir/penpot-parser': path.resolve(__dirname, '../../packages/penpot-parser/src'),
      '@fir/react-generator': path.resolve(__dirname, '../../packages/react-generator/src'),
      '@fir/spatial-runtime': path.resolve(__dirname, '../../packages/spatial-runtime/src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
});