import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Login page (/login).
 *
 * Encapsulates all selectors and actions related to user authentication.
 */
export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('.el-form .el-input').first().locator('input');
    this.passwordInput = page.locator('.el-form input[type="password"]');
    this.loginButton = page.locator('.el-button--primary').filter({ hasText: /登\s*录/ });
    this.successMessage = page.locator('.el-message--success');
    this.errorMessage = page.locator('.el-message--error');
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async loginAndWaitForDashboard(username: string, password: string) {
    await this.login(username, password);
    await this.page.waitForURL('**/dashboard', { timeout: 15000 });
  }

  async expectLoginSuccess() {
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });
  }

  async expectLoginError() {
    await expect(this.errorMessage).toBeVisible({ timeout: 10000 });
  }
}
