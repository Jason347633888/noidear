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

interface BootstrapStatus {
  completed: boolean;
  step: string;
  reasons: string[];
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

async function getBootstrapStatus(
  request: APIRequestContext,
  token: string,
): Promise<BootstrapStatus> {
  const resp = await request.get(`${API_BASE}/org-bootstrap/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(resp.ok(), `GET /org-bootstrap/status failed: ${resp.status()}`).toBe(true);
  return unwrapData<BootstrapStatus>(await resp.json());
}

async function listDepartments(
  request: APIRequestContext,
  token: string,
): Promise<DepartmentRef[]> {
  const resp = await request.get(`${API_BASE}/departments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(resp.ok(), `GET /departments failed: ${resp.status()}`).toBe(true);
  const body = await resp.json();
  const data = unwrapData<{ list?: DepartmentRef[] } | DepartmentRef[]>(body);
  return Array.isArray(data) ? data : (data.list ?? []);
}

async function createDepartment(
  request: APIRequestContext,
  token: string,
): Promise<DepartmentRef> {
  const suffix = uniqueId('dept');
  const resp = await request.post(`${API_BASE}/departments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      code: `E2E_${suffix}`.toUpperCase(),
      name: `E2E Bootstrap Dept ${suffix}`,
    },
  });
  expect([200, 201], `Create department failed: ${resp.status()}`).toContain(resp.status());
  return unwrapData<DepartmentRef>(await resp.json());
}

async function createUser(
  request: APIRequestContext,
  token: string,
  roleId: string,
  options: { usernamePrefix: string; namePrefix: string; departmentId?: string },
): Promise<{ id: string; username: string }> {
  const suffix = uniqueId(options.usernamePrefix);
  const username = `${options.usernamePrefix}_${suffix}`;
  const resp = await request.post(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      username,
      password: 'TestPass123!',
      name: `${options.namePrefix} ${suffix}`,
      roleId,
      departmentId: options.departmentId,
    },
  });
  expect([200, 201], `Create user failed: ${resp.status()}`).toContain(resp.status());
  const user = unwrapData<{ id: string }>(await resp.json());
  return { id: user.id, username };
}

async function assignDepartmentManager(
  request: APIRequestContext,
  token: string,
  departmentId: string,
  managerId: string,
) {
  const resp = await request.put(`${API_BASE}/departments/${departmentId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { managerId },
  });
  expect([200, 201], `Assign department manager failed: ${resp.status()}`).toContain(resp.status());
}

export async function ensureOrgBootstrapCompleted(
  request: APIRequestContext,
): Promise<{
  token: string;
  roleIds: Record<SystemRoleCode, string>;
  status: BootstrapStatus;
}> {
  const { token } = await adminLogin(request);
  const roleIds = await getSystemRoleIds(request, token);

  let status = await getBootstrapStatus(request, token);
  if (status.completed) {
    return { token, roleIds, status };
  }

  if (status.step === 'departments' || status.reasons.includes('missing_department')) {
    await createDepartment(request, token);
    status = await getBootstrapStatus(request, token);
  }

  const departments = await listDepartments(request, token);
  let workingDepartment = departments[0];
  if (!workingDepartment) {
    workingDepartment = await createDepartment(request, token);
  }

  if (status.step === 'department_manager' || status.reasons.includes('missing_department_manager')) {
    const leader = await createUser(request, token, roleIds.leader, {
      usernamePrefix: 'e2e_boot_leader',
      namePrefix: 'E2E Bootstrap Leader',
      departmentId: workingDepartment.id,
    });
    await assignDepartmentManager(request, token, workingDepartment.id, leader.id);
    status = await getBootstrapStatus(request, token);
  }

  if (status.step === 'department_members' || status.reasons.includes('missing_business_member')) {
    await createUser(request, token, roleIds.user, {
      usernamePrefix: 'e2e_boot_member',
      namePrefix: 'E2E Bootstrap Member',
      departmentId: workingDepartment.id,
    });
    status = await getBootstrapStatus(request, token);
  }

  expect(status.completed, `Bootstrap not completed: ${status.step} ${status.reasons.join(',')}`).toBe(true);
  return { token, roleIds, status };
}
