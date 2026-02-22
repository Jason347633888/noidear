import { test, expect } from '@playwright/test';

test.describe('数据分析大屏', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[type="password"]', '12345678');
    await page.click('button:has-text("登录")');
    await page.waitForURL('/dashboard');
  });

  test('管理员可以访问数据分析大屏', async ({ page }) => {
    await page.goto('/statistics/dashboard');
    await expect(page.locator('h2:has-text("数据分析大屏")')).toBeVisible();
  });

  test('显示时间范围切换按钮', async ({ page }) => {
    await page.goto('/statistics/dashboard');
    await expect(page.locator('button:has-text("今天")')).toBeVisible();
    await expect(page.locator('button:has-text("本周")')).toBeVisible();
    await expect(page.locator('button:has-text("本月")')).toBeVisible();
  });

  test('切换时间范围后图表更新', async ({ page }) => {
    await page.goto('/statistics/dashboard');
    await page.click('button:has-text("本周")');
    await page.waitForTimeout(2000);
    await expect(page.locator('.chart-container').first()).toBeVisible();
  });

  test('显示刷新按钮', async ({ page }) => {
    await page.goto('/statistics/dashboard');
    await expect(page.locator('button:has-text("刷新")')).toBeVisible();
  });
});
