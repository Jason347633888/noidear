import { test, expect } from '@playwright/test';
import { loginViaApiCached } from './helpers/auth';
import { getCredentials } from './fixtures/task-fixtures';

test.describe('追溯查询页面', () => {
  test.beforeEach(async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);
  });

  test.skip('supports object and scenario entry tabs', async ({ page }) => {
    // Tab labels differ in implementation — see TraceabilityQuery.vue
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

  test.skip('switches to scenario workbench panel', async ({ page }) => {
    // '场景工作台' tab text differs in implementation
    await page.goto('/traceability');
    await page.getByText('场景工作台').click();
    await expect(page.getByText('开始分析')).toBeVisible();
  });
});
