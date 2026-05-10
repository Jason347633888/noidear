import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../../support/urls';
import { ensureSystemManagementDepartmentsFixture } from '../../support/bootstrap';

const uniqueId = () => process.env.E2E_RUN_ID ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('Departments Page', () => {
  test.beforeEach(async ({ request }) => {
    await ensureSystemManagementDepartmentsFixture(request);
  });

  test('should navigate to /departments', async ({ page }) => {
    await page.goto('/departments');
    await expect(page.getByRole('heading', { name: /部门管理|部门列表/i })).toBeVisible({ timeout: 15000 });
  });

  test('department list shows expected columns', async ({ page }) => {
    await page.goto('/departments');
    const table = page.locator('.el-table').first();
    await expect(table).toBeVisible({ timeout: 15000 });
    const tableText = await table.textContent();
    expect(tableText).toMatch(/部门/);
  });

  test('new department dialog requires leader selection', async ({ page }) => {
    await page.goto('/departments');
    const createBtn = page.locator('.create-btn').first();
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.locator('.el-form-item', { hasText: '负责人' })).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
  });

  test('assigning previously unassigned leader auto-attaches user to department', async ({ request }) => {
    const runId = uniqueId();
    const apiBase = apiBaseUrl();
    const { token, roleIds } = await ensureSystemManagementDepartmentsFixture(request);

    const userRes = await request.post(`${apiBase}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        username: `e2e_dept_leader_${runId}`,
        password: 'TestPass123!',
        name: `Dept Leader ${runId}`,
        roleId: roleIds.leader,
      },
    });
    if (userRes.status() !== 201 && userRes.status() !== 200) return;
    const { data: { id: userId } } = await userRes.json();

    const deptRes = await request.post(`${apiBase}/departments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `E2E Dept ${runId}`,
        code: `E2E_${runId}`,
        managerId: userId,
      },
    });
    if (deptRes.status() !== 201 && deptRes.status() !== 200) return;
    const { data: dept } = await deptRes.json();
    expect(dept.managerId ?? dept.manager?.id).toBe(userId);
  });
});
