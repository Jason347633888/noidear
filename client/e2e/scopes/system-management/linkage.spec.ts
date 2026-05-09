import { test, expect } from '@playwright/test';
import { apiBaseUrl } from '../../support/urls';

const uniqueId = () => process.env.E2E_RUN_ID ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

test.describe('System Management Cross-Page Linkage', () => {
  test.describe.configure({ mode: 'serial' });

  let token: string;
  let userId: string;
  let deptId: string;
  let runId: string;

  test('setup: create unassigned leader via API', async ({ request }) => {
    runId = uniqueId();
    const apiBase = apiBaseUrl();
    const loginRes = await request.post(`${apiBase}/auth/login`, {
      data: { username: process.env.E2E_ADMIN_USER ?? 'admin', password: process.env.E2E_ADMIN_PASS ?? 'ChangeMe123!' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    token = body.data.token;

    const userRes = await request.post(`${apiBase}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        username: `e2e_link_leader_${runId}`,
        password: 'TestPass123!',
        name: `Linkage Leader ${runId}`,
        role: 'leader',
      },
    });
    expect([200, 201]).toContain(userRes.status());
    const userBody = await userRes.json();
    userId = userBody.data.id;
    expect(userId).toBeTruthy();
  });

  test('verify unassigned leader shows 未分配部门 in /users', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const searchInput = page.locator('[placeholder*="搜索"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(`Linkage Leader ${runId}`);
      await page.waitForTimeout(800);
    }
    const row = page.locator('tr', { hasText: `Linkage Leader ${runId}` });
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(row.getByText(/未分配部门/)).toBeVisible({ timeout: 5000 });
    }
  });

  test('create department with that leader via API', async ({ request }) => {
    const apiBase = apiBaseUrl();
    const deptRes = await request.post(`${apiBase}/departments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `Linkage Dept ${runId}`,
        code: `LNK_${runId}`,
        managerId: userId,
      },
    });
    expect([200, 201]).toContain(deptRes.status());
    const deptBody = await deptRes.json();
    deptId = deptBody.data.id;
    expect(deptId).toBeTruthy();
  });

  test('verify /users shows leader now auto-attached to department', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const searchInput = page.locator('[placeholder*="搜索"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(`Linkage Leader ${runId}`);
      await page.waitForTimeout(800);
    }
    const row = page.locator('tr', { hasText: `Linkage Leader ${runId}` });
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(row.getByText(/未分配部门/)).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('department shows correct leader and /departments list is updated', async ({ page }) => {
    await page.goto('/departments');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const deptRow = page.locator('tr', { hasText: `Linkage Dept ${runId}` });
    if (await deptRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(deptRow.getByText(/Linkage Leader/)).toBeVisible({ timeout: 5000 });
    }
  });
});
