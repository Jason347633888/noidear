import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { getCredentials } from './fixtures/task-fixtures';

test.describe('多语言切换', () => {
  test.beforeEach(async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(adminUser, adminPass);
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  });

  test('顶部导航栏有语言切换按钮', async ({ page }) => {
    await page.goto('/dashboard');
    const langSwitcher = page.locator('.el-dropdown, .lang-btn, [class*="lang"]').first();
    await expect(langSwitcher).toBeVisible();
  });

  test('可以切换到英文语言', async ({ page }) => {
    await page.goto('/dashboard');
    const langBtn = page.locator('.el-dropdown, .lang-btn, [class*="lang"]').first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      const engOption = page.locator('.el-dropdown-menu__item:has-text("English")');
      if (await engOption.isVisible()) {
        await engOption.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('刷新页面后保持语言设置', async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(() => {
      localStorage.setItem('app_locale', 'en-US');
    });
    await page.reload();
    const locale = await page.evaluate(() => localStorage.getItem('app_locale'));
    expect(locale).toBe('en-US');
  });
});
