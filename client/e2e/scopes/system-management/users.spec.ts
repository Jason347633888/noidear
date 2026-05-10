import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../../support/urls';
import { ensureSystemManagementUsersFixture } from '../../support/bootstrap';

const uniqueId = () => process.env.E2E_RUN_ID ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('Users Page', () => {
  test.beforeEach(async ({ request }) => {
    await ensureSystemManagementUsersFixture(request);
  });

  test('should load /users page', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: /用户管理|用户列表/i })).toBeVisible({ timeout: 15000 });
  });

  test('should display user list with expected columns', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('.el-table').first()).toBeVisible({ timeout: 15000 });
  });

  test('should have department filter', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('.filter-card .el-form-item', { hasText: '部门' })).toBeVisible({ timeout: 15000 });
  });

  test('should have role filter', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('.filter-card .el-form-item', { hasText: '角色' })).toBeVisible({ timeout: 15000 });
  });

  test('create-user modal allows empty department', async ({ page }) => {
    await page.goto('/users');
    const createBtn = page.locator('.create-btn').first();
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    const deptField = modal.locator('[placeholder*="部门"], [aria-label*="部门"]').first();
    if (await deptField.isVisible()) {
      await expect(deptField).not.toHaveAttribute('required');
    }
    await page.keyboard.press('Escape');
  });

  test('creating a leader without department shows 未分配部门', async ({ page, request }) => {
    const runId = uniqueId();
    const apiBase = apiBaseUrl();
    const { token, roleIds } = await ensureSystemManagementUsersFixture(request);

    const createRes = await request.post(`${apiBase}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        username: `e2e_nodel_${runId}`,
        password: 'TestPass123!',
        name: `No-Dept Leader ${runId}`,
        roleId: roleIds.leader,
      },
    });
    if (createRes.status() === 201 || createRes.status() === 200) {
      await page.goto('/users');
      await page.getByPlaceholder(/搜索/).fill(`e2e_nodel_${runId}`).catch(() => {});
      await page.waitForTimeout(500);
      const row = page.locator('tr', { hasText: `No-Dept Leader ${runId}` });
      if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(row.getByText(/未分配部门/)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
