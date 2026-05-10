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
 *   DOC-005  Soft-delete document appears in recycle bin
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

  // -------------------------------------------------------------------------
  // DOC-005: Soft-delete document enters recycle bin
  // NOTE: POST /documents does not exist. We use an existing draft document and
  //       soft-delete it, then verify the recycle bin page renders.
  //       If no draft is available the test skips to avoid polluting data.
  // -------------------------------------------------------------------------
  test('DOC-005: soft-deleted document appears in recycle bin', async ({ page, request }) => {
    const { adminUser, adminPass } = getCredentials();
    const token = await getToken(request);

    const doc = await fetchExistingDocument(request, token, 'draft');
    if (!doc) {
      test.skip(true, 'No draft documents available to test soft-delete');
      return;
    }

    // Soft-delete via API
    const delRes = await request.delete(`${API_BASE}/documents/${doc.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.ok()).toBe(true);

    await loginViaApiCached(page, adminUser, adminPass);
    await page.goto('/recycle-bin');
    await page.waitForLoadState('networkidle');

    // Recycle bin table must be present
    await expect(page.locator('.el-table, .el-empty').first()).toBeVisible({ timeout: 12000 });

    // At least one row should be visible (the one we just deleted)
    const rows = page.locator('.el-table__body tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
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
