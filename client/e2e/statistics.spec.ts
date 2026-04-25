import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { getCredentials } from './fixtures/task-fixtures';

test.describe('数据分析大屏', () => {
  test.beforeEach(async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(adminUser, adminPass);
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  });

  test('管理员可以访问数据分析大屏', async ({ page }) => {
    await page.goto('/statistics/dashboard');
    await expect(page.locator('h2:has-text("数据分析大屏")')).toBeVisible();
  });

  test('显示时间范围切换按钮', async ({ page }) => {
    await page.goto('/statistics/dashboard');
    await expect(page.locator('.el-radio-button:has-text("今天")').first()).toBeVisible();
    await expect(page.locator('.el-radio-button:has-text("本周")').first()).toBeVisible();
    await expect(page.locator('.el-radio-button:has-text("本月")').first()).toBeVisible();
  });

  test('切换时间范围后图表更新', async ({ page }) => {
    await page.goto('/statistics/dashboard');
    await page.locator('.el-radio-button:has-text("本周")').first().click();
    await page.waitForTimeout(2000);
    await expect(page.locator('.chart-container').first()).toBeVisible();
  });

  test('显示刷新按钮', async ({ page }) => {
    await page.goto('/statistics/dashboard');
    await expect(page.locator('button:has-text("刷新")').first()).toBeVisible();
  });
});
