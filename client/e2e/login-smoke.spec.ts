import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { getCredentials } from './fixtures/task-fixtures';

/**
 * Login Flow: Smoke tests for authentication UI.
 *
 * All credentials loaded lazily from environment variables.
 * See .env.e2e.example for required variables.
 */

test('Login: admin can login via UI', async ({ page }) => {
  const { adminUser, adminPass } = getCredentials();
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(adminUser, adminPass);
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page).toHaveURL(/dashboard/);
});

test('Login: invalid credentials show error', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('nonexistent_user_e2e', 'wrongpassword99');
  await loginPage.expectLoginError();
  await expect(page).toHaveURL(/login/);
});
