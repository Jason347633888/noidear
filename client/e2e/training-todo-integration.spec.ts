import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';
import { 
  createTrainingPlanViaApi,
  createTrainingProjectViaApi,
  publishProjectViaApi,
  fetchTodoTasksViaApi,
  completeTodoViaApi,
  deleteProjectViaApi,
  deletePlanViaApi
} from './helpers/training-api';
import { TodoListPage } from './pages/TodoListPage';

/**
 * Training Todo Integration E2E Tests
 * 
 * Prerequisites:
 * - Backend running with seeded data
 * - Admin user with permissions
 * 
 * Tests:
 * 1. Verify TodoTask auto-creation when project is published (BR-099, BR-100)
 * 2. Verify todo filtering and overdue highlighting
 * 3. Verify todo completion flow
 */

test.describe('Training Todo Integration', () => {
  let authToken: string;
  let planId: string;
  let projectId: string;
  let todoId: string;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    const { adminUser, adminPass } = getCredentials();
    authToken = await getAuthToken(request, adminUser, adminPass);

    // Create test plan
    const plan = await createTrainingPlanViaApi(request, authToken, {
      year: new Date().getFullYear(),
      title: `待办测试计划-${timestamp}`,
      departmentId: '1',
      budget: 30000,
      status: 'approved',
    });
    planId = plan.id as string;
  });

  test.afterAll(async ({ request }) => {
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

  test('T-TODO-1: verify TodoTask auto-creation when project is published', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    // Query TodoTask count before creating project
    const todoBefore = await fetchTodoTasksViaApi(request, authToken);
    const countBefore = todoBefore.total;

    // Create and publish project via API
    const project = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `待办生成测试-${timestamp}`,
      type: '资质培训',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      requiredTrainees: ['1'],
      trainer: '系统管理员',
      description: 'TodoTask自动生成测试',
    });
    projectId = project.id as string;

    await publishProjectViaApi(request, authToken, projectId);
    await page.waitForTimeout(1000); // Wait for async task creation

    // Query TodoTask count after publishing
    const todoAfter = await fetchTodoTasksViaApi(request, authToken);
    const countAfter = todoAfter.total;

    // Verify TodoTask auto-creation (BR-100)
    expect(countAfter).toBeGreaterThan(countBefore);

    // Verify new todo contains training info
    const newTodo = todoAfter.list.find((t: any) => t.title?.includes(`待办生成测试-${timestamp}`));
    expect(newTodo).toBeDefined();
    expect(newTodo?.type).toBe('training'); // BR-099: type = 'training'
    
    todoId = newTodo?.id as string;
  });

  test('T-TODO-2: verify todo filtering by type', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const todoListPage = new TodoListPage(page);
    await todoListPage.goto();
    await page.waitForLoadState('networkidle');

    // Filter by training tasks
    await todoListPage.filterByType('培训任务');
    await page.waitForTimeout(500);

    // Verify only training todos are visible
    const todoCards = page.locator('.todo-card');
    const count = await todoCards.count();
    expect(count).toBeGreaterThan(0);

    // Verify training todo appears
    await todoListPage.expectTodoVisible(`待办生成测试-${timestamp}`);
  });

  test('T-TODO-3: verify overdue highlighting for past deadline todos', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    // Create overdue project (end date in the past)
    const overdueProject = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `逾期待办测试-${timestamp}`,
      type: '内部培训',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
      requiredTrainees: ['1'],
      trainer: '系统管理员',
      description: '逾期测试',
    });

    await publishProjectViaApi(request, authToken, overdueProject.id as string);
    await page.waitForTimeout(1000);

    // Navigate to todo list
    const todoListPage = new TodoListPage(page);
    await todoListPage.goto();
    await page.waitForLoadState('networkidle');

    // Verify overdue todo has visual indicator (e.g., red background/border)
    const overdueTodo = page.locator('.todo-card').filter({ hasText: `逾期待办测试-${timestamp}` });
    await expect(overdueTodo).toBeVisible({ timeout: 5000 });

    // Check for overdue styling (class name may vary)
    const hasOverdueClass = await overdueTodo.evaluate((el) => {
      return el.classList.contains('overdue') || 
             el.classList.contains('is-overdue') ||
             getComputedStyle(el).backgroundColor.includes('255, 0, 0'); // Red background
    });
    expect(hasOverdueClass).toBe(true);

    // Cleanup overdue project
    await deleteProjectViaApi(request, authToken, overdueProject.id as string);
  });

  test('T-TODO-4: verify todo completion flow', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    // Complete todo via API (simulating exam completion)
    if (todoId) {
      await completeTodoViaApi(request, authToken, todoId);
      await page.waitForTimeout(500);
    }

    // Navigate to todo list
    const todoListPage = new TodoListPage(page);
    await todoListPage.goto();
    await page.waitForLoadState('networkidle');

    // Filter by completed tasks
    const statusSelect = page.locator('.el-select').filter({ hasText: '待完成' }).first();
    await statusSelect.click();
    await page.locator(`.el-select-dropdown__item`).filter({ hasText: '已完成' }).click();
    await page.waitForTimeout(500);

    // Verify completed todo appears in completed list
    await todoListPage.expectTodoVisible(`待办生成测试-${timestamp}`);
  });

  test('T-TODO-5: verify todo statistics endpoint', async ({ request }) => {
    // Fetch todo statistics via API (BR-111)
    const stats = await fetchTodoTasksViaApi(request, authToken, { statistics: 'true' });

    // Verify statistics fields exist
    expect(stats.total).toBeGreaterThanOrEqual(0);
    // Additional statistics assertions can be added based on backend response
  });
});
