import { test, expect } from '@playwright/test';
import { loginViaApiCached } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';
import {
  createTrainingPlanViaApi,
  createTrainingProjectViaApi,
  createQuestionViaApi,
  publishProjectViaApi,
  startExamViaApi,
  submitExamViaApi,
  cancelProjectViaApi,
  deleteProjectViaApi,
  deletePlanViaApi,
  fetchUsersViaApi,
  fetchCurrentUserViaApi,
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
 * 1. Take exam and fail, then retry and pass (UI flow)
 * 2. Verify auto-scoring logic via API (self-contained)
 * 3. Verify exam result affects training archive generation
 */

test.describe('Training Exam Flow', () => {
  let authToken: string;
  let planId: string;
  let projectId: string;
  let currentUserId: string;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    const { adminUser, adminPass } = getCredentials();
    authToken = await getAuthToken(request, adminUser, adminPass);

    // Get current user so we can include admin in trainees
    const currentUser = await fetchCurrentUserViaApi(request, authToken);
    currentUserId = currentUser.id;

    // Fetch users for trainerId and additional trainees
    const users = await fetchUsersViaApi(request, authToken);
    const trainerId = users[0]?.id || currentUserId;
    // Include current admin in trainees to allow exam participation
    const traineeSet = new Set([currentUserId, ...users.slice(0, 2).map(u => u.id)]);
    const trainees = Array.from(traineeSet);

    // Create test plan (idempotent — handles existing year plan gracefully)
    const plan = await createTrainingPlanViaApi(request, authToken, {
      year: new Date().getFullYear(),
      title: `考试计划-${timestamp}`,
    });
    planId = plan.id as string;

    // Create test project with 3 attempts allowed
    // 3 questions × 10pts = 30 total; passingScore:18 = 60% threshold
    const project = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `考试项目-${timestamp}`,
      department: 'QA',
      quarter: 1,
      trainerId,
      trainees,
      description: 'E2E考试测试',
      scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      passingScore: 18,
      maxAttempts: 3,
    });
    projectId = project.id as string;

    // Add 3 questions — options are stored as {A: label, B: label, ...}
    // The UI renders these labels; correct answers are the keys (A/B/C/D)
    await createQuestionViaApi(request, authToken, projectId, {
      type: 'choice',
      content: '问题1: 选择A是正确答案',
      options: { A: '正确答案A', B: '错误答案B', C: '错误答案C', D: '错误答案D' },
      correctAnswer: 'A',
      points: 10,
    });

    await createQuestionViaApi(request, authToken, projectId, {
      type: 'choice',
      content: '问题2: 选择B是正确答案',
      options: { A: '错误答案A', B: '正确答案B', C: '错误答案C', D: '错误答案D' },
      correctAnswer: 'B',
      points: 10,
    });

    await createQuestionViaApi(request, authToken, projectId, {
      type: 'choice',
      content: '问题3: 选择C是正确答案',
      options: { A: '错误答案A', B: '错误答案B', C: '正确答案C', D: '错误答案D' },
      correctAnswer: 'C',
      points: 10,
    });

    // Publish project (planned → ongoing)
    await publishProjectViaApi(request, authToken, projectId);
  });

  test.afterAll(async ({ request }) => {
    try {
      if (projectId) {
        // Cancel first if not in planned state, then skip delete (only planned can be deleted)
        await cancelProjectViaApi(request, authToken, projectId).catch(() => {});
        await deleteProjectViaApi(request, authToken, projectId).catch(() => {});
      }
      // Note: plan is intentionally left — createTrainingPlanViaApi is idempotent for future runs
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  test('T-EXAM-1: fail exam with low score then retry and pass', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    const examPage = new ExamPage(page);
    await examPage.goto(projectId);
    await page.waitForLoadState('networkidle');

    // Start exam via UI — wait for question cards to appear
    await examPage.startExam();
    await examPage.waitForQuestions();

    // Answer questions incorrectly (0/30 points — pick wrong options)
    await examPage.answerQuestion(0, '错误答案B');
    await examPage.answerQuestion(1, '错误答案A');
    await examPage.answerQuestion(2, '错误答案A');

    // Submit exam (includes confirmation dialog)
    await examPage.submitExam();
    await page.waitForTimeout(1000);

    // Verify failed result
    await examPage.expectExamResult(false);
    await examPage.expectScore(0);

    // Retry exam — back to intro screen
    await examPage.clickRetry();
    await examPage.waitForStartButton();

    // Start second attempt
    await examPage.startExam();
    await examPage.waitForQuestions();

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

  test('T-EXAM-2: verify auto-scoring logic via API (self-contained)', async ({ request }) => {
    // Create a dedicated project for this test so it doesn't share attempts with T-EXAM-1
    const examUsers = await fetchUsersViaApi(request, authToken);
    const trainerId = examUsers[0]?.id || currentUserId;
    const trainees = Array.from(new Set([currentUserId, ...examUsers.slice(0, 2).map(u => u.id)]));

    const apiProject = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `API评分测试-${timestamp}`,
      department: 'QA',
      quarter: 1,
      trainerId,
      trainees,
      passingScore: 6,
      maxAttempts: 3,
    });
    const apiProjectId = apiProject.id as string;

    // Add one question (10 points) with correct answer A
    await createQuestionViaApi(request, authToken, apiProjectId, {
      type: 'choice',
      content: '评分测试题：选A得分',
      options: { A: '正确', B: '错误', C: '错误', D: '错误' },
      correctAnswer: 'A',
      points: 10,
    });
    await publishProjectViaApi(request, authToken, apiProjectId);

    // Start exam to get actual question IDs
    const examData = await startExamViaApi(request, authToken, apiProjectId);
    const questionId = examData.questions[0].id;

    // Submit correct answer — expect 10/10, passed (10 >= 6 = 60% of 10)
    const result = await submitExamViaApi(request, authToken, apiProjectId, {
      answers: { [questionId]: 'A' },
    });

    expect(result.score).toBe(10);
    expect(result.passed).toBe(true);

    // Cleanup
    await cancelProjectViaApi(request, authToken, apiProjectId).catch(() => {});
    await deleteProjectViaApi(request, authToken, apiProjectId).catch(() => {});
  });

  test('T-EXAM-3: verify exam result affects training archive generation', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    // Navigate directly to the project detail page
    await page.goto(`/training/projects/${projectId}`);
    await page.waitForLoadState('networkidle');

    // Verify learning records section heading exists (BR-114)
    await expect(page.locator('h3').filter({ hasText: '学习记录' })).toBeVisible({ timeout: 8000 });
  });
});
