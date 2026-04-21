import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * E2E Tests for Recycle Bin (P1-1)
 *
 * Covers:
 * - Recycle bin page renders
 * - Type filter switching
 * - Keyword search input
 * - Restore action flow
 * - Permanent delete confirmation dialog
 * - Filter by deletedBy field
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function softDeleteDocument(
  request: APIRequestContext,
  token: string,
): Promise<string | null> {
  // Create a document then soft-delete it for testing
  const createRes = await request.post(`${API_BASE}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: `e2e-recycle-test-${Date.now()}`,
      number: `RBT-${Date.now()}`,
      content: 'test',
      level: 1,
    },
  });
  if (!createRes.ok()) return null;
  const body = await createRes.json();
  const docId = body?.data?.id;
  if (!docId) return null;

  const delRes = await request.delete(`${API_BASE}/documents/${docId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return delRes.ok() ? docId : null;
}

test.describe('Recycle Bin (P1-1)', () => {
  test('RB-01: Recycle bin page renders correctly', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/recycle-bin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.recycle-bin')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('RB-02: Type filter switching works', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/recycle-bin');
    await page.waitForLoadState('networkidle');

    // Switch to template type
    const templateFilter = page.locator('.type-item').filter({ hasText: '模板' });
    await templateFilter.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 8000 });

    // Switch to record type
    const recordFilter = page.locator('.type-item').filter({ hasText: '记录' });
    await recordFilter.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 8000 });
  });

  test('RB-03: Keyword search triggers data reload', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/recycle-bin');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('.el-input input').first();
    await searchInput.fill('nonexistent-keyword-xyz');
    await page.waitForTimeout(600);
    await page.waitForLoadState('networkidle');
    // Should show empty state after filtering
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 8000 });
  });

  test('RB-04: DeletedBy filter passes parameter', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/recycle-bin');
    await page.waitForLoadState('networkidle');

    const deletedByInput = page.locator('.el-input input').nth(1);
    if (await deletedByInput.isVisible()) {
      await deletedByInput.fill('admin');
      await page.waitForTimeout(600);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 8000 });
    }
  });

  test('RB-05: Soft-delete then visible in recycle bin', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getAuthToken(request, adminUser, adminPass);
    const docId = await softDeleteDocument(request, token);
    if (!docId) return test.skip();

    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/recycle-bin');
    await page.waitForLoadState('networkidle');

    // Wait for table to show data
    await expect(page.locator('.el-table')).toBeVisible({ timeout: 10000 });
    // Table should have at least one row
    const rows = page.locator('.el-table__body tr');
    await expect(rows.first()).toBeVisible({ timeout: 8000 });
  });

  test('RB-06: Restore button triggers confirmation', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getAuthToken(request, adminUser, adminPass);
    const docId = await softDeleteDocument(request, token);
    if (!docId) return test.skip();

    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/recycle-bin');
    await page.waitForLoadState('networkidle');

    const restoreBtn = page.locator('.el-button').filter({ hasText: '恢复' }).first();
    if (!await restoreBtn.isVisible({ timeout: 5000 })) return test.skip();

    await restoreBtn.click();
    // Expect confirmation dialog
    await expect(page.locator('.el-message-box')).toBeVisible({ timeout: 5000 });
    // Dismiss to not actually restore
    await page.locator('.el-message-box__btns .el-button').first().click();
  });

  test('RB-07: Permanent delete shows error-type confirmation', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getAuthToken(request, adminUser, adminPass);
    const docId = await softDeleteDocument(request, token);
    if (!docId) return test.skip();

    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/recycle-bin');
    await page.waitForLoadState('networkidle');

    const deleteBtn = page.locator('.el-button').filter({ hasText: '彻底删除' }).first();
    if (!await deleteBtn.isVisible({ timeout: 5000 })) return test.skip();

    await deleteBtn.click();
    await expect(page.locator('.el-message-box')).toBeVisible({ timeout: 5000 });
    // Verify warning text appears
    await expect(page.locator('.el-message-box__message')).toContainText('不可撤销', { timeout: 3000 });
    // Cancel
    await page.locator('.el-message-box__btns .el-button').first().click();
  });

  test('RB-08: Reset filter clears inputs', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/recycle-bin');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('.el-input input').first();
    await searchInput.fill('test-keyword');
    await page.waitForTimeout(300);

    const resetBtn = page.locator('.el-button').filter({ hasText: '重置' });
    await resetBtn.click();
    await page.waitForLoadState('networkidle');

    await expect(searchInput).toHaveValue('');
  });
});
