import { test, expect } from '@playwright/test';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { loginViaApi } from './helpers/auth';
import { getAuthToken, createTaskViaApi, submitTaskViaApi } from './helpers/api';
import { initSharedTestData, futureDeadline, getCredentials } from './fixtures/task-fixtures';

/**
 * Scenario 3: Task approval flow.
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

async function setupSubmittedTask(request: Parameters<typeof getAuthToken>[0]) {
  const { adminUser, adminPass } = getCredentials();
  const token = await getAuthToken(request, adminUser, adminPass);
  const task = await createTaskViaApi(request, token, {
    templateId,
    departmentId,
    deadline: futureDeadline(),
  });
  await submitTaskViaApi(request, token, task.id as string, { field1: 'test' });
  return task.id as string;
}

test('S3: admin approves a submitted task record', async ({ page, request }) => {
  const taskId = await setupSubmittedTask(request);
  const { adminUser, adminPass } = getCredentials();
  await loginViaApi(page, adminUser, adminPass);
  await page.goto(`/tasks/${taskId}`);

  const detailPage = new TaskDetailPage(page);
  await detailPage.waitForLoaded();

  expect(await detailPage.hasRecordWithStatus('待审批')).toBeTruthy();
  await detailPage.approveFirstRecord();
  await detailPage.expectSuccessMessage();
  await detailPage.waitForLoaded();
  expect(await detailPage.hasRecordWithStatus('已通过')).toBeTruthy();
});
