import { type APIRequestContext } from '@playwright/test';

/**
 * API helper for E2E test data setup and teardown.
 *
 * Provides direct backend API calls for creating/cleaning test data
 * without going through the UI.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

/**
 * Obtain a JWT token for the given user credentials.
 */
export async function getAuthToken(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  });

  if (!response.ok()) {
    throw new Error(`Auth failed for "${username}" with status ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{ token: string }>;
  return body.data.token;
}

/**
 * Create a task via the API. Returns the created task object.
 */
export async function createTaskViaApi(
  request: APIRequestContext,
  token: string,
  payload: { templateId: string; departmentId: string; deadline: string },
) {
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
 * Fetch available templates.
 */
export async function fetchTemplates(
  request: APIRequestContext,
  token: string,
) {
  const response = await request.get(`${API_BASE}/templates?status=active&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch templates API failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{
    list: Array<{ id: string; title: string; number: string; fieldsJson: unknown[] }>;
  }>;
  return body.data.list;
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
