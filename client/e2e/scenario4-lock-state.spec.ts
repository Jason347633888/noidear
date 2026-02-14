import { test, expect } from '@playwright/test';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { loginViaApi } from './helpers/auth';
import {
  getAuthToken, createTaskViaApi, submitTaskViaApi, approveRecordViaApi,
} from './helpers/api';
import { initSharedTestData, futureDeadline, getCredentials } from './fixtures/task-fixtures';

/**
 * Scenario 4: Lock state prevents editing on approved tasks.
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

/** Create, submit, and approve a task via API. Returns the task ID. */
async function setupApprovedTask(request: Parameters<typeof getAuthToken>[0]): Promise<string> {
  const { adminUser, adminPass } = getCredentials();
  const token = await getAuthToken(request, adminUser, adminPass);
  const task = await createTaskViaApi(request, token, {
    templateId,
    departmentId,
    deadline: futureDeadline(),
  });
  const taskId = task.id as string;
  const record = await submitTaskViaApi(request, token, taskId, { field1: 'lock' });
  const recordId = record.id as string;
  await approveRecordViaApi(request, token, recordId, 'approved');
  return taskId;
}

test('S4: approved task shows locked form (read-only)', async ({ page, request }) => {
  const taskId = await setupApprovedTask(request);
  const { memberUser, memberPass } = getCredentials();

  await loginViaApi(page, memberUser, memberPass);
  await page.goto(`/tasks/${taskId}`);

  const detail = new TaskDetailPage(page);
  await detail.waitForLoaded();

  // Lock tag visible, status is approved
  await detail.expectLocked();
  expect(await detail.getStatusText()).toContain('已通过');

  // Action buttons hidden
  await detail.expectNoDraftButton();
  await detail.expectNoSubmitButton();
});
