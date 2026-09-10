import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts']
  },
  resolve: {
    alias: {
      'thinking-orbs-mega': resolve(__dirname, '../thinking-orbs-mega/src/index.ts')
    }
  }
});
