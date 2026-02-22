import { type APIRequestContext } from '@playwright/test';

/**
 * Training API helpers for E2E test data setup and teardown.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
}

/**
 * Create a training plan via the API.
 */
export async function createTrainingPlanViaApi(
  request: APIRequestContext,
  token: string,
  payload: {
    year: number;
    title: string;
    departmentId: string;
    budget: number;
    status?: string;
  },
) {
  const response = await request.post(`${API_BASE}/training/plans`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Create training plan API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Create a training project via the API.
 */
export async function createTrainingProjectViaApi(
  request: APIRequestContext,
  token: string,
  payload: {
    planId: string;
    title: string;
    type: string;
    startDate: string;
    endDate: string;
    requiredTrainees: string[];
    trainer?: string;
    description?: string;
  },
) {
  const response = await request.post(`${API_BASE}/training/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Create training project API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Add questions to a training project via the API.
 */
export async function createQuestionViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
  payload: {
    type: 'choice' | 'truefalse' | 'essay';
    content: string;
    options?: string[];
    correctAnswer: string;
    points: number;
  },
) {
  const response = await request.post(`${API_BASE}/training/projects/${projectId}/questions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Create question API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Publish a training project via the API.
 */
export async function publishProjectViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
) {
  const response = await request.patch(`${API_BASE}/training/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: 'published' },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Publish project API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Start an exam via the API.
 */
export async function startExamViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
) {
  const response = await request.post(`${API_BASE}/exam/${projectId}/start`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Start exam API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<{ recordId: string }>;
  return body.data;
}

/**
 * Submit exam answers via the API.
 */
export async function submitExamViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
  payload: {
    recordId: string;
    answers: Record<string, string>;
  },
) {
  const response = await request.post(`${API_BASE}/exam/${projectId}/submit`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Submit exam API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<{ score: number; passed: boolean }>;
  return body.data;
}

/**
 * Fetch todo tasks for the authenticated user.
 */
export async function fetchTodoTasksViaApi(
  request: APIRequestContext,
  token: string,
  params: Record<string, string> = {},
) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${API_BASE}/todo?${qs}` : `${API_BASE}/todo`;

  const response = await request.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch todo tasks API failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{
    list: Array<Record<string, unknown>>;
    total: number;
  }>;
  return body.data;
}

/**
 * Complete a todo task via the API.
 */
export async function completeTodoViaApi(
  request: APIRequestContext,
  token: string,
  todoId: string,
) {
  const response = await request.post(`${API_BASE}/todo/${todoId}/complete`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Complete todo API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Delete a training project (for cleanup).
 */
export async function deleteProjectViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
) {
  const response = await request.delete(`${API_BASE}/training/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Delete project API failed: ${response.status()} ${errorBody}`);
  }

  return true;
}

/**
 * Delete a training plan (for cleanup).
 */
export async function deletePlanViaApi(
  request: APIRequestContext,
  token: string,
  planId: string,
) {
  const response = await request.delete(`${API_BASE}/training/plans/${planId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Delete plan API failed: ${response.status()} ${errorBody}`);
  }

  return true;
}
