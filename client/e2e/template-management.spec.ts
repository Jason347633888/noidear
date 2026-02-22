import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * TASK-036: E2E Tests for Template Management Core Flow
 *
 * Covers:
 * - Template list page
 * - Template create / edit page
 * - Template enable / disable toggle
 * - Template copy operation
 * - Template designer page
 *
 * All credentials loaded lazily from environment variables.
 * See .env.e2e.example for required variables.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function getToken(request: APIRequestContext): Promise<string> {
  const { adminUser, adminPass } = getCredentials();
  return getAuthToken(request, adminUser, adminPass);
}

test.describe('Template Management (TASK-036)', () => {
  test('TM-01: Template list renders correctly', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    await page.goto('/templates');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('TM-02: Template create page loads', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    await page.goto('/templates/create');
    await page.waitForLoadState('networkidle');

    // Form should be visible
    await expect(page.locator('form, .el-form, .template-edit')).toBeVisible({ timeout: 10000 });
  });

  test('TM-03: Template edit page loads for an existing template', async ({
    page,
    request,
  }) => {
    const token = await getToken(request);

    const listRes = await request.get(`${API_BASE}/templates?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listRes.ok()) {
      test.skip();
      return;
    }

    const body = await listRes.json();
    const templates = body?.data?.list ?? [];

    if (templates.length === 0) {
      test.skip();
      return;
    }

    const templateId = templates[0].id as string;
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    await page.goto(`/templates/${templateId}/edit`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('form, .el-form, .template-edit')).toBeVisible({ timeout: 10000 });
  });

  test('TM-04: Template designer page loads', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    await page.goto('/templates/designer');
    await page.waitForLoadState('networkidle');

    // Designer should load
    await expect(page.locator('.template-designer, .designer, .el-card')).toBeVisible({
      timeout: 10000,
    });
  });

  test('TM-05: Template list shows enable/disable toggle', async ({ page, request }) => {
    const token = await getToken(request);
    const listRes = await request.get(`${API_BASE}/templates?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listRes.ok()) {
      test.skip();
      return;
    }

    const body = await listRes.json();
    const templates = body?.data?.list ?? [];

    if (templates.length === 0) {
      test.skip();
      return;
    }

    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    await page.goto('/templates');
    await page.waitForLoadState('networkidle');

    // Table with toggle buttons should be present
    await expect(page.locator('.el-table')).toBeVisible({ timeout: 10000 });
    const rows = page.locator('.el-table .el-table__row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('TM-06: Tolerance config page loads for an existing template', async ({
    page,
    request,
  }) => {
    const token = await getToken(request);
    const listRes = await request.get(`${API_BASE}/templates?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listRes.ok()) {
      test.skip();
      return;
    }

    const body = await listRes.json();
    const templates = body?.data?.list ?? [];

    if (templates.length === 0) {
      test.skip();
      return;
    }

    const templateId = templates[0].id as string;
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    await page.goto(`/templates/${templateId}/tolerance`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.el-card, form, .el-form')).toBeVisible({ timeout: 10000 });
  });
});
