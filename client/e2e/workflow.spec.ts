import { test, expect } from '@playwright/test';

test.describe('可视化工作流设计器', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder*="用户名"]', 'admin');
    await page.fill('input[type="password"]', '12345678');
    await page.click('button:has-text("登录")');
    await page.waitForURL('/dashboard');
  });

  test('管理员可以访问工作流设计器', async ({ page }) => {
    await page.goto('/workflow/designer');
    await expect(page.locator('text=可视化工作流设计器')).toBeVisible();
  });

  test('节点面板显示所有节点类型', async ({ page }) => {
    await page.goto('/workflow/designer');
    await expect(page.locator('.palette-node:has-text("开始节点")')).toBeVisible();
    await expect(page.locator('.palette-node:has-text("审批节点")')).toBeVisible();
    await expect(page.locator('.palette-node:has-text("条件节点")')).toBeVisible();
    await expect(page.locator('.palette-node:has-text("结束节点")')).toBeVisible();
  });

  test('点击预览按钮显示预览弹窗', async ({ page }) => {
    await page.goto('/workflow/designer');
    await page.click('button:has-text("预览")');
    await expect(page.locator('.el-dialog:has-text("工作流预览")')).toBeVisible();
  });
});
