import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/plugin.js'),
      formats: ['es'],
      fileName: () => 'plugin.js'
    },
    rollupOptions: {
      external: ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime']
    },
    outDir: resolve(__dirname),
    emptyOutDir: false,
    minify: false
  }
});
