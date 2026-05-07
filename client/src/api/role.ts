import request from './request';

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleListParams {
  page?: number;
  limit?: number;
  keyword?: string;
}

export interface RoleListResponse {
  list: Role[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateRolePayload {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
}

export const SYSTEM_ROLE_CODES = ['admin', 'leader', 'user'] as const;

export function sortSystemRolesFirst<T extends { code: string }>(roles: T[]): T[] {
  const order = new Map(SYSTEM_ROLE_CODES.map((code, index) => [code, index]));
  return [...roles].sort((a, b) => {
    const aOrder = order.has(a.code as (typeof SYSTEM_ROLE_CODES)[number])
      ? order.get(a.code as (typeof SYSTEM_ROLE_CODES)[number])!
      : 99;
    const bOrder = order.has(b.code as (typeof SYSTEM_ROLE_CODES)[number])
      ? order.get(b.code as (typeof SYSTEM_ROLE_CODES)[number])!
      : 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.code.localeCompare(b.code, 'zh-CN');
  });
}

export async function getSystemRoles() {
  const res = await request.get<RoleListResponse>('/roles', { params: { page: 1, limit: 100 } });
  const systemRoles = sortSystemRolesFirst(
    (res.list || []).filter((role) =>
      SYSTEM_ROLE_CODES.includes(role.code as (typeof SYSTEM_ROLE_CODES)[number]),
    ),
  );
  return {
    list: systemRoles,
    missing: SYSTEM_ROLE_CODES.filter((code) => !systemRoles.some((role) => role.code === code)),
  };
}

export default {
  getRoles(params: RoleListParams = {}) {
    return request.get<RoleListResponse>('/roles', { params });
  },

  getRoleById(id: string) {
    return request.get<Role>(`/roles/${id}`);
  },

  createRole(payload: CreateRolePayload) {
    return request.post<Role>('/roles', payload);
  },

  updateRole(id: string, payload: UpdateRolePayload) {
    return request.put<Role>(`/roles/${id}`, payload);
  },

  deleteRole(id: string) {
    return request.delete(`/roles/${id}`);
  },

  getRolePermissions(roleId: string) {
    return request.get<{ id: string; resource: string; action: string; description: string }[]>(
      `/roles/${roleId}/permissions`,
    );
  },

  assignPermissions(roleId: string, permissionIds: string[]) {
    return request.post(`/roles/${roleId}/permissions`, { permissionIds });
  },
};
