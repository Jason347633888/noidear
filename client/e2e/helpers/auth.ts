import { type Page } from '@playwright/test';

/**
 * Authentication helper for E2E tests.
 *
 * Uses the backend API directly to obtain a JWT token, then injects
 * it into localStorage so the frontend treats the session as logged in.
 * This is faster and more reliable than clicking through the login form
 * every time.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

interface LoginApiResponse {
  code: number;
  data: {
    token: string;
    user: {
      id: string;
      username: string;
      name: string;
      role: string;
      departmentId: string | null;
    };
  };
}

/**
 * Login via the backend API and inject the token into the page's localStorage.
 * Returns the user object from the API response.
 */
export async function loginViaApi(
  page: Page,
  username: string,
  password: string,
): Promise<LoginApiResponse['data']> {
  const response = await page.request.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  });

  if (!response.ok()) {
    throw new Error(`Login API failed with status ${response.status()} for user "${username}"`);
  }

  const body = (await response.json()) as LoginApiResponse;
  const { token, user } = body.data;

  // Inject token and user into localStorage so the frontend picks it up
  await page.goto('/login');
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token, user },
  );

  return body.data;
}

/**
 * Login via the UI form. Slower but tests the actual login flow.
 */
export async function loginViaUi(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('.el-form .el-input').first().locator('input').fill(username);
  await page.locator('.el-form input[type="password"]').fill(password);
  await page.locator('.el-button--primary').filter({ hasText: /登\s*录/ }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/**
 * Logout by clearing localStorage and navigating to login.
 */
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
}
