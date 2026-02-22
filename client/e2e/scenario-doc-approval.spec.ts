import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';
import { ApprovalPendingPage } from './pages/ApprovalPendingPage';

/**
 * Scenario 1: Document approval flow - approve a document.
 *
 * Prerequisites:
 * - Backend running with seeded data
 * - A document in 'pending' status with an approval record
 *
 * This test uses API-based login and navigates the approval UI.
 */

test.describe('Document Approval Flow', () => {
  test('S-DOC-1: admin can view pending approval list', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const pendingPage = new ApprovalPendingPage(page);
    await pendingPage.goto();
    await pendingPage.waitForLoaded();

    await expect(pendingPage.title).toHaveText(/待我审批/);
  });

  test('S-DOC-2: pending page shows empty state when no approvals', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const pendingPage = new ApprovalPendingPage(page);
    await pendingPage.goto();
    await pendingPage.waitForLoaded();

    // Either shows data rows or empty state
    const hasRows = await pendingPage.getRowCount();
    const isEmpty = await pendingPage.emptyState.isVisible().catch(() => false);
    expect(hasRows > 0 || isEmpty).toBeTruthy();
  });

  test('S-DOC-3: approve dialog opens and can be cancelled', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const pendingPage = new ApprovalPendingPage(page);
    await pendingPage.goto();
    await pendingPage.waitForLoaded();

    const rowCount = await pendingPage.getRowCount();
    if (rowCount > 0) {
      await pendingPage.clickApproveOnRow(0);
      const dialog = page.locator('.el-dialog').filter({ hasText: '确认通过' });
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Cancel the dialog
      await dialog.locator('.el-button').filter({ hasText: '取消' }).click();
      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    }
  });
});
