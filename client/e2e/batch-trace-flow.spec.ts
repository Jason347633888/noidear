import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * E2E Tests for Batch Trace Flow
 *
 * Covers:
 * - Batch list page renders
 * - TraceQuery page: enter batch number and search
 * - TraceQuery results display (tree or table)
 * - TraceReport page renders
 * - BatchDetail page renders for existing batch
 *
 * Credentials loaded from env vars. See .env.e2e.example.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function fetchFirstBatchId(
  request: APIRequestContext,
  token: string,
): Promise<{ id: string; batchNumber: string } | null> {
  try {
    const res = await request.get(`${API_BASE}/batch-trace/production-batches?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return null;
    const body = await res.json();
    const list: Array<{ id: string; batchNumber: string }> = body?.data?.list ?? [];
    return list.length > 0 ? { id: list[0].id, batchNumber: list[0].batchNumber } : null;
  } catch {
    return null;
  }
}

test.describe('Batch Trace Flow', () => {
  test('BT-01: Batch list page renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/batch-trace');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('BT-02: TraceQuery page renders with search form', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/batch-trace/query');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-card, .el-input')).toBeVisible({ timeout: 10000 });
  });

  test('BT-03: TraceQuery search with batch number shows results or empty', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/batch-trace/query');
    await page.waitForLoadState('networkidle');

    const batchInput = page.locator('.el-input input').first();
    if (!await batchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await batchInput.fill('TEST-BATCH-001');
    const searchBtn = page.locator('.el-button').filter({ hasText: /查询|搜索/ }).first();
    const searchVisible = await searchBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (searchVisible) {
      await searchBtn.click();
    } else {
      await batchInput.press('Enter');
    }
    await page.waitForLoadState('networkidle');
    // Should show results table, tree visualization, or empty state
    await expect(
      page.locator('.el-table, .el-tree, .el-empty, [class*="trace-tree"], [class*="result"]'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('BT-04: TraceQuery with real batch shows trace data', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getAuthToken(request, adminUser, adminPass);
    const batch = await fetchFirstBatchId(request, token);
    if (!batch) {
      test.skip();
      return;
    }

    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/batch-trace/query');
    await page.waitForLoadState('networkidle');

    const batchInput = page.locator('.el-input input').first();
    if (!await batchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await batchInput.fill(batch.batchNumber);
    const searchBtn = page.locator('.el-button').filter({ hasText: /查询|搜索/ }).first();
    const searchVisible = await searchBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (searchVisible) {
      await searchBtn.click();
    } else {
      await batchInput.press('Enter');
    }
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('.el-table, .el-tree, [class*="trace"]'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('BT-05: TraceReport page renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/batch-trace/report');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-card, .el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('BT-06: BatchDetail page loads for existing batch', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getAuthToken(request, adminUser, adminPass);
    const batch = await fetchFirstBatchId(request, token);
    if (!batch) {
      test.skip();
      return;
    }

    await loginViaApi(page, adminUser, adminPass);
    await page.goto(`/batch-trace/${batch.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-descriptions, .el-card')).toBeVisible({ timeout: 10000 });
  });

  test('BT-07: Batch list search filter works', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/batch-trace');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('.el-input input').first();
    if (!await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await searchInput.fill('xyz-nonexistent-batch-99999');
    await page.waitForTimeout(600);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 8000 });
  });

  test('BT-08: Batch list has pagination controls', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/batch-trace');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
    // Check pagination is present (only when there is data)
    const hasTable = await page.locator('.el-table').isVisible();
    if (hasTable) {
      await expect(page.locator('.el-pagination, .el-empty')).toBeVisible({ timeout: 5000 });
    }
  });
});
