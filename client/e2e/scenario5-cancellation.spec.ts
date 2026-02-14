import { test, expect } from '@playwright/test';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { TaskListPage } from './pages/TaskListPage';
import { loginViaApi } from './helpers/auth';
import { getAuthToken, createTaskViaApi, fetchTaskDetail } from './helpers/api';
import { initSharedTestData, futureDeadline, getCredentials } from './fixtures/task-fixtures';

/**
 * Scenario 5: Task cancellation.
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

/** Create a pending task via API. Returns task ID. */
async function setupPendingTask(request: Parameters<typeof getAuthToken>[0]): Promise<string> {
  const { adminUser, adminPass } = getCredentials();
  const token = await getAuthToken(request, adminUser, adminPass);
  const task = await createTaskViaApi(request, token, {
    templateId,
    departmentId,
    deadline: futureDeadline(),
  });
  return task.id as string;
}

test('S5-a: admin cancels a pending task from detail page', async ({ page, request }) => {
  const taskId = await setupPendingTask(request);
  const { adminUser, adminPass } = getCredentials();

  await loginViaApi(page, adminUser, adminPass);
  await page.goto(`/tasks/${taskId}`);

  const detail = new TaskDetailPage(page);
  await detail.waitForLoaded();
  expect(await detail.getStatusText()).toContain('待填报');

  await detail.clickCancelTask();
  await detail.confirmDialog();
  await detail.expectSuccessMessage();
  await detail.waitForLoaded();

  expect(await detail.getStatusText()).toContain('已取消');
  await detail.expectLocked();
  await detail.expectNoDraftButton();
  await detail.expectNoSubmitButton();
});

test('S5-b: admin cancels task from task list page', async ({ page, request }) => {
  const taskId = await setupPendingTask(request);
  const { adminUser, adminPass } = getCredentials();
  const taskIdPrefix = taskId.slice(0, 8);

  await loginViaApi(page, adminUser, adminPass);
  await page.goto('/tasks');

  const listPage = new TaskListPage(page);
  await listPage.waitForTableLoaded();

  const targetRow = listPage.getRowByText(taskIdPrefix);
  await expect(targetRow.first()).toBeVisible({ timeout: 10000 });

  await listPage.clickCancelOnRow(targetRow.first());
  await listPage.confirmDialog();

  const successMsg = page.locator('.el-message--success');
  await expect(successMsg).toBeVisible({ timeout: 10000 });
  await listPage.waitForTableLoaded();

  // Verify via API
  const token = await getAuthToken(request, adminUser, adminPass);
  const updated = await fetchTaskDetail(request, token, taskId);
  expect(updated.status).toBe('cancelled');
});
