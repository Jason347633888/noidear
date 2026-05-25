import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@noidear/types': path.resolve(__dirname, '../packages/types/index.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    typecheck: {
      tsconfig: './tsconfig.vitest.json',
    },
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: [
        'src/views/documents/Level1List.vue',
        'src/views/documents/DocumentDetail.vue',
        'src/components/OfficePreview.vue',
        'src/components/training/ExamResult.vue',
      ],
      thresholds: {
        branches: 55,
        functions: 55,
        lines: 65,
        statements: 65,
      },
    },
  },
});
