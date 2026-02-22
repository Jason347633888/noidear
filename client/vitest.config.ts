import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: [
        'src/api/task.ts',
        'src/api/approval.ts',
        'src/api/training.ts',
        'src/api/exam.ts',
        'src/api/todo.ts',
        'src/views/tasks/**/*.vue',
        'src/views/approvals/**/*.vue',
        'src/views/training/**/*.vue',
        'src/views/todo/**/*.vue',
        'src/components/training/**/*.vue',
        'src/components/todo/**/*.vue',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
