import { expect, type APIRequestContext } from '@playwright/test';
import { apiBaseUrl } from './urls';

const API_BASE = apiBaseUrl();
const ADMIN_USER = process.env.E2E_ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? 'ChangeMe123!';

export type SystemRoleCode = 'admin' | 'leader' | 'user';

interface RoleRef {
  id: string;
  code: string;
}

interface DepartmentRef {
  id: string;
  code: string;
  name: string;
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function unwrapData<T>(body: any): T {
  return (body?.data?.data ?? body?.data ?? body) as T;
}

export async function adminLogin(request: APIRequestContext): Promise<{ token: string; user: Record<string, unknown> }> {
  const resp = await request.post(`${API_BASE}/auth/login`, {
    data: { username: ADMIN_USER, password: ADMIN_PASS },
  });
  expect(resp.ok(), `Admin login failed: ${resp.status()}`).toBe(true);
  const body = await resp.json();
  return { token: body.data.token, user: body.data.user };
}

export async function getSystemRoleIds(
  request: APIRequestContext,
  token: string,
): Promise<Record<SystemRoleCode, string>> {
  const resp = await request.get(`${API_BASE}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(resp.ok(), `GET /roles failed: ${resp.status()}`).toBe(true);
  const body = await resp.json();
  const data = unwrapData<{ list?: RoleRef[] } | RoleRef[]>(body);
  const roles = Array.isArray(data) ? data : (data.list ?? []);
  const adminRole = roles.find((role) => role.code === 'admin');
  const leaderRole = roles.find((role) => role.code === 'leader');
  const userRole = roles.find((role) => role.code === 'user');
  expect(adminRole?.id, 'Missing admin role').toBeTruthy();
  expect(leaderRole?.id, 'Missing leader role').toBeTruthy();
  expect(userRole?.id, 'Missing user role').toBeTruthy();
  return {
    admin: adminRole!.id,
    leader: leaderRole!.id,
    user: userRole!.id,
  };
}

async function createDepartmentWithLeader(
  request: APIRequestContext,
  token: string,
  leaderRoleId: string,
): Promise<{ deptId: string; leaderId: string }> {
  const suffix = uniqueId('dept');
  const leaderSuffix = uniqueId('ldr');

  const leaderResp = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      username: `e2e_ldr_${leaderSuffix}`,
      password: 'TestPass123!',
      name: `E2E Leader ${leaderSuffix}`,
      roleId: leaderRoleId,
    },
  });
  expect([200, 201], `Create leader failed: ${leaderResp.status()}`).toContain(leaderResp.status());
  const leader = unwrapData<{ id: string }>(await leaderResp.json());

  const deptResp = await request.post(`${API_BASE}/departments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      code: `E2E_${suffix}`.toUpperCase(),
      name: `E2E Fixture Dept ${suffix}`,
      managerId: leader.id,
    },
  });
  expect([200, 201], `Create department failed: ${deptResp.status()}`).toContain(deptResp.status());
  const dept = unwrapData<DepartmentRef>(await deptResp.json());

  return { deptId: dept.id, leaderId: leader.id };
}

/**
 * Users fixture: provides admin token, role IDs, one active department with
 * a valid leader candidate so users.spec.ts assertions can run.
 */
export async function ensureSystemManagementUsersFixture(
  request: APIRequestContext,
): Promise<{
  token: string;
  roleIds: Record<SystemRoleCode, string>;
  deptId: string;
}> {
  const { token } = await adminLogin(request);
  const roleIds = await getSystemRoleIds(request, token);
  const { deptId } = await createDepartmentWithLeader(request, token, roleIds.leader);
  return { token, roleIds, deptId };
}

/**
 * Departments fixture: provides admin token, role IDs, and an active leader
 * candidate so departments.spec.ts can assert leader selection and department
 * creation flows.
 */
export async function ensureSystemManagementDepartmentsFixture(
  request: APIRequestContext,
): Promise<{
  token: string;
  roleIds: Record<SystemRoleCode, string>;
  leaderId: string;
}> {
  const { token } = await adminLogin(request);
  const roleIds = await getSystemRoleIds(request, token);
  const suffix = uniqueId('ldr');
  const leaderResp = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      username: `e2e_dept_ldr_${suffix}`,
      password: 'TestPass123!',
      name: `E2E Dept Leader ${suffix}`,
      roleId: roleIds.leader,
    },
  });
  expect([200, 201], `Create leader candidate failed: ${leaderResp.status()}`).toContain(leaderResp.status());
  const leader = unwrapData<{ id: string }>(await leaderResp.json());
  return { token, roleIds, leaderId: leader.id };
}

/**
 * Roles fixture: provides admin token only. Role and permission assertions
 * do not need departments or business users.
 */
export async function ensureSystemManagementRolesFixture(
  request: APIRequestContext,
): Promise<{
  token: string;
  roleIds: Record<SystemRoleCode, string>;
}> {
  const { token } = await adminLogin(request);
  const roleIds = await getSystemRoleIds(request, token);
  return { token, roleIds };
}

/**
 * Linkage fixture: provides admin token, leader role ID, and an unassigned
 * leader user so linkage.spec.ts can assert user→department assignment flows.
 */
export async function ensureSystemManagementLinkageFixture(
  request: APIRequestContext,
): Promise<{
  token: string;
  roleIds: Record<SystemRoleCode, string>;
}> {
  const { token } = await adminLogin(request);
  const roleIds = await getSystemRoleIds(request, token);
  return { token, roleIds };
}
