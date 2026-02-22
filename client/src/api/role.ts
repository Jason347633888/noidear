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
