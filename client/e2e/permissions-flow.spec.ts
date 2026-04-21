import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * E2E Tests for Permission Management Flow (P1-2)
 *
 * Covers:
 * - UserPermissionsManager page renders
 * - PermissionDefinitions page renders
 * - Granting permission to a user (dialog flow)
 * - Fine-grained permission configuration page
 *
 * Credentials are loaded from environment variables via getCredentials().
 * See .env.e2e.example for required variables.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function fetchFirstUserId(
  request: APIRequestContext,
  token: string,
): Promise<string | null> {
  try {
    const res = await request.get(`${API_BASE}/users?page=1&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return null;
    const body = await res.json();
    const list: Array<{ id: string }> = body?.data?.list ?? [];
    return list.length > 0 ? list[0].id : null;
  } catch {
    return null;
  }
}

test.describe('Permission Management Flow (P1-2)', () => {
  test('PM-01: UserPermissionsManager page renders for admin', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/admin/user-permissions');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('PM-02: PermissionDefinitions page renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/admin/permissions');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty, .el-card')).toBeVisible({ timeout: 10000 });
  });

  test('PM-03: Fine-grained permissions configuration page renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/permissions/fine-grained');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty, .el-card')).toBeVisible({ timeout: 10000 });
  });

  test('PM-04: User permissions page renders for specific user', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getAuthToken(request, adminUser, adminPass);
    const userId = await fetchFirstUserId(request, token);
    if (!userId) {
      test.skip();
      return;
    }

    await loginViaApi(page, adminUser, adminPass);
    await page.goto(`/users/${userId}/permissions`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-card, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('PM-05: Grant permission dialog opens from UserPermissionsManager', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/admin/user-permissions');
    await page.waitForLoadState('networkidle');

    const grantBtn = page.locator('.el-button').filter({ hasText: /授权|添加权限|新增/ }).first();
    const grantBtnVisible = await grantBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!grantBtnVisible) {
      test.skip();
      return;
    }

    await grantBtn.click();
    await expect(page.locator('.el-dialog')).toBeVisible({ timeout: 5000 });

    const cancelBtn = page.locator('.el-dialog .el-button').filter({ hasText: /取消|关闭/ }).first();
    const cancelVisible = await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (cancelVisible) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  test('PM-06: Department permission page renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/permissions/department');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty, .el-card')).toBeVisible({ timeout: 10000 });
  });

  test('PM-07: Permission audit log page renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);
    await page.goto('/permissions/audit-log');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty')).toBeVisible({ timeout: 10000 });
  });

  test('PM-08: Non-admin user redirected from admin pages', async ({ page }) => {
    const { memberUser, memberPass } = getCredentials();
    await loginViaApi(page, memberUser, memberPass);
    await page.goto('/admin/user-permissions');
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    const isDashboard = currentUrl.includes('/dashboard');
    const hasAccessDenied = await page
      .locator('.el-empty, [class*="forbidden"]')
      .isVisible()
      .catch(() => false);
    expect(isDashboard || hasAccessDenied).toBeTruthy();
  });
});
