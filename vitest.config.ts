import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'crates'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['packages/**/*.ts'],
      exclude: [
        'packages/**/*.d.ts',
        'packages/**/*.test.ts',
        'packages/**/*.spec.ts',
        'packages/**/__tests__/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './packages'),
      '@sintesi/core': path.resolve(__dirname, './packages/core/index.ts'),
    },
  },
});
