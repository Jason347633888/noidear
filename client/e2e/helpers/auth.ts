import { type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Load .env.e2e if not already loaded
const envFile = path.resolve(process.cwd(), '.env.e2e');
if (fs.existsSync(envFile) && !process.env._E2E_ENV_LOADED) {
  fs.readFileSync(envFile, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (key && !key.startsWith('#') && rest.length > 0) {
        process.env[key.trim()] ??= rest.join('=').trim();
      }
    });
  process.env._E2E_ENV_LOADED = '1';
}

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

// Per-user token cache to avoid repeated logins (429 rate limit)
const userTokenCache = new Map<string, { token: string; user: LoginApiResponse['data']['user'] }>();

function loadGlobalToken(): { token: string; user: LoginApiResponse['data']['user'] } | null {
  try {
    const tokenPath = path.join('e2e', '.auth', 'admin-token.json');
    if (fs.existsSync(tokenPath)) {
      const data = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
      if (data.token && data.user) {
        return { token: data.token, user: data.user };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Login via the backend API and inject the token into the page's localStorage.
 * Returns the user object from the API response.
 * Retries on 429 rate limit.
 */
export async function loginViaApi(
  page: Page,
  username: string,
  password: string,
): Promise<LoginApiResponse['data']> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await page.request.post(`${API_BASE}/auth/login`, {
      data: { username, password },
    });

    if (response.ok()) {
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

    if (response.status() === 429) {
      const waitMs = (attempt + 1) * 2000;
      console.warn(`[loginViaApi] 429 on attempt ${attempt + 1}, waiting ${waitMs}ms...`);
      await new Promise((r) => setTimeout(r, waitMs));
      lastError = new Error(`Login API failed with status 429 for user "${username}"`);
      continue;
    }

    throw new Error(`Login API failed with status ${response.status()} for user "${username}"`);
  }

  throw lastError || new Error(`Login API failed after retries for user "${username}"`);
}

/**
 * 带缓存的 API 登录，避免重复请求触发限流（429）
 */
export async function loginViaApiCached(
  page: Page,
  username: string,
  password: string,
): Promise<LoginApiResponse['data']> {
  // Check per-user in-memory cache
  const cached = userTokenCache.get(username);
  if (cached) {
    await page.goto('/login');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      cached,
    );
    return cached;
  }

  // For admin, try the global-setup token file
  const globalToken = loadGlobalToken();
  if (globalToken && globalToken.user.username === username) {
    userTokenCache.set(username, globalToken);
    await page.goto('/login');
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      },
      globalToken,
    );
    return globalToken;
  }

  const result = await loginViaApi(page, username, password);
  userTokenCache.set(username, result);
  return result;
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
  await page.waitForURL('**/dashboard', { timeout: 30000 });
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
