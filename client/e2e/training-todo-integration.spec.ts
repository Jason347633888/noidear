import { test, expect } from '@playwright/test';
import { loginViaApiCached } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';
import {
  createTrainingPlanViaApi,
  createTrainingProjectViaApi,
  publishProjectViaApi,
  approvePlanViaApi,
  cancelProjectViaApi,
  deleteProjectViaApi,
  fetchUsersViaApi,
  fetchCurrentUserViaApi,
  fetchTodoTasksViaApi,
  fetchTodoStatisticsViaApi,
  completeTodoViaApi,
} from './helpers/training-api';

/**
 * Training Todo Integration E2E Tests
 *
 * Prerequisites:
 * - Backend running with seeded data
 * - Admin user with permissions
 *
 * Tests:
 * 1. Verify TodoTask auto-creation when project is published (BR-099, BR-100)
 * 2. Verify todo filtering by type returns correct subset
 * 3. Verify overdue todos have past dueDate (overdue flag computed client-side from dueDate)
 * 4. Verify todo completion flow marks todo as completed
 * 5. Verify todo statistics endpoint returns expected shape
 */

test.describe('Training Todo Integration', () => {
  let authToken: string;
  let planId: string;
  let projectId: string;
  let overdueProjectId: string;
  let currentUserId: string;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    const { adminUser, adminPass } = getCredentials();
    authToken = await getAuthToken(request, adminUser, adminPass);

    const currentUser = await fetchCurrentUserViaApi(request, authToken);
    currentUserId = currentUser.id;

    const users = await fetchUsersViaApi(request, authToken);
    const trainerId = users[0]?.id || currentUserId;
    const trainees = Array.from(new Set([currentUserId, ...users.slice(0, 2).map(u => u.id)]));

    // Create plan (idempotent)
    const plan = await createTrainingPlanViaApi(request, authToken, {
      year: new Date().getFullYear(),
      title: `待办测试计划-${timestamp}`,
    });
    planId = plan.id as string;
    await approvePlanViaApi(request, authToken, planId).catch(() => {});

    // Create and publish main test project (future scheduledDate)
    const project = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `待办生成测试-${timestamp}`,
      department: 'QA',
      quarter: 1,
      trainerId,
      trainees,
      description: 'TodoTask自动生成测试',
      scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    projectId = project.id as string;
    await publishProjectViaApi(request, authToken, projectId);

    // Create and publish a second project with a past scheduledDate (for overdue test)
    const overdueProject = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `逾期待办测试-${timestamp}`,
      department: 'QA',
      quarter: 1,
      trainerId,
      trainees,
      scheduledDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    overdueProjectId = overdueProject.id as string;
    await publishProjectViaApi(request, authToken, overdueProjectId);

    // Brief wait for async todo creation
    await new Promise(r => setTimeout(r, 500));
  });

  test.afterAll(async ({ request }) => {
    for (const id of [projectId, overdueProjectId].filter(Boolean)) {
      await cancelProjectViaApi(request, authToken, id).catch(() => {});
      await deleteProjectViaApi(request, authToken, id).catch(() => {});
    }
  });

  test('T-TODO-1: verify TodoTask auto-creation when project is published', async ({ request }) => {
    const data = await fetchTodoTasksViaApi(request, authToken, { type: 'training_attend' });
    const items = data.items as Array<Record<string, unknown>>;

    // At least one todo linked to the published project
    const projectTodo = items.find(t => t.relatedId === projectId);
    expect(projectTodo).toBeDefined();
    expect(projectTodo!.type).toBe('training_attend');
    expect(projectTodo!.status).toBe('pending');
    expect(projectTodo!.actionRoute).toBe(`/training/projects/${projectId}`);
  });

  test('T-TODO-2: verify todo filtering by type', async ({ request }) => {
    // Filter to training_attend only
    const trainingData = await fetchTodoTasksViaApi(request, authToken, { type: 'training_attend' });
    const trainingItems = trainingData.items as Array<Record<string, unknown>>;
    expect(trainingItems.length).toBeGreaterThan(0);
    for (const item of trainingItems) {
      expect(item.type).toBe('training_attend');
    }

    // Filter to pending only
    const pendingData = await fetchTodoTasksViaApi(request, authToken, { status: 'pending' });
    const pendingItems = pendingData.items as Array<Record<string, unknown>>;
    expect(pendingItems.length).toBeGreaterThan(0);
    for (const item of pendingItems) {
      expect(item.status).toBe('pending');
    }
  });

  test('T-TODO-3: verify overdue todos have past dueDate', async ({ request }) => {
    const data = await fetchTodoTasksViaApi(request, authToken, { type: 'training_attend' });
    const items = data.items as Array<Record<string, unknown>>;

    // The overdue project was published with a past scheduledDate → its todo should have past dueDate
    const overdueTodo = items.find(t => t.relatedId === overdueProjectId);
    expect(overdueTodo).toBeDefined();

    const dueDate = new Date(overdueTodo!.dueDate as string);
    expect(dueDate.getTime()).toBeLessThan(Date.now());
  });

  test('T-TODO-4: verify todo completion flow', async ({ request }) => {
    // Find a pending todo from the main project
    const before = await fetchTodoTasksViaApi(request, authToken, {
      type: 'training_attend',
      status: 'pending',
    });
    const pendingItems = before.items as Array<Record<string, unknown>>;
    const target = pendingItems.find(t => t.relatedId === overdueProjectId);
    expect(target).toBeDefined();

    const todoId = target!.id as string;
    await completeTodoViaApi(request, authToken, todoId);

    // Verify it now shows as completed
    const completed = await fetchTodoTasksViaApi(request, authToken, { status: 'completed' });
    const completedItems = completed.items as Array<Record<string, unknown>>;
    const done = completedItems.find(t => t.id === todoId);
    expect(done).toBeDefined();
    expect(done!.status).toBe('completed');
  });

  test('T-TODO-5: verify todo statistics endpoint', async ({ request }) => {
    const stats = await fetchTodoStatisticsViaApi(request, authToken);

    expect(typeof stats.total).toBe('number');
    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(typeof stats.byStatus.pending).toBe('number');
    expect(typeof stats.byStatus.completed).toBe('number');
    expect(stats.byStatus.pending + stats.byStatus.completed).toBeLessThanOrEqual(stats.total);

    // byType must include training_attend key
    expect('training_attend' in stats.byType).toBe(true);
  });
});
