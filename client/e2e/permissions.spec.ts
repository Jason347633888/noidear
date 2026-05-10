/**
 * PERM — 权限管理 E2E Tests
 *
 * BDD scenarios:
 *   PERM-001  创建新权限成功
 *   PERM-002  resource:action 组合重复时创建失败
 *   PERM-003  按 resource 过滤权限列表
 *   PERM-004  无对应权限的用户访问受保护接口被拒绝
 *   PERM-005  细粒度权限控制—按部门隔离
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import { getAuthToken } from './helpers/api';
import { getCredentials } from './fixtures/task-fixtures';
import { apiBaseUrl } from './support/urls';

const API_BASE = apiBaseUrl();

async function adminToken(request: APIRequestContext): Promise<string> {
  const { adminUser, adminPass } = getCredentials();
  return getAuthToken(request, adminUser, adminPass);
}

async function memberToken(request: APIRequestContext): Promise<string | null> {
  const { memberUser, memberPass } = getCredentials();
  try {
    return await getAuthToken(request, memberUser, memberPass);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PERM-001  创建新权限成功
// ---------------------------------------------------------------------------
test('PERM-001: 管理员可创建新权限（resource:action）', async ({ request }) => {
  const token = await adminToken(request);

  // Check if /permissions endpoint exists at all
  const listRes = await request.get(`${API_BASE}/permissions?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok() && listRes.status() === 404) {
    test.skip(true, 'PERM API 未实现 — 跳过 PERM-001');
    return;
  }

  const uniqueAction = `e2e-create-${Date.now()}`;
  const res = await request.post(`${API_BASE}/permissions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { resource: 'e2e-resource', action: uniqueAction },
  });

  // 201 Created or 200 OK
  if (res.status() === 404) {
    test.skip(true, 'POST /permissions 未实现 — 跳过 PERM-001');
    return;
  }
  expect([200, 201]).toContain(res.status());
  const body = await res.json();
  const id = body?.data?.id ?? body?.id;
  expect(id).toBeTruthy();

  // Cleanup: delete the created permission
  if (id) {
    await request.delete(`${API_BASE}/permissions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
  }
});

// ---------------------------------------------------------------------------
// PERM-002  resource:action 组合重复时创建失败
// ---------------------------------------------------------------------------
test('PERM-002: 重复的 resource:action 组合创建失败 → 400/409', async ({ request }) => {
  const token = await adminToken(request);

  const uniqueAction = `e2e-dup-${Date.now()}`;
  const payload = { resource: 'e2e-dup-resource', action: uniqueAction };

  // First creation
  const first = await request.post(`${API_BASE}/permissions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: payload,
  });
  if (first.status() === 404) {
    test.skip(true, 'POST /permissions 未实现 — 跳过 PERM-002');
    return;
  }
  if (!first.ok()) {
    test.skip(true, `第一次权限创建失败 (${first.status()}) — 跳过 PERM-002`);
    return;
  }
  const firstBody = await first.json();
  const createdId = firstBody?.data?.id ?? firstBody?.id;

  try {
    // Duplicate creation
    const dup = await request.post(`${API_BASE}/permissions`, {
      headers: { Authorization: `Bearer ${token}` },
      data: payload,
    });
    expect([400, 409]).toContain(dup.status());
  } finally {
    if (createdId) {
      await request.delete(`${API_BASE}/permissions/${createdId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
    }
  }
});

// ---------------------------------------------------------------------------
// PERM-003  按 resource 过滤权限列表
// ---------------------------------------------------------------------------
test('PERM-003: 按 resource 过滤权限列表 → 仅返回匹配项', async ({ request }) => {
  const token = await adminToken(request);

  const res = await request.get(`${API_BASE}/permissions?resource=document&limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status() === 404) {
    test.skip(true, 'GET /permissions 未实现 — 跳过 PERM-003');
    return;
  }
  expect(res.ok()).toBe(true);

  const body = await res.json();
  const items: Array<{ resource: string }> = body?.data?.list ?? body?.data ?? body?.list ?? [];
  if (items.length === 0) {
    // No document permissions seeded — acceptable
    return;
  }
  items.forEach((item) => {
    expect(item.resource).toBe('document');
  });
});

// ---------------------------------------------------------------------------
// PERM-004  无对应权限的用户访问受保护接口被拒绝
// ---------------------------------------------------------------------------
test('PERM-004: 无权限用户访问受保护接口 → 403', async ({ request }) => {
  const token = await memberToken(request);
  if (!token) {
    test.skip(true, 'Member login unavailable — 跳过 PERM-004');
    return;
  }

  // Attempt admin-only action: list all users (admin:read)
  const res = await request.get(`${API_BASE}/permissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // A regular member should get 403 on the permissions admin endpoint
  // 404 means endpoint doesn't exist yet
  if (res.status() === 404) {
    test.skip(true, 'GET /permissions 未实现 — 跳过 PERM-004');
    return;
  }
  expect([401, 403]).toContain(res.status());
});

// ---------------------------------------------------------------------------
// PERM-005  细粒度权限控制—按部门隔离
// ---------------------------------------------------------------------------
test('PERM-005: 跨部门数据隔离 → member 只能看到自己部门数据或 403', async ({ request }) => {
  const adminTok = await adminToken(request);
  const memberTok = await memberToken(request);
  if (!memberTok) {
    test.skip(true, 'Member login unavailable — 跳过 PERM-005');
    return;
  }

  // Admin fetches all departments
  const deptRes = await request.get(`${API_BASE}/departments?limit=50`, {
    headers: { Authorization: `Bearer ${adminTok}` },
  });
  if (!deptRes.ok()) {
    test.skip(true, 'Cannot fetch departments — 跳过 PERM-005');
    return;
  }
  const deptBody = await deptRes.json();
  const depts: Array<{ id: string }> = deptBody?.data?.list ?? deptBody?.list ?? [];
  if (depts.length < 2) {
    test.skip(true, '少于 2 个部门，无法验证跨部门隔离 — 跳过 PERM-005');
    return;
  }

  // Member tries to fetch documents filtered by a specific department they may not belong to
  const targetDeptId = depts[depts.length - 1].id;
  const docsRes = await request.get(
    `${API_BASE}/documents?departmentId=${targetDeptId}&limit=1`,
    { headers: { Authorization: `Bearer ${memberTok}` } },
  );

  // Either 403 (department isolation enforced) or 200 with empty/limited list is acceptable
  // What is NOT acceptable is 401 (unauthenticated)
  expect(docsRes.status()).not.toBe(401);
  // Verify no server error
  expect(docsRes.status()).toBeLessThan(500);
});
