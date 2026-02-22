import { test, expect } from '@playwright/test';
import { loginViaApi } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';
import { 
  createTrainingPlanViaApi,
  createTrainingProjectViaApi,
  createQuestionViaApi,
  publishProjectViaApi,
  startExamViaApi,
  submitExamViaApi,
  deleteProjectViaApi,
  deletePlanViaApi
} from './helpers/training-api';
import { ExamPage } from './pages/ExamPage';

/**
 * Training Exam Flow E2E Tests
 * 
 * Prerequisites:
 * - Backend running with seeded data
 * - Admin user with permissions
 * 
 * Tests:
 * 1. Take exam and fail
 * 2. Retry exam and pass
 * 3. Verify auto-scoring logic (BR-105, BR-106)
 */

test.describe('Training Exam Flow', () => {
  let authToken: string;
  let planId: string;
  let projectId: string;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    const { adminUser, adminPass } = getCredentials();
    authToken = await getAuthToken(request, adminUser, adminPass);

    // Create test plan
    const plan = await createTrainingPlanViaApi(request, authToken, {
      year: new Date().getFullYear(),
      title: `考试计划-${timestamp}`,
      departmentId: '1',
      budget: 50000,
      status: 'approved',
    });
    planId = plan.id as string;

    // Create test project
    const project = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `考试项目-${timestamp}`,
      type: '技能培训',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      requiredTrainees: ['1'],
      trainer: '系统管理员',
      description: 'E2E考试测试',
    });
    projectId = project.id as string;

    // Add 3 questions (30 points total, pass threshold 60% = 18 points)
    await createQuestionViaApi(request, authToken, projectId, {
      type: 'choice',
      content: '问题1: 选择A是正确答案',
      options: ['正确答案A', '错误答案B', '错误答案C', '错误答案D'],
      correctAnswer: 'A',
      points: 10,
    });

    await createQuestionViaApi(request, authToken, projectId, {
      type: 'choice',
      content: '问题2: 选择B是正确答案',
      options: ['错误答案A', '正确答案B', '错误答案C', '错误答案D'],
      correctAnswer: 'B',
      points: 10,
    });

    await createQuestionViaApi(request, authToken, projectId, {
      type: 'choice',
      content: '问题3: 选择C是正确答案',
      options: ['错误答案A', '错误答案B', '正确答案C', '错误答案D'],
      correctAnswer: 'C',
      points: 10,
    });

    // Publish project
    await publishProjectViaApi(request, authToken, projectId);
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

  test('T-EXAM-1: fail exam with low score then retry and pass', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    const examPage = new ExamPage(page);
    await examPage.goto(projectId);
    await page.waitForLoadState('networkidle');

    // Start exam via UI
    await examPage.startExam();
    await page.waitForTimeout(1000);

    // Answer questions incorrectly (0/30 points)
    await examPage.answerQuestion(0, '错误答案B');
    await examPage.answerQuestion(1, '错误答案A');
    await examPage.answerQuestion(2, '错误答案A');

    // Submit exam
    await examPage.submitExam();
    await page.waitForTimeout(1000);

    // Verify failed result
    await examPage.expectExamResult(false);
    await examPage.expectScore(0);

    // Retry exam
    await examPage.clickRetry();
    await page.waitForTimeout(1000);

    // Answer questions correctly (30/30 points)
    await examPage.answerQuestion(0, '正确答案A');
    await examPage.answerQuestion(1, '正确答案B');
    await examPage.answerQuestion(2, '正确答案C');

    // Submit exam
    await examPage.submitExam();
    await page.waitForTimeout(1000);

    // Verify passed result
    await examPage.expectExamResult(true);
    await examPage.expectScore(30);
  });

  test('T-EXAM-2: verify auto-scoring logic via API', async ({ request }) => {
    // Start exam via API
    const startResult = await startExamViaApi(request, authToken, projectId);
    const recordId = startResult.recordId;

    // Submit with 2/3 correct answers (20/30 = 66.7%, pass threshold 60%)
    const submitResult = await submitExamViaApi(request, authToken, projectId, {
      recordId,
      answers: {
        '1': 'A', // Correct (10 points)
        '2': 'B', // Correct (10 points)
        '3': 'A', // Incorrect (0 points)
      },
    });

    // Verify auto-scoring (BR-105)
    expect(submitResult.score).toBe(20);
    expect(submitResult.passed).toBe(true); // 20/30 = 66.7% > 60%
  });

  test('T-EXAM-3: verify exam result affects training archive generation', async ({ page }) => {
    // This test verifies BR-114: Training archive includes exam records
    const { adminUser, adminPass } = getCredentials();
    await loginViaApi(page, adminUser, adminPass);

    // Navigate to training statistics page
    await page.goto('/training/projects');
    await page.waitForLoadState('networkidle');

    // Click into project detail
    await page.locator('.el-table__row').filter({ hasText: `考试项目-${timestamp}` }).click();
    await page.waitForTimeout(500);

    // Verify learning records section exists
    await expect(page.locator('text=学习记录')).toBeVisible({ timeout: 5000 });

    // Verify exam record appears
    await expect(page.locator('.el-table__row').filter({ hasText: '考试记录' })).toBeVisible({ timeout: 3000 });
  });
});
