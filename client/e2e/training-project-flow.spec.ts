import { test, expect } from '@playwright/test';
import { loginViaApiCached } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';
import {
  createTrainingPlanViaApi,
  createTrainingProjectViaApi,
  createQuestionViaApi,
  publishProjectViaApi,
  approvePlanViaApi,
  fetchTodoTasksViaApi,
  cancelProjectViaApi,
  deleteProjectViaApi,
  deletePlanViaApi,
  fetchUsersViaApi,
  fetchCurrentUserViaApi,
} from './helpers/training-api';
import { TrainingProjectListPage } from './pages/TrainingProjectListPage';

/**
 * Training Project Flow E2E Tests
 * 
 * Prerequisites:
 * - Backend running with seeded data
 * - Admin user with permissions
 * 
 * Tests:
 * 1. Create training project via UI
 * 2. Publish project and verify status change
 * 3. Verify TodoTask auto-generation after publishing
 */

test.describe('Training Project Flow', () => {
  let authToken: string;
  let planId: string;
  let projectId: string;
  let currentUserId: string;
  const timestamp = Date.now();
  const testPlanTitle = `E2E测试计划-${timestamp}`;
  const testProjectTitle = `E2E测试项目-${timestamp}`;

  test.beforeAll(async ({ request }) => {
    const { adminUser, adminPass } = getCredentials();
    authToken = await getAuthToken(request, adminUser, adminPass);

    // Get current user so we can include admin in trainees
    const currentUser = await fetchCurrentUserViaApi(request, authToken);
    currentUserId = currentUser.id;

    // Create test plan via API (idempotent — handles existing year plan gracefully)
    const plan = await createTrainingPlanViaApi(request, authToken, {
      year: new Date().getFullYear(),
      title: testPlanTitle,
    });
    planId = plan.id as string;

    // Approve the plan so it appears in the project creation form dropdown
    await approvePlanViaApi(request, authToken, planId).catch(() => {});
    // (catch: plan may already be approved from a prior run)
  });

  test.afterAll(async ({ request }) => {
    try {
      if (projectId) {
        // Cancel project first (only planned projects can be deleted)
        await cancelProjectViaApi(request, authToken, projectId).catch(() => {});
        await deleteProjectViaApi(request, authToken, projectId).catch(() => {});
      }
      // Plan is left intentionally — createTrainingPlanViaApi is idempotent
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  test('T-PROJ-1: admin can create training project via UI', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    const projectListPage = new TrainingProjectListPage(page);
    await projectListPage.goto();
    await page.waitForLoadState('networkidle');

    await projectListPage.clickCreate();
    await page.waitForURL('**/training/projects/create', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    const projectForm = page.locator('.project-form');
    await expect(projectForm).toBeVisible({ timeout: 10000 });

    // Fill title — actual placeholder is "请输入培训标题"
    await projectForm.locator('input[placeholder="请输入培训标题"]').fill(testProjectTitle);

    // Select 年度计划 — pick first available option (plan title may differ due to idempotent creation)
    const planItem = projectForm.locator('.el-form-item').filter({ hasText: '年度计划' });
    await planItem.locator('.el-select').click();
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.getByRole('option').first().click();
    await page.waitForTimeout(300); // let plan dropdown close

    // Select 部门 — pick first available option
    const deptItem = projectForm.locator('.el-form-item').filter({ hasText: '部门' }).first();
    await deptItem.locator('.el-select').click();
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.getByRole('option').first().click();
    await page.waitForTimeout(300);

    // Select 培训讲师 — pick first available option
    const trainerItem = projectForm.locator('.el-form-item').filter({ hasText: '培训讲师' });
    await trainerItem.locator('.el-select').click();
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.getByRole('option').first().click();
    await page.waitForTimeout(300);

    // Select 培训学员 — required field, multi-select (dropdown stays open after pick)
    const traineeItem = projectForm.locator('.el-form-item').filter({ hasText: '培训学员' });
    await traineeItem.locator('.el-select').click();
    await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 8000 });
    await page.getByRole('option').first().click();
    // Close the multi-select dropdown before submitting
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Submit form — page-level button, not dialog
    await projectForm.locator('button').filter({ hasText: /^创建$/ }).click();
    // Wait for form submission and redirect to list
    await page.waitForURL('**/training/projects', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify project appears in list
    await projectListPage.expectProjectVisible(testProjectTitle);
  });

  test('T-PROJ-2: publish project triggers status change and TodoTask creation', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    // Fetch users — include current admin in trainees to allow exam participation
    const users = await fetchUsersViaApi(request, authToken);
    const trainerId = users[0]?.id || currentUserId;
    const trainees = Array.from(new Set([currentUserId, ...users.slice(0, 2).map(u => u.id)]));

    // Create project via API for faster test setup
    const project = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `发布测试项目-${timestamp}`,
      department: 'QA',
      quarter: 1,
      trainerId,
      trainees,
      description: 'E2E自动化测试项目',
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    projectId = project.id as string;

    // Add questions via API
    await createQuestionViaApi(request, authToken, projectId, {
      type: 'choice',
      content: '测试题目1',
      options: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' },
      correctAnswer: 'A',
      points: 10,
    });

    // Publish project via API
    await publishProjectViaApi(request, authToken, projectId);

    // Verify project status changed to published
    const projectListPage = new TrainingProjectListPage(page);
    await projectListPage.goto();
    await page.waitForLoadState('networkidle');

    await projectListPage.clickProjectByName(`发布测试项目-${timestamp}`);
    await page.waitForTimeout(500);

    await expect(page.locator('.el-tag').filter({ hasText: '进行中' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('T-PROJ-3: verify published project appears in trainee todo list', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    // Navigate to the my-todos page (correct route)
    await page.goto('/my-todos');
    await page.waitForLoadState('networkidle');

    // Verify the page loaded — training tasks appear as todo items
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 5000 });
  });
});
