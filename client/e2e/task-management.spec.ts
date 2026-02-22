import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * TASK-052: E2E Tests for Task Management Core Flow
 *
 * All credentials loaded lazily from environment variables.
 * See .env.e2e.example for required variables.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function fetchFirstTaskId(request: APIRequestContext): Promise<string | null> {
  const { adminUser, adminPass } = getCredentials();
  const token = await getAuthToken(request, adminUser, adminPass);
  const res = await request.get(`${API_BASE}/tasks?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return null;
  const body = await res.json();
  const tasks: Array<{ id: string }> = body?.data?.list ?? [];
  return tasks.length > 0 ? tasks[0].id : null;
}

test.describe('Task Management (TASK-052)', () => {
  test('TK-01: Task list page renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('TK-02: Task create page loads', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/tasks/create');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form, .el-form, .el-steps, .el-card')).toBeVisible({ timeout: 10000 });
  });

  test('TK-03: Task detail page loads for an existing task', async ({ page, request }) => {
    const taskId = await fetchFirstTaskId(request);
    if (!taskId) return test.skip();

    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto(`/tasks/${taskId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-descriptions, .el-card')).toBeVisible({ timeout: 10000 });
  });

  test('TK-04: Task list pagination renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    const pagination = page.locator('.el-pagination');
    if (await pagination.isVisible()) {
      const text = await pagination.textContent();
      expect(text).toBeTruthy();
    }
  });
});
