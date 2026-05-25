import { type APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { apiBaseUrl } from '../support/urls';

/**
 * API helper for E2E test data setup and teardown.
 *
 * Provides direct backend API calls for creating/cleaning test data
 * without going through the UI.
 */

const API_BASE = apiBaseUrl();

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
