import { test, expect } from '@playwright/test';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { loginViaApi } from './helpers/auth';
import { getAuthToken, createTaskViaApi } from './helpers/api';
import { initSharedTestData, futureDeadline, getCredentials } from './fixtures/task-fixtures';

/**
 * Scenario 2: Save draft and resume later.
 *
 * All credentials loaded lazily from environment variables.
 * See .env.e2e.example for required variables.
 */

let templateId: string;
let departmentId: string;

test.beforeAll(async ({ request }) => {
  const data = await initSharedTestData(request);
  templateId = data.templateId;
  departmentId = data.departmentId;
});

/** Check whether any form input contains the given text. */
async function anyInputContains(detailPage: TaskDetailPage, text: string): Promise<boolean> {
  const formInputs = detailPage.getFormInputs();
  const count = await formInputs.count();
  for (let i = 0; i < count; i++) {
    const val = await formInputs.nth(i).inputValue().catch(() => '');
    if (val.includes(text)) return true;
  }
  return false;
}

test('S2: member saves draft, navigates away, and resumes', async ({ page, request }) => {
  const { adminUser, adminPass, memberUser, memberPass } = getCredentials();
  const token = await getAuthToken(request, adminUser, adminPass);
  const task = await createTaskViaApi(request, token, {
    templateId,
    departmentId,
    deadline: futureDeadline(),
  });

  await loginViaApi(page, memberUser, memberPass);
  await page.goto(`/tasks/${task.id}`);

  const detailPage = new TaskDetailPage(page);
  await detailPage.waitForLoaded();

  await detailPage.fillFormWithDummyData('Draft-Test');
  await detailPage.clickSaveDraft();
  await detailPage.expectSuccessMessage();

  // Navigate away then back
  await page.goto('/tasks');
  await page.waitForLoadState('networkidle');
  await page.goto(`/tasks/${task.id}`);
  await detailPage.waitForLoaded();

  // Verify draft data restored
  const found = await anyInputContains(detailPage, 'Draft-Test');
  expect(found).toBeTruthy();
});
