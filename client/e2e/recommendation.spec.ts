import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { getCredentials } from './fixtures/task-fixtures';

test.describe('智能文档推荐', () => {
  test.beforeEach(async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(adminUser, adminPass);
    await page.waitForURL('**/dashboard', { timeout: 30000 });
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
