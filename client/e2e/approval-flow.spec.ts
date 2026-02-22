import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * TASK-064: E2E Tests for Approval Flow Core Flow
 *
 * Covers:
 * - Pending approval list renders
 * - Approval list (all) renders
 * - Approval history renders
 * - Approval detail page loads for an existing approval
 *
 * All credentials loaded lazily from environment variables.
 * See .env.e2e.example for required variables.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function fetchFirstApprovalId(request: APIRequestContext): Promise<string | null> {
  const { adminUser, adminPass } = getCredentials();
  const token = await getAuthToken(request, adminUser, adminPass);
  const res = await request.get(`${API_BASE}/approvals?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return null;
  const body = await res.json();
  const items: Array<{ id: string }> = body?.data?.list ?? [];
  return items.length > 0 ? items[0].id : null;
}

test.describe('Approval Flow (TASK-064)', () => {
  test('AP-01: Pending approval list renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/approvals/pending');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('AP-02: Approval list (all) renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('AP-03: Approval history renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/approvals/history');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('AP-04: Approval detail page loads for an existing approval', async ({ page, request }) => {
    const approvalId = await fetchFirstApprovalId(request);
    if (!approvalId) return test.skip();

    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto(`/approvals/detail/${approvalId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-descriptions, .el-card')).toBeVisible({ timeout: 10000 });
  });

  test('AP-05: Approval list status filter applies without error', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const statusSelect = page.locator('.el-select').first();
    if (!await statusSelect.isVisible()) return;

    await statusSelect.click();
    const option = page.locator('.el-select-dropdown__item').first();
    if (!await option.isVisible()) return;

    await option.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 8000 });
  });
});
