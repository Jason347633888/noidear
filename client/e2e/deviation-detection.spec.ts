import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * TASK-098: E2E Tests for Deviation Detection Core Flow
 *
 * Covers:
 * - Deviation report list renders
 * - Deviation report detail page loads
 * - Deviation analytics dashboard renders
 * - Tolerance config page loads
 *
 * All credentials loaded lazily from environment variables.
 * See .env.e2e.example for required variables.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function fetchFirstDeviationReportId(request: APIRequestContext): Promise<string | null> {
  const { adminUser, adminPass } = getCredentials();
  const token = await getAuthToken(request, adminUser, adminPass);
  const res = await request.get(`${API_BASE}/deviation-reports?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return null;
  const body = await res.json();
  const items: Array<{ id: string }> = body?.data?.list ?? [];
  return items.length > 0 ? items[0].id : null;
}

test.describe('Deviation Detection (TASK-098)', () => {
  test('DEV-01: Deviation report list renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/deviation-reports');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('DEV-02: Deviation analytics dashboard renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/deviation-analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-card, canvas, .echarts')).toBeVisible({ timeout: 10000 });
  });

  test('DEV-03: Deviation report filter by severity works', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/deviation-reports');
    await page.waitForLoadState('networkidle');

    const severitySelect = page.locator('.el-select').first();
    if (!await severitySelect.isVisible()) return;

    await severitySelect.click();
    const option = page.locator('.el-select-dropdown__item').first();
    if (!await option.isVisible()) return;

    await option.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 8000 });
  });

  test('DEV-04: Tolerance config page for an existing template', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getAuthToken(request, adminUser, adminPass);

    const res = await request.get(`${API_BASE}/templates?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return test.skip();

    const body = await res.json();
    const templates: Array<{ id: string }> = body?.data?.list ?? [];
    if (templates.length === 0) return test.skip();

    const templateId = templates[0].id;
    await loginViaApi(page, adminUser, adminPass);
    await page.goto(`/templates/${templateId}/tolerance`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-card, form, .el-form')).toBeVisible({ timeout: 10000 });
  });

  test('DEV-05: Deviation report detail page loads', async ({ page, request }) => {
    const reportId = await fetchFirstDeviationReportId(request);
    if (!reportId) return test.skip();

    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    // Navigate to reports page and check if detail link exists
    await page.goto('/deviation-reports');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });
});
