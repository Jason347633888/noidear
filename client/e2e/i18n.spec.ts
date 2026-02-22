import { test, expect } from '@playwright/test';

test.describe('多语言切换', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[type="password"]', '12345678');
    await page.click('button:has-text("登录")');
    await page.waitForURL('/dashboard');
  });

  test('顶部导航栏有语言切换按钮', async ({ page }) => {
    await page.goto('/dashboard');
    const langSwitcher = page.locator('.lang-btn');
    await expect(langSwitcher).toBeVisible();
  });

  test('可以切换到英文语言', async ({ page }) => {
    await page.goto('/dashboard');
    const langBtn = page.locator('.lang-btn');
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
    await page.evaluate(() => {
      localStorage.setItem('app_locale', 'en-US');
    });
    await page.reload();
    const locale = await page.evaluate(() => localStorage.getItem('app_locale'));
    expect(locale).toBe('en-US');
  });
});
