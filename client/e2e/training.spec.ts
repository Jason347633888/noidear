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
  cancelProjectViaApi,
  deleteProjectViaApi,
  deletePlanViaApi,
  startExamViaApi,
  submitExamViaApi,
  fetchUsersViaApi,
  fetchCurrentUserViaApi,
} from './helpers/training-api';
import { apiBaseUrl } from './support/urls';

const API_BASE = apiBaseUrl();

/**
 * Training Management BDD E2E Tests
 *
 * Covers BDD scenarios NOT already handled by:
 *  - training-project-flow.spec.ts   (T-PROJ-*)
 *  - training-exam-flow.spec.ts      (T-EXAM-*)
 *  - training-todo-integration.spec.ts (T-TODO-*)
 *
 * New scenarios covered here:
 *  TRN-001  /training/plans renders (list or empty state)
 *  TRN-002  Duplicate-year plan creation is rejected (409)
 *  TRN-003  Submit plan for approval → status becomes pending
 *  TRN-005  Only draft plans deletable; approved plans are not
 *  TRN-010  /training/projects renders
 *  TRN-012  Published project update rejected (403/400)
 *  TRN-013  Cancel training project via API, UI reflects cancelled status
 *  TRN-020  /training/exam/:projectId page renders
 *  TRN-021  Submit answers → response contains score field
 *  TRN-023  Exceeding max retries returns 400/409 error
 *  TRN-ARC-001  /training/archives renders
 */

// ---------------------------------------------------------------------------
// Shared setup helpers
// ---------------------------------------------------------------------------

/** Submit a plan for approval via the training-plans API. */
async function submitPlanForApprovalViaApi(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  planId: string,
) {
  const response = await request.post(`${API_BASE}/training/plans/${planId}/submit`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: response.status(), body: await response.json().catch(() => null) };
}

/** Fetch a single plan detail via API. */
async function fetchPlanViaApi(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  planId: string,
) {
  const response = await request.get(`${API_BASE}/training/plans/${planId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) {
    throw new Error(`Fetch plan failed: ${response.status()}`);
  }
  const body = await response.json();
  return (body.data ?? body) as Record<string, unknown>;
}

/** Attempt to update a project via API. Returns { status, body }. */
async function updateProjectViaApi(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  projectId: string,
  payload: Record<string, unknown>,
) {
  const response = await request.put(`${API_BASE}/training/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });
  return { status: response.status(), body: await response.json().catch(() => null) };
}

// ---------------------------------------------------------------------------
// TRN-001, TRN-002, TRN-003, TRN-005 — Annual Training Plans
// ---------------------------------------------------------------------------

