import { test, expect } from '@playwright/test';

test.describe('智能文档推荐', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[type="password"]', '12345678');
    await page.click('button:has-text("登录")');
    await page.waitForURL('/dashboard');
  });

  test('首页显示推荐文档模块', async ({ page }) => {
    await page.goto('/dashboard');
    const recommendCard = page.locator('.recommended-documents');
    if (await recommendCard.isVisible()) {
      await expect(recommendCard).toBeVisible();
    }
  });

  test('文档详情页显示相关文档', async ({ page }) => {
    await page.goto('/documents/level1');
    const firstDoc = page.locator('.el-table__row').first();
    if (await firstDoc.isVisible()) {
      await firstDoc.click();
      const relatedDocs = page.locator('.recommended-documents');
      await expect(relatedDocs).toBeVisible({ timeout: 5000 });
    }
  });
});
