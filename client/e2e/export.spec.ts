import { test, expect } from '@playwright/test';

test.describe('批量导出/导入功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[type="password"]', process.env.E2E_ADMIN_PASS || 'ChangeMe123!');
    await page.click('button:has-text("登 录")');
    await page.waitForURL('/dashboard', { timeout: 30000 });
  });

  test('管理员可以访问批量导出页面', async ({ page }) => {
    await page.goto('/admin/export');
    await expect(page.locator('h2:has-text("批量导出")')).toBeVisible();
  });

  test('管理员可以访问批量导入页面', async ({ page }) => {
    await page.goto('/admin/import');
    await expect(page.locator('h2:has-text("批量导入")')).toBeVisible();
  });

  test('批量导出页面显示导出类型选项', async ({ page }) => {
    await page.goto('/admin/export');
    await expect(page.locator('.el-radio-button:has-text("文档数据")').first()).toBeVisible();
    await expect(page.locator('.el-radio-button:has-text("用户数据")').first()).toBeVisible();
    await expect(page.locator('.el-button:has-text("开始导出")').first()).toBeVisible();
  });

  test('批量导入页面显示步骤向导', async ({ page }) => {
    await page.goto('/admin/import');
    await expect(page.locator('.el-steps')).toBeVisible();
    await expect(page.locator('.el-button:has-text("下载")').first()).toBeVisible();
  });
});
