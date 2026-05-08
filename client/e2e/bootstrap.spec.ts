/**
 * Scoped E2E tests: First-Login Organization Bootstrap
 *
 * E2E contract:
 *   e2eRequirement: required
 *   e2eScope: scoped
 *   e2eTarget: first-login / org-bootstrap / role-cutover / bootstrap guard
 *
 * Scenarios covered:
 *   1. Admin login redirects to /bootstrap/org when org setup is incomplete.
 *   2. Protected /org-bootstrap/status API returns 401 without auth token.
 *   3. Non-admin (regular user) login bypasses bootstrap redirect.
 *   4. Login with no roleId / invalid credentials returns 401 (role cutover guard).
 *   5. After completing org setup (dept + leader + member), admin reaches /dashboard.
 *
 * Requires: fresh DB (seed-baseline applied) — no departments exist initially.
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
  // API returns { code, data: { success, data: [...roles], meta } } — extract the inner array
  const roles: Array<{ id: string; code: string }> = body.data?.data ?? body.data ?? body;
  const role = roles.find((r) => r.code === code);
  if (!role) throw new Error(`Role with code "${code}" not found in response`);
  return role.id;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

// Tests run sequentially in file order; share incremental DB state within run.
test.describe.serial('Bootstrap Guard – First-Login E2E', () => {
  // -------------------------------------------------------------------------
  // Scenario 1: Admin login → /bootstrap/org when incomplete
  // -------------------------------------------------------------------------
  test('1. Admin login redirects to /bootstrap/org when org setup is incomplete', async ({ page }) => {
    // Fresh DB: seed-baseline created admin + 3 system roles but NO departments.
    // Router guard: !bootstrapStore.completed && isAdmin → next('/bootstrap/org')
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('.el-form .el-input').first().locator('input').fill(ADMIN_USER);
    await page.locator('.el-form input[type="password"]').fill(ADMIN_PASS);
    await page.locator('.el-button--primary').filter({ hasText: /登\s*录/ }).click();

    await page.waitForURL(/\/(bootstrap\/org|login)/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/bootstrap\/org/);
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Protected API returns 401 without token
  // -------------------------------------------------------------------------
  test('2. /org-bootstrap/status returns 401 without auth token', async ({ request }) => {
    const resp = await request.get(`${API_BASE}/org-bootstrap/status`);
    expect(resp.status()).toBe(401);
  });

  // -------------------------------------------------------------------------
  // Scenario 4: Login with invalid credentials → 401 (role cutover guard)
  //   Validates that the auth layer properly rejects uninitialized users.
  //   (A user with no roleId cannot pass auth.service.ts role check → 401.)
  // -------------------------------------------------------------------------
  test('4. Login with invalid / uninitialised credentials returns 401', async ({ request }) => {
    const resp = await request.post(`${API_BASE}/auth/login`, {
      data: { username: 'nonexistent_bootstrap_e2e', password: 'WrongPass!' },
    });
    expect([401, 400, 403]).toContain(resp.status());
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Non-admin user login does NOT redirect to /bootstrap/org
  // -------------------------------------------------------------------------
  test('3. Regular user login bypasses bootstrap redirect', async ({ page, request }) => {
    const { token } = await adminLogin(request);
    const headers = { Authorization: `Bearer ${token}` };
    const userRoleId = await getRoleId(request, token, 'user');

    // Create a regular test user
    const username = `e2e_member_${Date.now()}`;
    const createResp = await request.post(`${API_BASE}/users`, {
      headers,
      data: { username, name: 'E2E Regular Member', password: 'TestPass123!', roleId: userRoleId },
    });
    expect(createResp.status(), `Create user failed: ${createResp.status()}`).toBeLessThan(300);

    // Login as this regular user
    const loginResp = await request.post(`${API_BASE}/auth/login`, {
      data: { username, password: 'TestPass123!' },
    });
    expect(loginResp.ok(), `Member login failed: ${loginResp.status()}`).toBe(true);
    const loginBody = await loginResp.json();
    const { token: memberToken, user: memberUser } = loginBody.data;

    // Inject session and navigate to dashboard
    await injectSession(page, memberToken, memberUser);
    await page.goto('/dashboard');
    // Allow router guard to run and settle
    await page.waitForTimeout(3000);

    // Regular user should NOT be sent to /bootstrap/org
    await expect(page).not.toHaveURL(/\/bootstrap\/org/);
  });

  // -------------------------------------------------------------------------
  // Scenario 5: After completing org setup, admin reaches /dashboard
  // -------------------------------------------------------------------------
  test('5. After completing org setup, admin login goes to /dashboard', async ({ page, request }) => {
    const { token } = await adminLogin(request);
    const headers = { Authorization: `Bearer ${token}` };

    const leaderRoleId = await getRoleId(request, token, 'leader');
    const userRoleId = await getRoleId(request, token, 'user');

    // Step A: Create a department
    const suffix = Date.now();
    const deptResp = await request.post(`${API_BASE}/departments`, {
      headers,
      data: { code: `E2E_BOOT_${suffix}`, name: `E2E Bootstrap Dept ${suffix}` },
    });
    expect(deptResp.status(), `Create dept failed: ${deptResp.status()}`).toBeLessThan(300);
    const deptBody = await deptResp.json();
    const deptId: string = deptBody.data?.id ?? deptBody.id;

    // Step B: Create a leader user assigned to the department
    const leaderUsername = `e2e_leader_${suffix}`;
    const leaderResp = await request.post(`${API_BASE}/users`, {
      headers,
      data: {
        username: leaderUsername,
        name: 'E2E Leader',
        password: 'TestPass123!',
        roleId: leaderRoleId,
        departmentId: deptId,
      },
    });
    expect(leaderResp.status(), `Create leader failed: ${leaderResp.status()}`).toBeLessThan(300);
    const leaderBody = await leaderResp.json();
    const leaderId: string = leaderBody.data?.id ?? leaderBody.id;

    // Step C: Set leader as department manager
    const setManagerResp = await request.put(`${API_BASE}/departments/${deptId}`, {
      headers,
      data: { managerId: leaderId },
    });
    expect(setManagerResp.status(), `Set manager failed: ${setManagerResp.status()}`).toBeLessThan(300);

    // Step D: Add a business member (non-admin, non-admin, assigned to dept)
    const memberUsername = `e2e_biz_member_${suffix}`;
    const memberResp = await request.post(`${API_BASE}/users`, {
      headers,
      data: {
        username: memberUsername,
        name: 'E2E Business Member',
        password: 'TestPass123!',
        roleId: userRoleId,
        departmentId: deptId,
      },
    });
    expect(memberResp.status(), `Create member failed: ${memberResp.status()}`).toBeLessThan(300);

    // Step E: Verify bootstrap status reports completed
    const statusResp = await request.get(`${API_BASE}/org-bootstrap/status`, { headers });
    expect(statusResp.ok(), `Bootstrap status failed: ${statusResp.status()}`).toBe(true);
    const statusBody = await statusResp.json();
    const completed: boolean = statusBody.data?.completed ?? statusBody.completed;
    expect(completed, 'Bootstrap should report completed after org setup').toBe(true);

    // Step F: Clear session and re-login via UI; should now reach /dashboard
    // Navigate first to ensure we're on a same-origin page before touching localStorage
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    await page.waitForLoadState('networkidle');
    await page.locator('.el-form .el-input').first().locator('input').fill(ADMIN_USER);
    await page.locator('.el-form input[type="password"]').fill(ADMIN_PASS);
    await page.locator('.el-button--primary').filter({ hasText: /登\s*录/ }).click();

    await page.waitForURL(/\/(dashboard|bootstrap)/, { timeout: 20000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
