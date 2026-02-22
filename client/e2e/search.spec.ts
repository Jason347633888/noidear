import { test, expect } from '@playwright/test';

test.describe('高级搜索功能', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[type="password"]', '12345678');
    await page.click('button:has-text("登录")');
    await page.waitForURL('/dashboard');
  });

  test('用户可以进行全文搜索', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('h2:has-text("高级搜索")')).toBeVisible();

    await page.fill('input[placeholder*="关键词"]', '操作规程');
    await page.click('button:has-text("搜索")');

    await expect(page.locator('.result-list, .no-results')).toBeVisible({ timeout: 10000 });
  });

  test('用户可以使用高级筛选', async ({ page }) => {
    await page.goto('/search');
    await page.fill('input[placeholder*="关键词"]', '文件');

    const typeSelect = page.locator('.el-select').first();
    await typeSelect.click();
    await page.click('.el-select-dropdown__item:has-text("一级文件")');

    await page.click('button:has-text("搜索")');
    await expect(page.locator('.result-list, .no-results')).toBeVisible({ timeout: 10000 });
  });

  test('搜索历史记录正常工作', async ({ page }) => {
    await page.goto('/search');
    await page.fill('input[placeholder*="关键词"]', '测试关键词');
    await page.click('button:has-text("搜索")');

    await page.reload();
    await expect(page.locator('.history-tag')).toBeVisible();
  });

  test('热门搜索词点击搜索', async ({ page }) => {
    await page.goto('/search');
    const hotTag = page.locator('.hot-tag').first();
    await expect(hotTag).toBeVisible();
    await hotTag.click();

    await expect(page.locator('.result-list, .no-results')).toBeVisible({ timeout: 10000 });
  });

  test('点击搜索结果跳转到文档详情', async ({ page }) => {
    await page.goto('/search');
    await page.fill('input[placeholder*="关键词"]', '规程');
    await page.click('button:has-text("搜索")');

    const firstResult = page.locator('.result-item').first();
    if (await firstResult.isVisible()) {
      await firstResult.click();
      await expect(page.url()).toContain('/documents/');
    }
  });
});
