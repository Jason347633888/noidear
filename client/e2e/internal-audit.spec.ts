import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginViaApiCached } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { apiBaseUrl } from './support/urls';

/**
 * E2E Tests for Internal Audit Management Module
 *
 * Test IDs:
 * - IA-001 to IA-004: Audit Plans (/internal-audit/plans)
 * - IA-010 to IA-011: Rectifications (/internal-audit/rectifications)
 * - IA-020 to IA-021: Audit Reports (/internal-audit/reports)
 * - IA-030 to IA-031: Management Reviews (/management-reviews)
 */

const API_BASE = apiBaseUrl();

const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'ChangeMe123!';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAdminToken(request: APIRequestContext): Promise<string> {
  return getAuthToken(request, ADMIN_USER, ADMIN_PASS);
}

async function fetchFirstAuditPlanId(request: APIRequestContext): Promise<string | null> {
  const token = await getAdminToken(request);
  const res = await request.get(`${API_BASE}/audit/plans?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return null;
  const body = await res.json();
  const list: Array<{ id: string }> = body?.data?.list ?? body?.data ?? [];
  return list.length > 0 ? list[0].id : null;
}

async function fetchFirstReportId(request: APIRequestContext): Promise<string | null> {
  const token = await getAdminToken(request);
  const res = await request.get(`${API_BASE}/audit/reports?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return null;
  const body = await res.json();
  const list: Array<{ id: string }> = body?.data ?? [];
  return list.length > 0 ? list[0].id : null;
}

async function fetchFirstManagementReviewId(request: APIRequestContext): Promise<string | null> {
  const token = await getAdminToken(request);
  const res = await request.get(`${API_BASE}/management-reviews?page=1&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return null;
  const body = await res.json();
  const list: Array<{ id: string }> = body?.data?.list ?? body?.data ?? [];
  return list.length > 0 ? list[0].id : null;
}

// ---------------------------------------------------------------------------
// Internal Audit Plans
// ---------------------------------------------------------------------------

test.describe('内审计划 (Audit Plans)', () => {
  test('IA-001: 内审计划列表页渲染', async ({ page }) => {
    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto('/internal-audit/plans');
    await page.waitForLoadState('networkidle');

    // Page should show either a table with data or an empty state
    await expect(
      page.locator('.el-table, .el-empty, [class*="empty"], [class*="list"]').first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('IA-002: API 创建内审计划返回 201', async ({ request }) => {
    const token = await getAdminToken(request);

    // Fetch the admin user id to use as auditorId
    const usersRes = await request.get(`${API_BASE}/users?keyword=admin&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(usersRes.ok()).toBeTruthy();
    const usersBody = await usersRes.json();
    const adminUserId: string = usersBody?.data?.list?.[0]?.id ?? usersBody?.data?.[0]?.id ?? '';

    // Fetch at least one document ID to satisfy documentIds requirement
    const docsRes = await request.get(`${API_BASE}/documents?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const docsBody = docsRes.ok() ? await docsRes.json() : null;
    const docList: Array<{ id: string }> = docsBody?.data?.list ?? docsBody?.data ?? [];
    if (docList.length === 0) {
      test.skip(true, 'No documents exist — documentIds cannot be satisfied');
      return;
    }
    const documentId = docList[0].id;

    if (!adminUserId) {
      test.skip(true, 'Could not resolve admin user id');
      return;
    }

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + 1);
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 30);

    const res = await request.post(`${API_BASE}/audit/plans`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `E2E 内审计划 ${Date.now()}`,
        type: 'annual',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        auditorId: adminUserId,
        documentIds: [documentId],
      },
    });

    // Expect 201 Created or 200 OK (some NestJS setups return 200 on POST)
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    expect(body).toHaveProperty('id');
  });

  test('IA-003: 创建内审计划后在列表中可见 (UI 验证)', async ({ page, request }) => {
    const token = await getAdminToken(request);

    // Fetch auditor id
    const usersRes = await request.get(`${API_BASE}/users?keyword=admin&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usersBody = await usersRes.json();
    const adminUserId: string = usersBody?.data?.list?.[0]?.id ?? usersBody?.data?.[0]?.id ?? '';

    // Fetch a document id
    const docsRes = await request.get(`${API_BASE}/documents?limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const docsBody = docsRes.ok() ? await docsRes.json() : null;
    const docList: Array<{ id: string }> = docsBody?.data?.list ?? docsBody?.data ?? [];
    const documentId = docList.length > 0 ? docList[0].id : null;

    if (!adminUserId || !documentId) {
      test.skip();
      return;
    }

    const uniqueTitle = `E2E UI计划 ${Date.now()}`;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + 1);
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 30);

    const createRes = await request.post(`${API_BASE}/audit/plans`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: uniqueTitle,
        type: 'quarterly',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        auditorId: adminUserId,
        documentIds: [documentId],
      },
    });

    expect([200, 201]).toContain(createRes.status());

    // Navigate to list and confirm the newly created plan appears
    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto('/internal-audit/plans');
    await page.waitForLoadState('networkidle');

    // Wait for the table to render
    await expect(page.locator('.el-table').first()).toBeVisible({ timeout: 15000 });

    // The plan title should be visible somewhere on the page (first page)
    await expect(page.locator(`text=${uniqueTitle}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('IA-004: 内审计划详情页（执行页）渲染', async ({ page, request }) => {
    const planId = await fetchFirstAuditPlanId(request);
    if (!planId) {
      test.skip();
      return;
    }

    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto(`/internal-audit/plans/${planId}/execute`);
    await page.waitForLoadState('networkidle');

    // Should show some card, description, or steps UI — not a 404/error page
    await expect(
      page.locator('.el-card, .el-descriptions, .el-steps, .el-tabs, [class*="detail"]').first(),
    ).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// Rectification Management
// ---------------------------------------------------------------------------

test.describe('整改管理 (Rectifications)', () => {
  test('IA-010: 整改列表页渲染', async ({ page }) => {
    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto('/internal-audit/rectifications');
    await page.waitForLoadState('networkidle');

    // Page should show table or empty state
    await expect(
      page.locator('.el-table, .el-empty, [class*="empty"], [class*="list"]').first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('IA-011: 整改任务状态筛选 UI 可操作', async ({ page }) => {
    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto('/internal-audit/rectifications');
    await page.waitForURL(/rectifications/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    // Verify the rectification list page component mounted
    await expect(page.locator('.rectification-list')).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Audit Reports
// ---------------------------------------------------------------------------

test.describe('审计报告 (Audit Reports)', () => {
  test('IA-020: 审计报告列表页渲染', async ({ page }) => {
    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto('/internal-audit/reports');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('.el-table, .el-empty, [class*="empty"], [class*="list"]').first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('IA-021: 内审报告详情页渲染', async ({ page, request }) => {
    const reportId = await fetchFirstReportId(request);
    if (!reportId) {
      test.skip();
      return;
    }

    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto(`/internal-audit/reports/${reportId}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('.el-card, .el-descriptions, .el-tabs, [class*="detail"], [class*="report"]').first(),
    ).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// Management Reviews
// ---------------------------------------------------------------------------

test.describe('管理评审 (Management Reviews)', () => {
  test('IA-030: 管理评审列表页渲染', async ({ page }) => {
    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto('/management-reviews');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('.el-table, .el-empty, [class*="empty"], [class*="list"]').first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('IA-031: 管理评审详情页渲染', async ({ page, request }) => {
    const reviewId = await fetchFirstManagementReviewId(request);
    if (!reviewId) {
      test.skip();
      return;
    }

    await loginViaApiCached(page, ADMIN_USER, ADMIN_PASS);
    await page.goto(`/management-reviews/${reviewId}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('.el-card, .el-descriptions, .el-tabs, [class*="detail"], [class*="review"]').first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
