import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';
import { 
  createTrainingPlanViaApi,
  createTrainingProjectViaApi,
  createQuestionViaApi,
  publishProjectViaApi,
  fetchTodoTasksViaApi,
  deleteProjectViaApi,
  deletePlanViaApi
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
  const timestamp = Date.now();
  const testPlanTitle = `E2E测试计划-${timestamp}`;
  const testProjectTitle = `E2E测试项目-${timestamp}`;

  test.beforeAll(async ({ request }) => {
    const { adminUser, adminPass } = getCredentials();
    authToken = await getAuthToken(request, adminUser, adminPass);

    // Create test plan via API
    const plan = await createTrainingPlanViaApi(request, authToken, {
      year: new Date().getFullYear(),
      title: testPlanTitle,
      departmentId: '1', // Assume department 1 exists from seed
      budget: 100000,
      status: 'approved',
    });
    planId = plan.id as string;
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: delete test project and plan
    try {
      if (projectId) {
        await deleteProjectViaApi(request, authToken, projectId);
      }
      if (planId) {
        await deletePlanViaApi(request, authToken, planId);
      }
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  test('T-PROJ-1: admin can create training project via UI', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const projectListPage = new TrainingProjectListPage(page);
    await projectListPage.goto();
    await page.waitForLoadState('networkidle');

    await projectListPage.clickCreate();
    await page.waitForTimeout(500);

    // Fill project form
    await page.locator('input[placeholder*="项目名称"]').fill(testProjectTitle);
    await page.locator('.el-select').filter({ hasText: '选择计划' }).click();
    await page.locator(`.el-select-dropdown__item`).filter({ hasText: testPlanTitle }).click();
    
    await page.locator('.el-select').filter({ hasText: '选择类型' }).click();
    await page.locator(`.el-select-dropdown__item`).filter({ hasText: '内部培训' }).click();

    // Fill dates
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    await page.locator('input[placeholder*="开始日期"]').fill(today.toISOString().split('T')[0]);
    await page.locator('input[placeholder*="结束日期"]').fill(nextWeek.toISOString().split('T')[0]);

    // Submit form
    await page.locator('.el-dialog').locator('button').filter({ hasText: /确定|保存/ }).click();
    await page.waitForTimeout(1000);

    // Verify project appears in list
    await projectListPage.expectProjectVisible(testProjectTitle);
  });

  test('T-PROJ-2: publish project triggers status change and TodoTask creation', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    // Create project via API for faster test setup
    const project = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `发布测试项目-${timestamp}`,
      type: '内部培训',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      requiredTrainees: ['1'], // Assume user 1 exists from seed
      trainer: 'E2E测试讲师',
      description: 'E2E自动化测试项目',
    });
    projectId = project.id as string;

    // Add questions via API
    await createQuestionViaApi(request, authToken, projectId, {
      type: 'choice',
      content: '测试题目1',
      options: ['选项A', '选项B', '选项C', '选项D'],
      correctAnswer: 'A',
      points: 10,
    });

    // Query TodoTask count before publishing
    const todoBefore = await fetchTodoTasksViaApi(request, authToken);
    const countBefore = todoBefore.total;

    // Publish project via API
    await publishProjectViaApi(request, authToken, projectId);

    // Query TodoTask count after publishing
    await page.waitForTimeout(1000); // Wait for async task creation
    const todoAfter = await fetchTodoTasksViaApi(request, authToken);
    const countAfter = todoAfter.total;

    // Verify TodoTask auto-generation (BR-100)
    expect(countAfter).toBeGreaterThan(countBefore);

    // Verify project status changed to published
    const projectListPage = new TrainingProjectListPage(page);
    await projectListPage.goto();
    await page.waitForLoadState('networkidle');

    await projectListPage.clickProjectByName(`发布测试项目-${timestamp}`);
    await page.waitForTimeout(500);

    await expect(page.locator('text=已发布')).toBeVisible({ timeout: 5000 });
  });

  test('T-PROJ-3: verify published project appears in trainee todo list', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    // Goto todo list
    await page.goto('/todos');
    await page.waitForLoadState('networkidle');

    // Filter by training tasks
    const filterSelect = page.locator('.el-select').filter({ hasText: '全部' }).first();
    await filterSelect.click();
    await page.locator(`.el-select-dropdown__item`).filter({ hasText: '培训任务' }).click();
    await page.waitForTimeout(500);

    // Verify training todo exists
    const todoCards = page.locator('.todo-card');
    await expect(todoCards.first()).toBeVisible({ timeout: 5000 });
  });
});
