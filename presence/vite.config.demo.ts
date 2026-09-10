import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(__dirname, 'demo'),
  plugins: [react()],
  server: { port: 5188, host: '127.0.0.1', strictPort: true },
  resolve: {
    alias: {
      presence: resolve(__dirname, 'src/index.ts'),
      'thinking-orbs-mega': resolve(__dirname, '../thinking-orbs-mega/src/index.ts')
    }
  }
});
