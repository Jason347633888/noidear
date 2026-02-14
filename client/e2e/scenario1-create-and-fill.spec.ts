import { test, expect } from '@playwright/test';
import { TaskCreatePage } from './pages/TaskCreatePage';
import { TaskListPage } from './pages/TaskListPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { loginViaApi } from './helpers/auth';
import { getAuthToken, createTaskViaApi } from './helpers/api';
import { initSharedTestData, futureDeadline, getCredentials } from './fixtures/task-fixtures';

/**
 * Scenario 1: Admin creates task and department member fills it.
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

test('S1-a: admin creates a new task via UI', async ({ page }) => {
  const { adminUser, adminPass } = getCredentials();
  await loginViaApi(page, adminUser, adminPass);
  await page.goto('/tasks/create');
  await page.waitForLoadState('networkidle');

  const createPage = new TaskCreatePage(page);
  await createPage.selectFirstTemplate();
  await createPage.selectFirstDepartment();
  await createPage.setDeadlineToFuture();
  await createPage.clickSubmit();
  await createPage.expectCreateSuccess();
  await page.waitForURL('**/tasks', { timeout: 15000 });

  const listPage = new TaskListPage(page);
  await listPage.waitForTableLoaded();
  expect(await listPage.getRowCount()).toBeGreaterThan(0);
});

test('S1-b: member fills and submits the task', async ({ page, request }) => {
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
  expect(await detailPage.getStatusText()).toContain('待填报');
  await expect(detailPage.formCard).toBeVisible();

  await detailPage.fillFormWithDummyData('Scenario1');
  await detailPage.clickSubmit();
  await detailPage.expectSuccessMessage();
  await detailPage.waitForLoaded();
  expect(await detailPage.hasRecordWithStatus('待审批')).toBeTruthy();
});
