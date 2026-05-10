import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../../support/urls';
import { ensureSystemManagementRolesFixture } from '../../support/bootstrap';

const uniqueId = () => process.env.E2E_RUN_ID ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const SYSTEM_ROLES = ['admin', 'leader', 'user'];

test.describe('Roles Page', () => {
  test.beforeEach(async ({ request }) => {
    await ensureSystemManagementRolesFixture(request);
  });

  test('should navigate to roles page', async ({ page }) => {
    await page.goto('/roles');
    await expect(page.getByText(/角色列表|角色管理|权限/).first()).toBeVisible({ timeout: 15000 });
  });

  test('system roles sort first in the list', async ({ page }) => {
    await page.goto('/roles');
    await expect(page.locator('.el-table').first()).toBeVisible({ timeout: 15000 });
    const firstFewText = await page.locator('.el-table__body tbody tr').first().textContent().catch(() => '');
    const systemRolePresent = SYSTEM_ROLES.some(r => firstFewText?.toLowerCase().includes(r));
    expect(systemRolePresent).toBeTruthy();
  });

  test('system roles show built-in markers', async ({ page }) => {
    await page.goto('/roles');
    await expect(page.locator('.el-table').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/系统内置/).first()).toBeVisible({ timeout: 5000 });
  });

  test('duplicate system-role names are rejected for custom roles', async ({ request }) => {
    const runId = uniqueId();
    const apiBase = apiBaseUrl();
    const loginRes = await request.post(`${apiBase}/auth/login`, {
      data: { username: process.env.E2E_ADMIN_USER ?? 'admin', password: process.env.E2E_ADMIN_PASS ?? 'ChangeMe123!' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { data: { token } } = await loginRes.json();

    const res = await request.post(`${apiBase}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: 'admin', name: 'admin', description: `Duplicate attempt ${runId}` },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('system roles cannot be deleted via API', async ({ request }) => {
    const apiBase = apiBaseUrl();
    const loginRes = await request.post(`${apiBase}/auth/login`, {
      data: { username: process.env.E2E_ADMIN_USER ?? 'admin', password: process.env.E2E_ADMIN_PASS ?? 'ChangeMe123!' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { data: { token } } = await loginRes.json();

    const listRes = await request.get(`${apiBase}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const body = await listRes.json();
    const roles = body.data?.list ?? body.data?.data ?? body.data ?? [];
    const adminRole = roles.find((r: { code: string }) => r.code === 'admin');
    if (adminRole) {
      const delRes = await request.delete(`${apiBase}/roles/${adminRole.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(delRes.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
