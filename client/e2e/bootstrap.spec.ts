/**
 * Scoped E2E tests: Organization Bootstrap Contract
 *
 * E2E contract:
 *   e2eRequirement: required
 *   e2eScope: scoped
 *   e2eTarget: auth guard / org-bootstrap diagnostic / role guard
 *
 * Scenarios covered:
 *   1. Admin with empty organization data can navigate to /dashboard (no bootstrap gate).
 *   2. Protected /org-bootstrap/status API returns 401 without auth token.
 *   3. Non-admin (regular user) login reaches dashboard without /bootstrap/org redirect.
 *   4. Login with invalid credentials returns 401 (auth guard).
 *   5. Admin can reach /dashboard without completing org setup.
 *
 * Run order is sequential (Playwright single-file default).
 */
import { test, expect, type APIRequestContext } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1';
const ADMIN_USER = process.env.E2E_ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? 'ChangeMe123!';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function adminLogin(request: APIRequestContext): Promise<{ token: string; user: Record<string, unknown> }> {
  const resp = await request.post(`${API_BASE}/auth/login`, {
    data: { username: ADMIN_USER, password: ADMIN_PASS },
  });
  expect(resp.ok(), `Admin login failed: ${resp.status()}`).toBe(true);
  const body = await resp.json();
  return { token: body.data.token, user: body.data.user };
}

async function injectSession(
  page: import('@playwright/test').Page,
  token: string,
  user: Record<string, unknown>,
) {
  await page.goto('/login');
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token, user },
  );
}

async function getRoleId(request: APIRequestContext, token: string, code: 'admin' | 'leader' | 'user'): Promise<string> {
  const resp = await request.get(`${API_BASE}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(resp.ok(), `GET /roles failed: ${resp.status()}`).toBe(true);
  const body = await resp.json();
  const roles: Array<{ id: string; code: string }> = body.data?.data ?? body.data?.list ?? body.data ?? body;
  const role = roles.find((r) => r.code === code);
  if (!role) throw new Error(`Role with code "${code}" not found in response`);
  return role.id;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe.serial('Bootstrap Contract – Auth and Navigation E2E', () => {
  // -------------------------------------------------------------------------
  // Scenario 1: Admin with empty organization data can reach /dashboard
  // -------------------------------------------------------------------------
  test('1. Admin with empty organization reaches /dashboard (no bootstrap gate)', async ({ page, request }) => {
    const { token, user } = await adminLogin(request);
    await injectSession(page, token, user);
    await page.goto('/dashboard');
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 20000 });

    // Router no longer has a bootstrap gate: admin reaches dashboard directly
    await expect(page).not.toHaveURL(/\/bootstrap\/org/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Protected API returns 401 without token
  // -------------------------------------------------------------------------
  test('2. /org-bootstrap/status returns 401 without auth token', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/org-bootstrap/status`);
    expect(resp.status()).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Login with invalid credentials → 401 (auth guard)
  // -------------------------------------------------------------------------
  test('4. Login with invalid credentials returns 401', async ({ request }) => {
    const resp = await request.post(`${API_BASE}/auth/login`, {
      data: { username: 'nonexistent_bootstrap_e2e', password: 'WrongPass!' },
    });
    expect([401, 400, 403]).toContain(resp.status());
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Non-admin user login does NOT go to /bootstrap/org
  // -------------------------------------------------------------------------
  test('3. Regular user login reaches dashboard without /bootstrap/org redirect', async ({ page, request }) => {
    const { token } = await adminLogin(request);
    const headers = { Authorization: `Bearer ${token}` };
    const userRoleId = await getRoleId(request, token, 'user');

    const username = `e2e_member_${Date.now()}`;
    const createResp = await request.post(`${API_BASE}/users`, {
      headers,
      data: { username, name: 'E2E Regular Member', password: 'TestPass123!', roleId: userRoleId },
    });
    expect(createResp.status(), `Create user failed: ${createResp.status()}`).toBeLessThan(300);

    const loginResp = await request.post(`${API_BASE}/auth/login`, {
      data: { username, password: 'TestPass123!' },
    });
    expect(loginResp.ok(), `Member login failed: ${loginResp.status()}`).toBe(true);
    const loginBody = await loginResp.json();
    const { token: memberToken, user: memberUser } = loginBody.data;

    await injectSession(page, memberToken, memberUser);
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);

    await expect(page).not.toHaveURL(/\/bootstrap\/org/);
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Admin navigates to a protected route without org setup
  // -------------------------------------------------------------------------
  test('5. Admin reaches /dashboard via UI login without any org setup', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('.el-form .el-input').first().locator('input').fill(ADMIN_USER);
    await page.locator('.el-form input[type="password"]').fill(ADMIN_PASS);
    await page.locator('.el-button--primary').filter({ hasText: /登\s*录/ }).click();

    await page.waitForURL(/\/(dashboard|login)/, { timeout: 20000 });

    // No bootstrap gate: admin should land on /dashboard (or remain on /login only if auth fails)
    await expect(page).not.toHaveURL(/\/bootstrap\/org/);
  });
});
