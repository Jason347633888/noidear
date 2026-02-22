import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getCredentials } from './fixtures/task-fixtures';
import { ApprovalPendingPage } from './pages/ApprovalPendingPage';

/**
 * Scenario 2: Document rejection flow - reject a document and verify resubmission.
 *
 * Prerequisites:
 * - Backend running with seeded data
 */

test.describe('Document Rejection Flow', () => {
  test('S-REJ-1: reject dialog enforces minimum reason length', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const pendingPage = new ApprovalPendingPage(page);
    await pendingPage.goto();
    await pendingPage.waitForLoaded();

    const rowCount = await pendingPage.getRowCount();
    if (rowCount > 0) {
      await pendingPage.clickRejectOnRow(0);
      const dialog = page.locator('.el-dialog').filter({ hasText: '驳回申请' });
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Verify the confirm button is disabled with short reason
      const confirmBtn = dialog.locator('.el-button--danger');
      await expect(confirmBtn).toBeDisabled();

      // Type short text
      await dialog.locator('textarea').fill('short');
      await expect(confirmBtn).toBeDisabled();

      // Type valid length text
      await dialog.locator('textarea').fill('This reason is long enough to pass validation');
      await expect(confirmBtn).toBeEnabled();
    }
  });

  test('S-REJ-2: reject dialog can be cancelled', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const pendingPage = new ApprovalPendingPage(page);
    await pendingPage.goto();
    await pendingPage.waitForLoaded();

    const rowCount = await pendingPage.getRowCount();
    if (rowCount > 0) {
      await pendingPage.clickRejectOnRow(0);
      const dialog = page.locator('.el-dialog').filter({ hasText: '驳回申请' });
      await expect(dialog).toBeVisible({ timeout: 5000 });

      await dialog.locator('.el-button').filter({ hasText: '取消' }).click();
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('S-REJ-3: char counter shows current length', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const pendingPage = new ApprovalPendingPage(page);
    await pendingPage.goto();
    await pendingPage.waitForLoaded();

    const rowCount = await pendingPage.getRowCount();
    if (rowCount > 0) {
      await pendingPage.clickRejectOnRow(0);
      const dialog = page.locator('.el-dialog').filter({ hasText: '驳回申请' });
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Verify char counter exists
      const charCount = dialog.locator('.char-count');
      await expect(charCount).toBeVisible();
      await expect(charCount).toContainText('/500');
    }
  });
});
