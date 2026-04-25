import { type APIRequestContext, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { TaskCreatePage } from '../pages/TaskCreatePage';

/**
 * API helper for E2E test data setup and teardown.
 *
 * Provides direct backend API calls for creating/cleaning test data
 * without going through the UI.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

// Token cache to avoid 429 rate limiting
const tokenCache: Map<string, string> = new Map();

interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

/**
 * Load cached token from global-setup if available.
 */
function loadCachedToken(username: string): string | null {
  // Check in-memory cache first
  if (tokenCache.has(username)) {
    return tokenCache.get(username)!;
  }
  
  // Check file cache from global-setup
  const tokenFile = path.join(process.cwd(), 'e2e', '.auth', 'admin-token.json');
  if (fs.existsSync(tokenFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
      if (data.user?.username === username && data.token) {
        tokenCache.set(username, data.token);
        return data.token;
      }
    } catch {
      // ignore parse errors
    }
  }
  
  return null;
}

/**
 * Obtain a JWT token for the given user credentials.
 * Uses caching to avoid 429 rate limiting.
 */
export async function getAuthToken(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  // Try cache first
  const cached = loadCachedToken(username);
  if (cached) {
    return cached;
  }

  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  });

  if (!response.ok()) {
    throw new Error(`Auth failed for "${username}" with status ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{ token: string }>;
  const token = body.data.token;
  
  // Cache the token
  tokenCache.set(username, token);
  
  return token;
}

/**
 * Create a task via the POST /tasks API.
 * Returns the created task object with `id`.
 */
export async function createTaskViaApi(
  request: APIRequestContext,
  token: string,
  payload: { templateId: string; departmentId: string; deadline: string },
  page?: Page,
) {
  // If page is provided, use UI to create task (more reliable for E2E scenarios)
  if (page) {
    return createTaskViaUi(page, {
      templateId: payload.templateId,
      departmentId: payload.departmentId,
    });
  }

  const response = await request.post(`${API_BASE}/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Create task API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Create a task via the UI. Used when API endpoint is unavailable.
 * Returns an object with `id` of the created assignment.
 */
export async function createTaskViaUi(
  page: Page,
  options: { templateId?: string; departmentId?: string } = {},
): Promise<Record<string, unknown>> {
  const createPage = new TaskCreatePage(page);
  await createPage.goto();

  if (options.templateId) {
    await createPage.selectTemplateByText(options.templateId);
  } else {
    await createPage.selectFirstTemplate();
  }

  if (options.departmentId) {
    await createPage.selectDepartmentByText(options.departmentId);
  } else {
    await createPage.selectFirstDepartment();
  }

  await createPage.setDeadlineToFuture();
  await createPage.submitAndWaitForRedirect();
  await createPage.expectCreateSuccess();

  // Extract the task ID from the current URL or page state
  // After redirect to /tasks, we need to find the newly created task
  // Wait for the list to load and grab the first row (most recent)
  await page.waitForSelector('.el-table__row', { timeout: 15000 });
  const firstRow = page.locator('.el-table__row').first();
  await firstRow.waitFor({ state: 'visible', timeout: 10000 });

  // Try to get the task ID from a data attribute or link
  const link = firstRow.locator('a[href*="/tasks/"]').first();
  const href = await link.getAttribute('href');
  const id = href?.split('/tasks/').pop() || '';

  return { id };
}

/**
 * Fetch task list. Returns an object with list and total.
 */
export async function fetchTasks(
  request: APIRequestContext,
  token: string,
  params: Record<string, string> = {},
) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${API_BASE}/tasks?${qs}` : `${API_BASE}/tasks`;

  const response = await request.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch tasks API failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{
    list: Array<Record<string, unknown>>;
    total: number;
  }>;
  return body.data;
}

/**
 * Fetch task detail by ID.
 */
export async function fetchTaskDetail(
  request: APIRequestContext,
  token: string,
  taskId: string,
) {
  const response = await request.get(`${API_BASE}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch task detail API failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Submit a task via the API.
 */
export async function submitTaskViaApi(
  request: APIRequestContext,
  token: string,
  taskId: string,
  data: Record<string, unknown> = {},
) {
  const response = await request.post(`${API_BASE}/tasks/${taskId}/submit`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { data },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Submit task API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Cancel a task via the API.
 */
export async function cancelTaskViaApi(
  request: APIRequestContext,
  token: string,
  taskId: string,
) {
  const response = await request.post(`${API_BASE}/tasks/${taskId}/cancel`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Cancel task API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Approve a task record via the API.
 */
export async function approveRecordViaApi(
  request: APIRequestContext,
  token: string,
  recordId: string,
  status: 'approved' | 'rejected' = 'approved',
  comment?: string,
) {
  const response = await request.post(`${API_BASE}/tasks/approve`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { recordId, status, comment },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Approve record API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Fetch available templates from the record-templates endpoint.
 * RecordTemplate uses `name` (not `title`) and `code` (not `number`).
 */
export async function fetchTemplates(
  request: APIRequestContext,
  token: string,
) {
  const response = await request.get(`${API_BASE}/record-templates?status=active&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch templates API failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{
    list?: Array<{ id: string; name: string; code: string; fieldsJson: unknown[] }>;
    data?: Array<{ id: string; name: string; code: string; fieldsJson: unknown[] }>;
  }>;
  // Some endpoints return { data: [...] } or { list: [...] }
  const items = body.data?.list ?? body.data?.data ?? (Array.isArray(body.data) ? body.data : []);
  return items as Array<{ id: string; name: string; code: string; fieldsJson: unknown[] }>;
}

/**
 * Fetch a user's departmentId by their username (admin token required).
 */
export async function fetchUserDepartmentId(
  request: APIRequestContext,
  adminToken: string,
  username: string,
): Promise<string | null> {
  const response = await request.get(`${API_BASE}/users?keyword=${encodeURIComponent(username)}&limit=10`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch users failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{ list: Array<{ username: string; departmentId: string | null }> }>;
  const user = body.data.list.find((u) => u.username === username);
  return user?.departmentId ?? null;
}

/**
 * Fetch available departments.
 */
export async function fetchDepartments(
  request: APIRequestContext,
  token: string,
) {
  const response = await request.get(`${API_BASE}/departments?status=active&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch departments API failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{
    list: Array<{ id: string; name: string; code: string }>;
  }>;
  return body.data.list;
}

/**
 * Fetch pending approvals for the authenticated user.
 */
export async function fetchPendingApprovals(
  request: APIRequestContext,
  token: string,
) {
  const response = await request.get(`${API_BASE}/approvals/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch pending approvals failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<Array<Record<string, unknown>>>;
  return body.data;
}

/**
 * Approve an approval record via the unified API.
 */
export async function approveApprovalViaApi(
  request: APIRequestContext,
  token: string,
  approvalId: string,
  action: 'approved' | 'rejected' = 'approved',
  commentOrReason?: string,
) {
  const data: Record<string, string> = { approvalId, action };
  if (action === 'approved' && commentOrReason) {
    data.comment = commentOrReason;
  }
  if (action === 'rejected' && commentOrReason) {
    data.rejectionReason = commentOrReason;
  }

  const response = await request.post(`${API_BASE}/approvals/${approvalId}/approve`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Approve approval failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Reject an approval record via the reject endpoint.
 */
export async function rejectApprovalViaApi(
  request: APIRequestContext,
  token: string,
  approvalId: string,
  reason: string,
) {
  const response = await request.post(`${API_BASE}/approvals/${approvalId}/reject`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { approvalId, action: 'rejected', rejectionReason: reason },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Reject approval failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Save draft data for a task.
 */
export async function saveDraftViaApi(
  request: APIRequestContext,
  token: string,
  taskId: string,
  data: Record<string, unknown>,
) {
  const response = await request.post(`${API_BASE}/tasks/${taskId}/draft`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { data },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Save draft API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}