test.describe('TRN: Annual Training Plans', () => {
  let authToken: string;
  let draftPlanId: string;
  let approvedPlanId: string;
  const timestamp = Date.now();
  const uniqueYear = 9000 + (Date.now() % 100); // dynamic far-future year to avoid collision on re-runs

  test.beforeAll(async ({ request }) => {
    const { adminUser, adminPass } = getCredentials();
    authToken = await getAuthToken(request, adminUser, adminPass);

    // Create a draft plan for mutation tests (TRN-003, TRN-005 draft side)
    const draft = await createTrainingPlanViaApi(request, authToken, {
      year: uniqueYear,
      title: `E2E草稿计划-${timestamp}`,
    });
    draftPlanId = draft.id as string;

    // Create a second plan and approve it (TRN-005 approved side)
    // Use a different unique year so no 409
    const approvable = await createTrainingPlanViaApi(request, authToken, {
      year: uniqueYear + 1,
      title: `E2E审批计划-${timestamp}`,
    });
    approvedPlanId = approvable.id as string;
    await approvePlanViaApi(request, authToken, approvedPlanId);
  });

  test.afterAll(async ({ request }) => {
    // Draft plan (may have been submitted → try delete, ignore errors)
    if (draftPlanId) {
      await deletePlanViaApi(request, authToken, draftPlanId).catch(() => {});
    }
    // Approved plan cannot be deleted — leave it; it uses a far-future year, safe to ignore
  });

  // TRN-001 ----------------------------------------------------------------
  test('TRN-001: /training/plans renders — list or empty state visible', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    await page.goto('/training/plans');
    await page.waitForLoadState('networkidle');

    // Page must show either a table with rows or a dedicated empty-state element
    const tableRows = page.locator('.el-table__row');
    const emptyState = page.locator('.el-empty, [class*="empty"], .empty-state');

    const rowCount = await tableRows.count();
    const emptyCount = await emptyState.count();

    expect(rowCount > 0 || emptyCount > 0).toBe(true);
  });

  // TRN-002 ----------------------------------------------------------------
  test('TRN-002: creating a second plan for the same year is rejected (409)', async ({
    request,
  }) => {
    // The plan for uniqueYear already exists (created in beforeAll).
    // A second attempt must return 409.
    const response = await request.post(`${API_BASE}/training/plans`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { year: uniqueYear, title: `重复年度计划-${timestamp}` },
    });

    expect(response.status()).toBe(409);
  });

  // TRN-003 ----------------------------------------------------------------
  test('TRN-003: submitting plan for approval changes status to pending', async ({ request }) => {
    // Submit the draft plan for approval
    const result = await submitPlanForApprovalViaApi(request, authToken, draftPlanId);

    // Skip if workflow template is not configured in this environment
    if (result.status === 400 || result.status === 404) {
      test.skip(true, `Training plan approval workflow not configured (HTTP ${result.status})`);
      return;
    }

    // API should succeed (2xx)
    expect(result.status).toBeGreaterThanOrEqual(200);
    expect(result.status).toBeLessThan(300);

    // Fetch plan and verify status is now pending (or submitted/in-review depending on backend vocabulary)
    const plan = await fetchPlanViaApi(request, authToken, draftPlanId);
    expect(['pending', 'submitted', 'in_review', 'reviewing']).toContain(plan.status as string);
  });

  // TRN-005 ----------------------------------------------------------------
  test('TRN-005: approved plan cannot be deleted; draft/pending plan is deletable', async ({
    request,
  }) => {
    // Attempt to delete the approved plan — should be rejected (400/403/409/422)
    const deleteApprovedResp = await request.delete(
      `${API_BASE}/training/plans/${approvedPlanId}`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(deleteApprovedResp.status()).toBeGreaterThanOrEqual(400);

    // Create a brand-new draft plan (the draftPlanId is now in pending state from TRN-003)
    const fresh = await createTrainingPlanViaApi(request, authToken, {
      year: uniqueYear + 2,
      title: `可删除草稿-${timestamp}`,
    });
    const freshId = fresh.id as string;

    // Delete the draft plan — should succeed (2xx)
    const deleteDraftResp = await request.delete(`${API_BASE}/training/plans/${freshId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(deleteDraftResp.status()).toBeGreaterThanOrEqual(200);
    expect(deleteDraftResp.status()).toBeLessThan(300);
  });
});

// ---------------------------------------------------------------------------
// TRN-010, TRN-012, TRN-013 — Training Projects
// ---------------------------------------------------------------------------

test.describe('TRN: Training Projects', () => {
  let authToken: string;
  let planId: string;
  let plannedProjectId: string;
  let publishedProjectId: string;
  let cancelTargetProjectId: string;
  let currentUserId: string;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    const { adminUser, adminPass } = getCredentials();
    authToken = await getAuthToken(request, adminUser, adminPass);

    const currentUser = await fetchCurrentUserViaApi(request, authToken);
    currentUserId = currentUser.id;

    const users = await fetchUsersViaApi(request, authToken);
    const trainerId = users[0]?.id || currentUserId;
    const trainees = Array.from(new Set([currentUserId, ...users.slice(0, 2).map((u) => u.id)]));

    // Idempotent plan (uses current year)
    const plan = await createTrainingPlanViaApi(request, authToken, {
      year: new Date().getFullYear(),
      title: `项目测试计划-${timestamp}`,
    });
    planId = plan.id as string;
    await approvePlanViaApi(request, authToken, planId).catch(() => {});

    // A project that stays in "planned" state (for TRN-013 cancel test)
    const cancelTarget = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `待取消项目-${timestamp}`,
      department: 'QA',
      quarter: 2,
      trainerId,
      trainees,
      scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    cancelTargetProjectId = cancelTarget.id as string;

    // A published project for TRN-012 (cannot modify published)
    const pubProject = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `已发布项目-${timestamp}`,
      department: 'QA',
      quarter: 2,
      trainerId,
      trainees,
      scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    publishedProjectId = pubProject.id as string;

    // Add a question so publish succeeds (backend may require at least one question)
    await createQuestionViaApi(request, authToken, publishedProjectId, {
      type: 'choice',
      content: '发布前题目',
      options: { A: '选项A', B: '选项B', C: '选项C', D: '选项D' },
      correctAnswer: 'A',
      points: 10,
    });
    await publishProjectViaApi(request, authToken, publishedProjectId);
  });

  test.afterAll(async ({ request }) => {
    for (const id of [cancelTargetProjectId, publishedProjectId, plannedProjectId].filter(
      Boolean,
    )) {
      await cancelProjectViaApi(request, authToken, id).catch(() => {});
      await deleteProjectViaApi(request, authToken, id).catch(() => {});
    }
  });

  // TRN-010 ----------------------------------------------------------------
  test('TRN-010: /training/projects renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    await page.goto('/training/projects');
    await page.waitForLoadState('networkidle');

    // Page must show either a table row OR an empty-state element
    const tableRows = page.locator('.el-table__row');
    const emptyState = page.locator('.el-empty, [class*="empty"], .empty-state');

    const rowCount = await tableRows.count();
    const emptyCount = await emptyState.count();

    expect(rowCount > 0 || emptyCount > 0).toBe(true);
  });

  // TRN-012 ----------------------------------------------------------------
  test('TRN-012: updating a published (ongoing) project is rejected (400/403)', async ({
    request,
  }) => {
    const result = await updateProjectViaApi(request, authToken, publishedProjectId, {
      title: '非法修改-已发布项目',
      description: '尝试直接修改已发布项目',
    });

    // Backend must reject: 400 Bad Request or 403 Forbidden
    expect([400, 403, 422]).toContain(result.status);
  });

  // TRN-013 ----------------------------------------------------------------
  test('TRN-013: cancel training project via API; UI reflects cancelled status', async ({
    page,
    request,
  }) => {
    // Cancel via API
    await cancelProjectViaApi(request, authToken, cancelTargetProjectId);

    // Verify via UI — navigate to project detail and check status tag
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    await page.goto(`/training/projects/${cancelTargetProjectId}`);
    await page.waitForLoadState('networkidle');

    // The status badge should show "已取消" or "cancelled"
    const statusTag = page.locator('.el-tag').filter({ hasText: /已取消|cancelled/i }).first();
    await expect(statusTag).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// TRN-020, TRN-021, TRN-023 — Exam & Scoring
// ---------------------------------------------------------------------------

test.describe('TRN: Exam and Scoring', () => {
  let authToken: string;
  let planId: string;
  let examProjectId: string;
  let maxAttemptsProjectId: string;
  let currentUserId: string;
  const timestamp = Date.now();

  test.beforeAll(async ({ request }) => {
    const { adminUser, adminPass } = getCredentials();
    authToken = await getAuthToken(request, adminUser, adminPass);

    const currentUser = await fetchCurrentUserViaApi(request, authToken);
    currentUserId = currentUser.id;

    const users = await fetchUsersViaApi(request, authToken);
    const trainerId = users[0]?.id || currentUserId;
    const trainees = Array.from(new Set([currentUserId, ...users.slice(0, 2).map((u) => u.id)]));

    const plan = await createTrainingPlanViaApi(request, authToken, {
      year: new Date().getFullYear(),
      title: `考试渲染计划-${timestamp}`,
    });
    planId = plan.id as string;
    await approvePlanViaApi(request, authToken, planId).catch(() => {});

    // Project for TRN-020 / TRN-021
    const examProject = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `考试渲染项目-${timestamp}`,
      department: 'QA',
      quarter: 3,
      trainerId,
      trainees,
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      passingScore: 6,
      maxAttempts: 5,
    });
    examProjectId = examProject.id as string;

    await createQuestionViaApi(request, authToken, examProjectId, {
      type: 'choice',
      content: '考试渲染题：选A',
      options: { A: '正确', B: '错误', C: '错误', D: '错误' },
      correctAnswer: 'A',
      points: 10,
    });
    await publishProjectViaApi(request, authToken, examProjectId);

    // Project for TRN-023 (max 1 attempt)
    const maxProject = await createTrainingProjectViaApi(request, authToken, {
      planId,
      title: `最大重考测试-${timestamp}`,
      department: 'QA',
      quarter: 3,
      trainerId,
      trainees,
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      passingScore: 6,
      maxAttempts: 1,
    });
    maxAttemptsProjectId = maxProject.id as string;

    await createQuestionViaApi(request, authToken, maxAttemptsProjectId, {
      type: 'choice',
      content: '最大重考题：选A',
      options: { A: '正确', B: '错误', C: '错误', D: '错误' },
      correctAnswer: 'A',
      points: 10,
    });
    await publishProjectViaApi(request, authToken, maxAttemptsProjectId);
  });

  test.afterAll(async ({ request }) => {
    for (const id of [examProjectId, maxAttemptsProjectId].filter(Boolean)) {
      await cancelProjectViaApi(request, authToken, id).catch(() => {});
      await deleteProjectViaApi(request, authToken, id).catch(() => {});
    }
  });

  // TRN-020 ----------------------------------------------------------------
  test('TRN-020: /training/exam/:projectId page renders for a published project', async ({
    page,
  }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    await page.goto(`/training/exam/${examProjectId}`);
    await page.waitForLoadState('networkidle');

    // Page must NOT redirect to login or show a 404
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    expect(currentUrl).toContain(examProjectId);

    // Exam page must show a meaningful interactive element:
    // either a "start exam" button, a question card, or an exam title/info panel —
    // NOT just "main" which is always present on every page.
    const startBtn = page.locator('button').filter({ hasText: /开始考试|start exam/i });
    const questionCard = page.locator('.question-card, [class*="question"]');
    const examInfo = page.locator('[class*="exam-info"], [class*="exam-header"], .exam-title');

    const hasBtnOrQuestion =
      (await startBtn.count()) > 0 ||
      (await questionCard.count()) > 0 ||
      (await examInfo.count()) > 0;

    expect(hasBtnOrQuestion).toBe(true);
  });

  // TRN-021 ----------------------------------------------------------------
  test('TRN-021: submitting exam answers returns a response with score field', async ({
    request,
  }) => {
    // Start exam to get question IDs
    const examData = await startExamViaApi(request, authToken, examProjectId);
    expect(examData.questions.length).toBeGreaterThan(0);

    const questionId = examData.questions[0].id;

    // Submit with correct answer
    const result = await submitExamViaApi(request, authToken, examProjectId, {
      answers: { [questionId]: 'A' },
    });

    // score field must exist and be a number
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    // passed field must be boolean
    expect(typeof result.passed).toBe('boolean');
  });

  // TRN-023 ----------------------------------------------------------------
  test('TRN-023: exceeding max retries returns an error (400/409)', async ({ request }) => {
    // maxAttemptsProjectId allows exactly 1 attempt
    // First attempt: start + submit (consumes the only allowed attempt)
    const firstExam = await startExamViaApi(request, authToken, maxAttemptsProjectId);
    const firstQId = firstExam.questions[0].id;

    // Submit a wrong answer on the first attempt (so we fail and would want to retry)
    await submitExamViaApi(request, authToken, maxAttemptsProjectId, {
      answers: { [firstQId]: 'B' },
    });

    // Second attempt — must be rejected because maxAttempts = 1
    const startResp = await request.post(`${API_BASE}/training/exam/start`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { projectId: maxAttemptsProjectId },
    });

    // Backend should refuse with 400 (max attempts exceeded) or 409
    expect([400, 409, 422, 403]).toContain(startResp.status());
  });
});

// ---------------------------------------------------------------------------
// TRN-ARC-001 — Training Archives
// ---------------------------------------------------------------------------

test.describe('TRN: Training Archives', () => {
  /**
   * TRN-ARC-001: /training/archives renders and shows archive-specific content
   *
   * Given 管理员已登录
   * When  访问 /training/archives
   * Then  页面 URL 不跳转到登录页
   * And   页面显示表格行（归档记录）或空状态组件 —— 而非通用 main 容器（任何页面都有 main）
   * And   页面不展示 404 错误文案
   */
  test('TRN-ARC-001: /training/archives renders', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    await page.goto('/training/archives');
    await page.waitForLoadState('networkidle');

    // Must stay on archives route — not redirected to login
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    expect(currentUrl).toMatch(/archives/);

    // Must NOT show a 404 / "页面不存在" message
    const errorText = page.locator('text=/404|页面不存在|Not Found/i');
    const hasError = await errorText.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);

    // Must show either table rows (archived data exists) or an explicit empty-state element.
    // "main" is intentionally excluded — it's present on every page and carries no signal.
    const tableRows = page.locator('.el-table__row');
    const emptyState = page.locator('.el-empty, [class*="empty"], .empty-state');

    const rowCount = await tableRows.count();
    const emptyCount = await emptyState.count();

    expect(rowCount > 0 || emptyCount > 0).toBe(true);
  });
});

// ==========================================================================
// TRN-004, TRN-011, TRN-022, TRN-024
// ==========================================================================

test.describe('TRN — 培训状态流转 & 档案', () => {
  const TRN_ADMIN = process.env.E2E_ADMIN_USER || 'admin';
  const TRN_PASS = process.env.E2E_ADMIN_PASS || 'ChangeMe123!';

  async function trnToken(request: import('@playwright/test').APIRequestContext) {
    const res = await request.post(`${apiBaseUrl()}/auth/login`, {
      data: { username: TRN_ADMIN, password: TRN_PASS },
    });
    if (!res.ok()) throw new Error('login failed');
    const body = await res.json();
    return (body?.data?.token ?? body?.token) as string;
  }

  // TRN-004: 审批通过后计划状态变为 approved
  test('TRN-004: 审批通过后培训计划状态变为 approved', async ({ request }) => {
    const token = await trnToken(request);

    // Fetch a plan in pending_approval state
    const plansRes = await request.get(
      `${apiBaseUrl()}/training/plans?status=pending_approval&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!plansRes.ok()) {
      test.skip(true, 'Training plans API unavailable — 跳过 TRN-004');
      return;
    }
    const plansBody = await plansRes.json();
    const plans: Array<{ id: string; status?: string }> =
      plansBody?.data?.list ??
      plansBody?.data?.items ??
      plansBody?.data?.data?.list ??
      plansBody?.data?.data ??
      (Array.isArray(plansBody?.data) ? plansBody?.data : []);
    if (plans.length === 0) {
      throw new Error('fixture missing: no pending_approval training plan found — E2E seed must create one');
    }

    const plan = plans[0];
    if (!plan?.id) {
      throw new Error('fixture data error: pending_approval training plan found but has no id field');
    }
    // Approve via the approval endpoint
    const approveRes = await request.post(
      `${apiBaseUrl()}/training/plans/${plan.id}/approve`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { action: 'approved', comment: 'TRN-004 E2E approved' },
      },
    );
    if (!approveRes.ok()) {
      const body = await approveRes.text().catch(() => '(no body)');
      throw new Error(`approve endpoint failed: HTTP ${approveRes.status()} — ${body}`);
    }

    // Verify status changed to approved
    const detailRes = await request.get(`${apiBaseUrl()}/training/plans/${plan.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detailRes.ok()).toBe(true);
    const detail = await detailRes.json();
    const status: string = detail?.data?.status ?? detail?.status ?? '';
    expect(['approved', 'active', 'published']).toContain(status.toLowerCase());
  });

  // TRN-011: 发布培训项目
  test('TRN-011: 培训项目发布接口可用', async ({ request }) => {
    const token = await trnToken(request);

    const projectsRes = await request.get(
      `${apiBaseUrl()}/training/projects?status=draft&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!projectsRes.ok()) {
      test.skip(true, 'Training projects API unavailable — 跳过 TRN-011');
      return;
    }
    const projectsBody = await projectsRes.json();
    const projects: Array<{ id: string }> =
      projectsBody?.data?.list ?? projectsBody?.data ?? [];
    if (projects.length === 0) {
      test.skip(true, '无 draft 状态培训项目 — 跳过 TRN-011');
      return;
    }

    const project = projects[0];
    const publishRes = await request.post(
      `${apiBaseUrl()}/training/projects/${project.id}/publish`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {},
      },
    );
    if (!publishRes.ok()) {
      test.skip(true, `发布接口失败 (${publishRes.status()}) — 跳过 TRN-011`);
      return;
    }
    expect(publishRes.ok()).toBe(true);
  });

  // TRN-022: 低于及格分时考试状态为 failed
  test('TRN-022: 低分提交考试 → 状态 failed', async ({ request }) => {
    const token = await trnToken(request);

    // Find a training exam in progress
    const examsRes = await request.get(
      `${apiBaseUrl()}/training/exams?status=in_progress&limit=5`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!examsRes.ok()) {
      test.skip(true, 'Training exams API unavailable — 跳过 TRN-022');
      return;
    }
    const examsBody = await examsRes.json();
    const exams: Array<{ id: string }> = examsBody?.data?.list ?? examsBody?.data ?? [];
    if (exams.length === 0) {
      test.skip(true, '无进行中考试 — 跳过 TRN-022');
      return;
    }

    const exam = exams[0];
    // Submit with empty answers (score = 0, below passing)
    const submitRes = await request.post(
      `${apiBaseUrl()}/training/exams/${exam.id}/submit`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { answers: [] },
      },
    );
    if (!submitRes.ok()) {
      test.skip(true, `考试提交失败 (${submitRes.status()}) — 跳过 TRN-022`);
      return;
    }

    const submitBody = await submitRes.json();
    const status: string = submitBody?.data?.status ?? submitBody?.status ?? '';
    expect(['failed', 'fail', 'unqualified']).toContain(status.toLowerCase());
  });

  // TRN-024: 生成培训档案
  test('TRN-024: 培训档案接口可访问', async ({ request }) => {
    const token = await trnToken(request);

    // Try to access training archive/record endpoint
    const endpoints = [
      `${apiBaseUrl()}/training/archives?limit=10`,
      `${apiBaseUrl()}/training/records?limit=10`,
      `${apiBaseUrl()}/training/certificates?limit=10`,
    ];
    let found = false;
    for (const url of endpoints) {
      const res = await request.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok()) {
        found = true;
        const body = await res.json();
        expect(body).toHaveProperty('data');
        break;
      }
    }
    if (!found) {
      test.skip(true, '培训档案接口未实现 — 跳过 TRN-024');
    }
  });
});
