import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: resolve(__dirname, 'demo'),
  plugins: [react(), tailwindcss()],
  server: { port: 5177 },
  resolve: {
    alias: {
      'thinking-orbs': resolve(__dirname, 'src/index.ts')
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist-demo'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'demo/index.html'),
        simple: resolve(__dirname, 'demo/simple.html'),
        review: resolve(__dirname, 'demo/review.html'),
        seam: resolve(__dirname, 'demo/seam.html'),
        play: resolve(__dirname, 'demo/play.html'),
        aurartc: resolve(__dirname, 'demo/aesthetics/aurartc-orb.html'),
        hermes: resolve(__dirname, 'demo/aesthetics/hermes-live.html'),
        codex: resolve(__dirname, 'demo/aesthetics/codex-voice-orb/index.html')
      }
    }
  }
});
