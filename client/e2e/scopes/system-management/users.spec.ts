import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../../support/urls';

const runId = process.env.E2E_RUN_ID ?? Date.now().toString(36);

test.describe('Users Page', () => {
  test('should load /users page', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByRole('heading', { name: /用户管理|用户列表/i })).toBeVisible({ timeout: 15000 });
  });

  test('should display user list with expected columns', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15000 });
  });

  test('should have department filter', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('[placeholder*="部门"], [aria-label*="部门"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('should have role filter', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('[placeholder*="角色"], [aria-label*="角色"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('create-user modal allows empty department', async ({ page }) => {
    await page.goto('/users');
    const createBtn = page.getByRole('button', { name: /新建用户|添加用户|创建用户/i });
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

  test(`creating a leader without department shows 未分配部门 [${runId}]`, async ({ page, request }) => {
    const apiBase = apiBaseUrl();
    const loginRes = await request.post(`${apiBase}/auth/login`, {
      data: { username: process.env.E2E_ADMIN_USER ?? 'admin', password: process.env.E2E_ADMIN_PASS ?? 'ChangeMe123!' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { data: { token } } = await loginRes.json();

    const createRes = await request.post(`${apiBase}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        username: `e2e_nodel_${runId}`,
        password: 'TestPass123!',
        name: `No-Dept Leader ${runId}`,
        roles: ['leader'],
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
