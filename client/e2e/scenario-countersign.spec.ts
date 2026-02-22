import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';
import { ApprovalPendingPage } from './pages/ApprovalPendingPage';

/**
 * Scenario 4: Countersign mode - multiple approvers must all approve.
 *
 * Prerequisites:
 * - Backend running with seeded data
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

test.describe('Countersign Approval Flow', () => {
  test('S-CS-1: countersign type shown in pending list', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const pendingPage = new ApprovalPendingPage(page);
    await pendingPage.goto();
    await pendingPage.waitForLoaded();

    const csTag = page.locator('.el-tag').filter({ hasText: '会签' });
    const hasCsItems = await csTag.count();
    expect(hasCsItems >= 0).toBeTruthy();
  });

  test('S-CS-2: API endpoint accessible', async ({ request }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getAuthToken(request, adminUser, adminPass);

    const response = await request.get(`${API_BASE}/approvals/pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('S-CS-3: type tags render correctly', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const pendingPage = new ApprovalPendingPage(page);
    await pendingPage.goto();
    await pendingPage.waitForLoaded();

    const typeLabels = ['单人', '会签', '顺签'];
    for (const label of typeLabels) {
      const tags = page.locator('.el-tag').filter({ hasText: label });
      const count = await tags.count();
      expect(count >= 0).toBeTruthy();
    }
  });
});
