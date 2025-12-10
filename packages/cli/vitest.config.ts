import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    pool: 'forks', // Use forks instead of threads to support process.chdir()
  },
  resolve: {
    alias: {
      '@sintesi/core': path.resolve(__dirname, '../core/dist/index.js'),
    },
  },
});
