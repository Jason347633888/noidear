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
 * Fetch current authenticated user info.
 */
export async function fetchCurrentUserViaApi(
  request: APIRequestContext,
  token: string,
): Promise<{ id: string; username: string; name?: string }> {
  const response = await request.get(`${API_BASE}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch current user API failed: ${response.status()}`);
  }

  const body = await response.json();
  // /auth/profile returns req.user directly (not wrapped in ApiResponse)
  return body.data ?? body;
}

/**
 * Create a training plan via the API. Idempotent: if a plan for that year
 * already exists (409), fetches and returns the existing one.
 */
export async function createTrainingPlanViaApi(
  request: APIRequestContext,
  token: string,
  payload: {
    year: number;
    title: string;
  },
) {
  const response = await request.post(`${API_BASE}/training/plans`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });

  if (response.status() === 409) {
    // Plan for this year already exists — find and return it
    const listResp = await request.get(
      `${API_BASE}/training/plans?year=${payload.year}&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (listResp.ok()) {
      const listBody = (await listResp.json()) as ApiResponse<{
        list?: Array<Record<string, unknown>>;
        items?: Array<Record<string, unknown>>;
      }>;
      const items = listBody.data.list ?? listBody.data.items ?? [];
      const existing = items[0];
      if (existing) return existing;
    }
    throw new Error(`Create training plan 409 but could not fetch existing plan for year ${payload.year}`);
  }

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
    department: string;
    quarter: number;
    trainerId: string;
    trainees: string[];
    description?: string;
    scheduledDate?: string;
    documentIds?: string[];
    passingScore?: number;
    maxAttempts?: number;
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
    type: 'choice' | 'judge';
    content: string;
    options?: Record<string, string>;
    correctAnswer: string;
    points: number;
  },
) {
  const response = await request.post(`${API_BASE}/training/questions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...payload, projectId },
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
  const response = await request.put(`${API_BASE}/training/projects/${projectId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: 'ongoing' },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Publish project API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Approve a training plan directly (admin convenience endpoint for test setup).
 */
export async function approvePlanViaApi(
  request: APIRequestContext,
  token: string,
  planId: string,
) {
  const response = await request.post(`${API_BASE}/training/plans/${planId}/approve`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Approve plan API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<Record<string, unknown>>;
  return body.data;
}

/**
 * Cancel a training project (works for planned/ongoing projects).
 */
export async function cancelProjectViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
) {
  const response = await request.put(`${API_BASE}/training/projects/${projectId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: 'cancelled' },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Cancel project API failed: ${response.status()} ${errorBody}`);
  }

  return true;
}

/**
 * Start an exam via the API.
 */
export async function startExamViaApi(
  request: APIRequestContext,
  token: string,
  projectId: string,
) {
  const response = await request.post(`${API_BASE}/training/exam/start`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { projectId },
  });

  if (!response.ok()) {
    const errorBody = await response.text();
    throw new Error(`Start exam API failed: ${response.status()} ${errorBody}`);
  }

  const body = (await response.json()) as ApiResponse<{
    project: { id: string; title: string; passingScore: number; maxAttempts: number };
    learningRecord: { attempts: number; remainingAttempts: number };
    questions: Array<{ id: string; type: string; content: string; options: unknown; points: number; order: number }>;
  }>;
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
    answers: Record<string, string>;
  },
) {
  const response = await request.post(`${API_BASE}/training/exam/submit`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { projectId, answers: payload.answers },
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
  const url = qs ? `${API_BASE}/todos?${qs}` : `${API_BASE}/todos`;

  const response = await request.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch todo tasks API failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{
    items: Array<Record<string, unknown>>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>;
  return body.data;
}

/**
 * Fetch todo statistics for the authenticated user.
 */
export async function fetchTodoStatisticsViaApi(
  request: APIRequestContext,
  token: string,
) {
  const response = await request.get(`${API_BASE}/todos/statistics`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch todo statistics API failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{
    total: number;
    byType: Record<string, number>;
    byStatus: { pending: number; completed: number };
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
  const response = await request.post(`${API_BASE}/todos/${todoId}/complete`, {
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
 * Fetch users list for getting valid user IDs.
 */
export async function fetchUsersViaApi(
  request: APIRequestContext,
  token: string,
  limit: number = 10,
) {
  const response = await request.get(`${API_BASE}/users?page=1&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`Fetch users API failed: ${response.status()}`);
  }

  const body = (await response.json()) as ApiResponse<{
    list: Array<{ id: string; username: string; name?: string }>;
  }>;
  return body.data.list;
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
