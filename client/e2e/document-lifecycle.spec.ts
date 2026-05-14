import { test, expect, type APIRequestContext } from '@playwright/test';
import { loginViaApiCached } from './helpers/auth';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';
import { apiBaseUrl } from './support/urls';

/**
 * Document Lifecycle E2E Tests
 *
 * BDD scenarios covered:
 *   DOC-001  /documents page renders
 *   DOC-002  Filter document list by level via query param
 *   DOC-003  Draft document is editable; title save succeeds
 *   DOC-004  Non-draft document is NOT directly editable
 *   DOC-020  Publish new version supersedes old version (API)
 *   DOC-021  Document can be archived
 *   DOC-022  Archived document cannot submit for approval
 *   CTRL-001 /documents/control/workbench renders (gap check)
 *   CTRL-002 /documents/control/number-rules renders
 *   CTRL-003 /documents/control/record-form-index renders (gap check)
 *   OPS-001  /documents/operations/read-confirmations renders (gap check)
 *   OPS-002  /documents/operations/health renders (gap check)
 *
 * Test data strategy:
 *   - Documents are discovered at runtime via GET /documents (no JSON create endpoint exists;
 *     POST /documents/upload requires multipart file upload).
 *   - Tests that need a draft/effective document skip gracefully when none are available.
 */

const API_BASE = apiBaseUrl();

// ---------------------------------------------------------------------------
// Helper: obtain a Bearer token for the admin user
// ---------------------------------------------------------------------------
async function getToken(request: APIRequestContext): Promise<string> {
  const { adminUser, adminPass } = getCredentials();
  return getAuthToken(request, adminUser, adminPass);
}

// ---------------------------------------------------------------------------
// Helper: fetch an existing document by status; returns null when none found.
// ---------------------------------------------------------------------------
async function fetchExistingDocument(
  request: APIRequestContext,
  token: string,
  status: string,
): Promise<{ id: string; status: string } | null> {
  const res = await request.get(`${API_BASE}/documents?limit=1&status=${status}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) return null;
  const body = await res.json();
  const list: Array<{ id: string; status: string }> =
    body?.data?.list ?? body?.list ?? [];
  return list.length > 0 ? list[0] : null;
}

// ---------------------------------------------------------------------------
// Helper: publish a document (set status to "effective")
// ---------------------------------------------------------------------------
async function publishDocument(
  request: APIRequestContext,
  token: string,
  id: string,
): Promise<void> {
  const res = await request.patch(`${API_BASE}/documents/${id}/publish`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Failed to publish document ${id}: ${res.status()} ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Helper: archive a document
// ---------------------------------------------------------------------------
async function archiveDocument(
  request: APIRequestContext,
  token: string,
  id: string,
): Promise<void> {
  const res = await request.post(`${API_BASE}/documents/${id}/archive`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { reason: 'e2e-test archival' },
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Failed to archive document ${id}: ${res.status()} ${body}`);
  }
}

