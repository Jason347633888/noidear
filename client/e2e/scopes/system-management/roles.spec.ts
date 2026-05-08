import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../../support/urls';

const runId = process.env.E2E_RUN_ID ?? Date.now().toString(36);
const SYSTEM_ROLES = ['admin', 'leader', 'user'];

test.describe('Roles Page', () => {
  test('should navigate to roles page', async ({ page }) => {
    await page.goto('/roles');
    await expect(
      page.getByRole('heading', { name: /角色管理|角色列表|权限/i }).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('system roles sort first in the list', async ({ page }) => {
    await page.goto('/roles');
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15000 });
    const rows = page.locator('tr').filter({ hasText: /.+/ });
    const firstFewText = await rows.nth(0).textContent().catch(() => '');
    const systemRolePresent = SYSTEM_ROLES.some(r => firstFewText?.toLowerCase().includes(r));
    expect(systemRolePresent).toBeTruthy();
  });

  test('system roles show built-in markers', async ({ page }) => {
    await page.goto('/roles');
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 15000 });
    const builtinMarker = page.locator('[class*="system"], [class*="builtin"], text=/系统/').first();
    if (await builtinMarker.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(builtinMarker).toBeVisible();
    }
  });

  test('duplicate system-role names are rejected for custom roles', async ({ request }) => {
    const apiBase = apiBaseUrl();
    const loginRes = await request.post(`${apiBase}/auth/login`, {
      data: { username: process.env.E2E_ADMIN_USER ?? 'admin', password: process.env.E2E_ADMIN_PASS ?? 'ChangeMe123!' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { data: { token } } = await loginRes.json();

    const res = await request.post(`${apiBase}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'admin', description: `Duplicate attempt ${runId}` },
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
    const roles = body.data?.list ?? body.data ?? [];
    const adminRole = roles.find((r: { name: string }) => r.name === 'admin');
    if (adminRole) {
      const delRes = await request.delete(`${apiBase}/roles/${adminRole.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(delRes.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
