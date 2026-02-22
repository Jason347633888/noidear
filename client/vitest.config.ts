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
        'src/views/tasks/TaskCreate.vue',
        'src/views/approvals/ApprovalDetail.vue',
        'src/views/approvals/ApprovalPending.vue',
        'src/views/documents/Level1List.vue',
        'src/views/documents/DocumentDetail.vue',
        'src/views/statistics/Overview.vue',
        'src/views/statistics/DocumentStatistics.vue',
        'src/views/statistics/TaskStatistics.vue',
        'src/views/templates/TemplateEdit.vue',
        'src/views/RecycleBin.vue',
        'src/components/ExportButton.vue',
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
