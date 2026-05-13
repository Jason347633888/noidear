import request from './request';

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionListParams {
  page?: number;
  limit?: number;
  resource?: string;
  action?: string;
}

export interface PermissionListResponse {
  list: Permission[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatePermissionPayload {
  resource: string;
  action: string;
  description?: string;
}

export interface UpdatePermissionPayload {
  description?: string;
}

export default {
  getPermissions(params: PermissionListParams = {}) {
    return request.get<PermissionListResponse>('/permissions', { params });
  },

  getPermissionById(id: string) {
    return request.get<Permission>(`/permissions/${id}`);
  },

  createPermission(payload: CreatePermissionPayload) {
    return request.post<Permission>('/permissions', payload);
  },

  updatePermission(id: string, payload: UpdatePermissionPayload) {
    return request.put<Permission>(`/permissions/${id}`, payload);
  },

  deletePermission(id: string) {
    return request.delete(`/permissions/${id}`);
  },

  // 用户权限授予/撤销（后端为 /user-permissions/* 正式 route）
  grantUserPermission(payload: unknown) {
    return request.post('/user-permissions/grant', payload);
  },

  getEffectiveUserPermissions(userId: string) {
    return request.get(`/user-permissions/${userId}/effective`);
  },

  batchGrantUserPermissions(payload: unknown) {
    return request.post('/user-permissions/batch-grant', payload);
  },

  revokeUserPermission(grantId: string) {
    return request.delete(`/user-permissions/${grantId}/revoke`);
  },
};