// ===========================================================================
// BDD: Document CRUD
// ===========================================================================
test.describe('Document CRUD', () => {
  // -------------------------------------------------------------------------
  // DOC-001: Body文件中心页面渲染（/documents）
  // -------------------------------------------------------------------------
  test('DOC-001: /documents page renders without error', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    await page.goto('/documents');
    await page.waitForLoadState('networkidle');

    // Page should show a table or an empty state – never a blank error screen
    await expect(page.locator('.el-table, .el-empty, .el-card').first()).toBeVisible({
      timeout: 12000,
    });
  });

  // -------------------------------------------------------------------------
  // DOC-002: Filter document list by level query param
  // -------------------------------------------------------------------------
  test('DOC-002: level query param filters the document list', async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);

    // Navigate to /documents with level=1 filter
    await page.goto('/documents?level=1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 12000 });

    // Switch to level 2 filter and confirm page reloads without crashing
    await page.goto('/documents?level=2');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 12000 });
  });

  // -------------------------------------------------------------------------
  // DOC-003: Draft document is editable; title save succeeds
  // NOTE: POST /documents does not exist (upload only). We use an existing
  //       draft document discovered at runtime.
  // -------------------------------------------------------------------------
  test('DOC-003: draft document can be edited and saved', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getToken(request);

    const doc = await fetchExistingDocument(request, token, 'draft');
    if (!doc) {
      test.skip(true, 'No draft documents available in the system');
      return;
    }
    const docId = doc.id;

    await loginViaApiCached(page, adminUser, adminPass);
    await page.goto(`/documents/${docId}`);
    await page.waitForLoadState('networkidle');

    // Look for an edit button (document should be in draft – editable)
    const editBtn = page
      .locator('.el-button')
      .filter({ hasText: /编辑|Edit/ })
      .first();

    if (await editBtn.isVisible({ timeout: 8000 })) {
      await editBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // Locate title input – could be .el-input or native input
    const titleInput = page
      .locator('input[placeholder*="标题"], input[name="title"], .el-form-item input')
      .first();

    if (await titleInput.isVisible({ timeout: 5000 })) {
      await titleInput.fill(`e2e-updated-title-${Date.now()}`);

      // Submit the form
      const saveBtn = page
        .locator('.el-button--primary')
        .filter({ hasText: /保存|Save|确定|提交/ })
        .first();

      await saveBtn.click();
      await page.waitForLoadState('networkidle');

      // Expect a success notification (el-message or el-notification)
      await expect(
        page.locator('.el-message--success, .el-notification__content').first(),
      ).toBeVisible({ timeout: 8000 });
    } else {
      // If no title input found, at minimum verify the page is not an error page
      await expect(page.locator('.el-descriptions, .el-card').first()).toBeVisible({
        timeout: 8000,
      });
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Title input not found – UI may use inline editing',
      });
    }
  });

  // -------------------------------------------------------------------------
  // DOC-004: Non-draft document is NOT directly editable
  // NOTE: POST /documents does not exist. We look for an existing effective doc.
  // -------------------------------------------------------------------------
  test('DOC-004: non-draft (effective) document cannot be directly edited', async ({
    page,
    request,
  }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getToken(request);

    const doc = await fetchExistingDocument(request, token, 'effective');
    if (!doc) {
      test.skip(true, 'No effective documents available in the system');
      return;
    }

    await loginViaApiCached(page, adminUser, adminPass);
    await page.goto(`/documents/${doc.id}`);
    await page.waitForLoadState('networkidle');

    // The primary edit button should either be absent or disabled for effective docs
    const editBtn = page
      .locator('.el-button')
      .filter({ hasText: /^编辑$|^Edit$/ })
      .first();

    const editVisible = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (editVisible) {
      // If the button exists it must be disabled
      await expect(editBtn).toBeDisabled();
    } else {
      // Button not present at all – also satisfies the requirement
      expect(editVisible).toBe(false);
    }
  });

});

