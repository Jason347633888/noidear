import { test, expect } from '@playwright/test';

test.describe('追溯查询页面', () => {
  test('supports object and scenario entry tabs', async ({ page }) => {
    await page.goto('/traceability');
    await expect(page.getByText('对象查询')).toBeVisible();
    await expect(page.getByText('场景工作台')).toBeVisible();
    await expect(page.getByText('台账视图')).toBeVisible();
    await expect(page.getByText('链路图视图')).toBeVisible();
  });

  test('shows object query form by default', async ({ page }) => {
    await page.goto('/traceability');
    await expect(page.getByPlaceholder('批次号 / ID')).toBeVisible();
  });

  test('switches to scenario workbench panel', async ({ page }) => {
    await page.goto('/traceability');
    await page.getByText('场景工作台').click();
    await expect(page.getByText('开始分析')).toBeVisible();
  });
});