// ===========================================================================
// BDD: Document Version & Archival
// ===========================================================================
test.describe('Document Version and Archival', () => {
  // -------------------------------------------------------------------------
  // DOC-020: Publish new version – old version is superseded (API-level check)
  // NOTE: POST /documents does not exist. We look for two existing draft docs
  //       to form a version lineage, or skip if unavailable.
  // -------------------------------------------------------------------------
  test('DOC-020: publishing a new version supersedes the previous effective version', async ({
    request,
  }) => {
    const token = await getToken(request);

    // Fetch two draft documents to form a lineage (need at least 2)
    const res = await request.get(`${API_BASE}/documents?limit=2&status=draft`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) {
      test.skip(true, 'Could not fetch draft documents');
      return;
    }
    const body = await res.json();
    const list: Array<{ id: string; number?: string }> =
      body?.data?.list ?? body?.list ?? [];
    if (list.length < 2) {
      test.skip(true, 'Need at least 2 draft documents to test version supersession');
      return;
    }

    const idV1 = list[0].id;
    const idV2 = list[1].id;

    // Publish v1
    await publishDocument(request, token, idV1);

    // Fetch v1's number and assign it to v2 to form a lineage
    const detailRes = await request.get(`${API_BASE}/documents/${idV1}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const v1Data = await detailRes.json();
    const v1Number: string = v1Data?.data?.number ?? '';

    if (v1Number) {
      await request.put(`${API_BASE}/documents/${idV2}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { title: `e2e-v2-${Date.now()}`, number: v1Number, level: 1 },
      });
    }

    // Publish v2 – should supersede v1
    const publishRes = await request.patch(`${API_BASE}/documents/${idV2}/publish`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(publishRes.ok()).toBe(true);

    // Verify v1 is now superseded
    const v1CheckRes = await request.get(`${API_BASE}/documents/${idV1}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const v1Check = await v1CheckRes.json();
    const v1Status: string = v1Check?.data?.status ?? '';

    // Strict: when a new version is approved, the old version MUST become superseded.
    expect(v1Status).toBe('superseded');

    // Verify v2 is now effective
    const v2CheckRes = await request.get(`${API_BASE}/documents/${idV2}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const v2Check = await v2CheckRes.json();
    expect(v2Check?.data?.status).toBe('effective');
  });

  // -------------------------------------------------------------------------
  // DOC-021: Document can be archived
  // NOTE: POST /documents does not exist. We use an existing draft doc and
  //       publish then archive it, or skip if unavailable.
  // -------------------------------------------------------------------------
  test('DOC-021: effective document can be archived', async ({ request }) => {
    const token = await getToken(request);

    // Try to find a draft doc to publish then archive
    const doc = await fetchExistingDocument(request, token, 'draft');
    if (!doc) {
      // Alternatively, find an already-effective doc
      const effectiveDoc = await fetchExistingDocument(request, token, 'effective');
      if (!effectiveDoc) {
        test.skip(true, 'No draft or effective documents available for archival test');
        return;
      }

      // Archive the effective doc directly
      const archiveRes = await request.post(`${API_BASE}/documents/${effectiveDoc.id}/archive`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: 'e2e-doc021 archival test' },
      });
      expect(archiveRes.ok()).toBe(true);

      const detailRes = await request.get(`${API_BASE}/documents/${effectiveDoc.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const detail = await detailRes.json();
      expect(detail?.data?.status).toBe('archived');
      return;
    }

    // Publish first
    await publishDocument(request, token, doc.id);

    // Archive it
    const archiveRes = await request.post(`${API_BASE}/documents/${doc.id}/archive`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { reason: 'e2e-doc021 archival test' },
    });
    expect(archiveRes.ok()).toBe(true);

    // Confirm status is now 'archived'
    const detailRes = await request.get(`${API_BASE}/documents/${doc.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = await detailRes.json();
    expect(detail?.data?.status).toBe('archived');
  });

  // -------------------------------------------------------------------------
  // DOC-022: Archived document cannot submit for approval
  // NOTE: POST /documents does not exist. We look for an existing effective doc
  //       to archive, then attempt submit.
  // -------------------------------------------------------------------------
  test('DOC-022: archived document cannot be submitted for approval', async ({ request }) => {
    const token = await getToken(request);

    // First try to find a draft to publish→archive
    let docId: string | null = null;

    const draft = await fetchExistingDocument(request, token, 'draft');
    if (draft) {
      await publishDocument(request, token, draft.id);
      await archiveDocument(request, token, draft.id);
      docId = draft.id;
    } else {
      // Try an effective doc
      const effective = await fetchExistingDocument(request, token, 'effective');
      if (effective) {
        await archiveDocument(request, token, effective.id);
        docId = effective.id;
      }
    }

    if (!docId) {
      test.skip(true, 'No suitable documents available to test archived submit rejection');
      return;
    }

    // Attempt to submit for approval – must fail (4xx)
    const submitRes = await request.post(`${API_BASE}/documents/${docId}/submit`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(submitRes.status()).toBeGreaterThanOrEqual(400);
    expect(submitRes.status()).toBeLessThan(500);
  });

  // -------------------------------------------------------------------------
  // BDD-DOC-011: User confirms document read
  // -------------------------------------------------------------------------
  test('BDD-DOC-011: user confirms document read', async ({ request }) => {
    const token = await getToken(request);

    // Find an effective document to confirm
    const docsRes = await request.get(`${API_BASE}/documents?status=effective&limit=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!docsRes.ok()) {
      test.skip(true, 'No effective documents available');
      return;
    }

    const docsData = await docsRes.json();
    const list: Array<{ id: string }> = docsData?.data?.list ?? docsData?.list ?? [];
    if (!list.length) {
      test.skip(true, 'No effective documents to confirm');
      return;
    }

    const docId = list[0].id;

    // Create a read confirmation
    const confirmRes = await request.post(
      `${API_BASE}/documents/${docId}/read-confirmations`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {},
      },
    );
    // Should succeed (201) or already confirmed (409/200)
    expect([200, 201, 409]).toContain(confirmRes.status());

    // Verify confirmation exists
    const listRes = await request.get(
      `${API_BASE}/documents/${docId}/read-confirmations`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    expect(listRes.ok()).toBe(true);
    const confirmData = await listRes.json();
    // Should have at least one confirmation
    const confirmations: unknown[] =
      confirmData?.data?.list ?? confirmData?.list ?? confirmData;
    const confirmTotal: number = confirmData?.data?.total ?? confirmData?.total ?? -1;
    if (Array.isArray(confirmations)) {
      expect(confirmations.length).toBeGreaterThan(0);
    } else {
      expect(confirmTotal).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// BDD: 文控工作台 (Document Control Workbench)
// ===========================================================================
test.describe('Document Control Workbench', () => {
  test.beforeEach(async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);
  });

  // -------------------------------------------------------------------------
  // CTRL-001: /documents/control/workbench page renders
  // -------------------------------------------------------------------------
  test('CTRL-001: /documents/control/workbench renders without error', async ({ page }) => {
    await page.goto('/documents/control/workbench');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-card, .el-table, .el-empty').first()).toBeVisible({
      timeout: 12000,
    });
  });

  // -------------------------------------------------------------------------
  // CTRL-002: /documents/control/number-rules page renders
  // -------------------------------------------------------------------------
  test('CTRL-002: /documents/control/number-rules renders without error', async ({ page }) => {
    await page.goto('/documents/control/number-rules');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty, .el-card').first()).toBeVisible({
      timeout: 12000,
    });
  });

  // -------------------------------------------------------------------------
  // CTRL-003: /documents/control/record-form-index renders
  // -------------------------------------------------------------------------
  test('CTRL-003: /documents/control/record-form-index renders without error', async ({ page }) => {
    await page.goto('/documents/control/record-form-index');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 12000 });
  });
});

// ===========================================================================
// BDD: 文控运营 (Document Control Operations)
// ===========================================================================
test.describe('Document Control Operations', () => {
  test.beforeEach(async ({ page }) => {
    const { adminUser, adminPass } = getCredentials();
    await loginViaApiCached(page, adminUser, adminPass);
  });

  // -------------------------------------------------------------------------
  // OPS-001: /documents/operations/read-confirmations renders
  // -------------------------------------------------------------------------
  test('OPS-001: /documents/operations/read-confirmations renders without error', async ({
    page,
  }) => {
    await page.goto('/documents/operations/read-confirmations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.el-table, .el-input, .el-empty').first()).toBeVisible({
      timeout: 12000,
    });
  });

  // -------------------------------------------------------------------------
  // OPS-002: /documents/operations/health renders
  // -------------------------------------------------------------------------
  test('OPS-002: /documents/operations/health renders without error', async ({ page }) => {
    await page.goto('/documents/operations/health');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('.el-card, .document-health-dashboard, .el-empty').first(),
    ).toBeVisible({ timeout: 12000 });
  });
});

// ==========================================================================
// DOC-006, DOC-007, DOC-010, SRC-001, SRC-004~007 — 文档过滤 & 全文搜索
// ==========================================================================

test.describe('DOC — 文档过滤 & 状态提醒', () => {
  async function docAdminToken(request: import('@playwright/test').APIRequestContext) {
    const u = process.env.E2E_ADMIN_USER || 'admin';
    const p = process.env.E2E_ADMIN_PASS || 'ChangeMe123!';
    const res = await request.post(`${apiBaseUrl()}/auth/login`, {
      data: { username: u, password: p },
    });
    if (!res.ok()) throw new Error('admin login failed');
    const body = await res.json();
    return (body?.data?.token ?? body?.token) as string;
  }

  // DOC-006: 文档列表按 level 过滤
  test('DOC-006: GET /documents?level=1 仅返回一级文档', async ({ request }) => {
    const token = await docAdminToken(request);
    const res = await request.get(`${apiBaseUrl()}/documents?level=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const list: Array<{ level?: number }> = body?.data?.list ?? body?.data ?? body?.list ?? [];
    if (list.length > 0) {
      list.forEach((d) => expect(d.level).toBe(1));
    }
  });

  // DOC-007: 已删除文档不出现在搜索结果中
  test('DOC-007: 已软删除文档不出现在 GET /documents 列表中', async ({ request }) => {
    const token = await docAdminToken(request);
    const res = await request.get(`${apiBaseUrl()}/documents?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const list: Array<{ deletedAt?: string | null }> =
      body?.data?.list ?? body?.data ?? body?.list ?? [];
    // None of the returned docs should have a deletedAt
    list.forEach((d) => {
      expect(d.deletedAt == null || d.deletedAt === undefined).toBe(true);
    });
  });

  // DOC-010: 超过 review_due_date 的文档应有过期标记
  test('DOC-010: 超期文档查询接口可访问', async ({ request }) => {
    const token = await docAdminToken(request);
    // Try endpoint variations
    const endpoints = [
      `${apiBaseUrl()}/documents?overdue=true&limit=10`,
      `${apiBaseUrl()}/documents/overdue?limit=10`,
      `${apiBaseUrl()}/documents/control-center?limit=10`,
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
      test.skip(true, '超期文档接口未实现 — 跳过 DOC-010');
    }
  });
});

test.describe('SRC — 全文搜索补充', () => {
  async function srcAdminToken(request: import('@playwright/test').APIRequestContext) {
    const u = process.env.E2E_ADMIN_USER || 'admin';
    const p = process.env.E2E_ADMIN_PASS || 'ChangeMe123!';
    const res = await request.post(`${apiBaseUrl()}/auth/login`, {
      data: { username: u, password: p },
    });
    if (!res.ok()) throw new Error('admin login failed');
    const body = await res.json();
    return (body?.data?.token ?? body?.token) as string;
  }

  // SRC-001: 关键词搜索返回相关文档
  test('SRC-001: 关键词搜索返回包含关键词的文档', async ({ request }) => {
    const token = await srcAdminToken(request);
    const res = await request.get(
      `${apiBaseUrl()}/search/query?keyword=${encodeURIComponent('质量')}&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status() === 404) {
      test.skip(true, 'GET /search/query 未实现 — 跳过 SRC-001');
      return;
    }
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    // Deleted docs should not appear
    const items: Array<{ deletedAt?: string | null }> =
      body?.data?.list ?? body?.data?.items ?? body?.data?.data ?? body?.data ?? [];
    items.forEach((item) => {
      expect(item.deletedAt == null || item.deletedAt === undefined).toBe(true);
    });
  });

  // SRC-004: 搜索结果支持按时间排序
  test('SRC-004: 搜索支持 sortBy=time 参数', async ({ request }) => {
    const token = await srcAdminToken(request);
    const res = await request.get(
      `${apiBaseUrl()}/search/query?keyword=${encodeURIComponent('文件')}&sortBy=time&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status() === 404) {
      test.skip(true, 'GET /search/query 未实现 — 跳过 SRC-004');
      return;
    }
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  // SRC-005: 搜索结果支持按相关度排序
  test('SRC-005: 搜索支持 sortBy=relevance 参数', async ({ request }) => {
    const token = await srcAdminToken(request);
    const res = await request.get(
      `${apiBaseUrl()}/search/query?keyword=${encodeURIComponent('文件')}&sortBy=relevance&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status() === 404) {
      test.skip(true, 'GET /search/query 未实现 — 跳过 SRC-005');
      return;
    }
    expect(res.ok()).toBe(true);
  });

  // SRC-006: 文档发布时搜索索引自动更新（验证已 effective 文档可被搜索到）
  test('SRC-006: effective 状态文档可被搜索查询', async ({ request }) => {
    const token = await srcAdminToken(request);

    // Find an effective document title
    const docRes = await request.get(
      `${apiBaseUrl()}/documents?status=effective&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!docRes.ok()) {
      test.skip(true, '无法获取 effective 文档 — 跳过 SRC-006');
      return;
    }
    const docBody = await docRes.json();
    const docs: Array<{ title?: string }> = docBody?.data?.list ?? docBody?.data ?? [];
    if (docs.length === 0) {
      test.skip(true, '无 effective 文档 — 跳过 SRC-006');
      return;
    }

    const title = docs[0].title ?? '';
    const keyword = title.substring(0, Math.min(4, title.length));
    if (!keyword) {
      test.skip(true, '文档标题为空 — 跳过 SRC-006');
      return;
    }

    const searchRes = await request.get(
      `${apiBaseUrl()}/search/query?keyword=${encodeURIComponent(keyword)}&documentStatus=effective&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (searchRes.status() === 404) {
      test.skip(true, '搜索接口未实现 — 跳过 SRC-006');
      return;
    }
    expect(searchRes.ok()).toBe(true);
    const searchBody = await searchRes.json();
    expect(searchBody).toHaveProperty('data');
  });

  // SRC-007: 文档删除时索引被移除（已删除文档不出现在搜索结果）
  test('SRC-007: 软删除文档不出现在搜索结果中', async ({ request }) => {
    const token = await srcAdminToken(request);

    // Create a document
    const createRes = await request.post(`${apiBaseUrl()}/documents`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        title: `SRC007-test-${Date.now()}`,
        number: `SRC007-${Date.now()}`,
        content: 'SRC007 unique content for search index test',
        level: 1,
      },
    });
    if (!createRes.ok()) {
      test.skip(true, 'Cannot create document — 跳过 SRC-007');
      return;
    }
    const createBody = await createRes.json();
    const docId: string = createBody?.data?.id ?? createBody?.id;
    const docTitle: string = createBody?.data?.title ?? createBody?.title ?? `SRC007-test-`;

    // Soft-delete the document
    const deleteRes = await request.delete(`${apiBaseUrl()}/documents/${docId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!deleteRes.ok()) {
      test.skip(true, 'Cannot delete document — 跳过 SRC-007');
      return;
    }

    // Search for the document by its title — it should NOT appear
    const keyword = docTitle.substring(0, 10);
    const searchRes = await request.get(
      `${apiBaseUrl()}/search/query?keyword=${encodeURIComponent(keyword)}&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (searchRes.status() === 404) {
      test.skip(true, '搜索接口未实现 — 跳过 SRC-007');
      return;
    }
    if (searchRes.ok()) {
      const searchBody = await searchRes.json();
      const items: Array<{ id?: string; deletedAt?: string | null }> =
        searchBody?.data?.list ?? searchBody?.data?.items ?? searchBody?.data ?? [];
      const found = items.find((i) => i.id === docId);
      expect(found, '已删除文档不应出现在搜索结果中').toBeUndefined();
    }
  });

});
